"""
cybeRECON — SSL / TLS Inspector
Usage: python tools/ssl_tool.py <domain>

Inspects the SSL/TLS certificate and connection details for a given domain.
No third-party SSL libraries required — uses Python's built-in ssl module.
"""

import ssl
import socket
import datetime
import hashlib
import textwrap
from typing import Any, Dict, List, Optional, Tuple


# ── Helpers ────────────────────────────────────────────────────────────────

def _get_cert_and_context(domain: str, port: int = 443, timeout: int = 10) -> Tuple[Optional[Dict[str, Any]], Optional[bytes], Optional[Tuple[str, str, int]], Optional[str]]:
    """Open a TLS connection and return (cert_dict, peercert_der, cipher_info, tls_version)."""
    ctx = ssl.create_default_context()
    with socket.create_connection((domain, port), timeout=timeout) as sock:
        with ctx.wrap_socket(sock, server_hostname=domain) as ssock:
            cert_dict  = ssock.getpeercert()            # parsed dict
            cert_der   = ssock.getpeercert(binary_form=True)  # raw DER bytes
            cipher     = ssock.cipher()                 # (name, protocol, bits)
            tls_ver    = ssock.version()                # e.g. "TLSv1.3"
    return cert_dict, cert_der, cipher, tls_ver


def _parse_date(date_str: str) -> datetime.datetime:
    """Parse ASN.1 GeneralizedTime / RFC 2459 date strings returned by ssl."""
    for fmt in ("%b %d %H:%M:%S %Y %Z", "%Y%m%d%H%M%SZ"):
        try:
            return datetime.datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    raise ValueError(f"Unknown date format: {date_str!r}")


def _flatten_rdns(rdns: Any) -> Dict[str, str]:
    """Convert ((('commonName', 'example.com'),),) → {'commonName': 'example.com'}"""
    result = {}
    for rdn_set in rdns:
        for key, value in rdn_set:
            result[key] = value
    return result


def _san_list(cert_dict: Dict[str, Any]) -> List[str]:
    """Extract Subject Alternative Names as plain strings."""
    sans = []
    for family, value in cert_dict.get("subjectAltName", []):
        sans.append(f"{family}:{value}")
    return sans


def _grade_ssl(tls_version: Optional[str], cipher_bits: Optional[int], days_left: int, is_ev: bool) -> str:
    """Assign a coarse security grade A+/A/B/C/F."""
    if days_left <= 0:
        return "F"
    if tls_version not in ("TLSv1.3", "TLSv1.2"):
        return "C"
    if cipher_bits and cipher_bits < 128:
        return "C"
    if tls_version == "TLSv1.3" and cipher_bits and cipher_bits >= 256 and is_ev:
        return "A+"
    if tls_version == "TLSv1.3":
        return "A"
    # TLSv1.2 only
    return "B"


# ── Main public function ───────────────────────────────────────────────────

def check_ssl(domain: str, port: int = 443) -> Dict[str, Any]:
    """
    Inspect SSL/TLS certificate and connection for *domain*.
    Returns a flat dict suitable for JSON serialisation.
    """
    result: Dict[str, Any] = {"domain": domain, "port": port}

    try:
        cert_dict, cert_der, cipher_info, tls_version = _get_cert_and_context(domain, port)

        if not cert_dict:
            cert_dict = {}
        cert_der_bytes: bytes = cert_der if cert_der is not None else b""

        # ── Certificate fingerprints ─────────────────────────────────────
        sha1   = hashlib.sha1(cert_der_bytes).hexdigest().upper()
        sha256 = hashlib.sha256(cert_der_bytes).hexdigest().upper()
        result["fingerprint_sha1"]   = ":".join(textwrap.wrap(sha1,   2))
        result["fingerprint_sha256"] = ":".join(textwrap.wrap(sha256, 2))

        # ── Subject / Issuer ─────────────────────────────────────────────
        subject = _flatten_rdns(cert_dict.get("subject", []))
        issuer  = _flatten_rdns(cert_dict.get("issuer",  []))
        result["common_name"]         = subject.get("commonName", domain)
        result["organization"]        = subject.get("organizationName")
        result["issuer_common_name"]  = issuer.get("commonName")
        result["issuer_organization"] = issuer.get("organizationName")
        result["issuer_country"]      = issuer.get("countryName")

        # EV certificate heuristic (org in subject)
        is_ev = bool(subject.get("organizationName"))
        result["is_ev_certificate"] = is_ev

        # ── Validity dates ───────────────────────────────────────────────
        not_before_str = cert_dict.get("notBefore", "")
        not_after_str  = cert_dict.get("notAfter",  "")
        try:
            not_before = _parse_date(not_before_str)
            not_after  = _parse_date(not_after_str)
            now        = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
            days_left  = (not_after - now).days
            total_days = (not_after - not_before).days

            result["not_before"]        = not_before.strftime("%Y-%m-%d %H:%M:%S UTC")
            result["not_after"]         = not_after.strftime("%Y-%m-%d %H:%M:%S UTC")
            result["days_until_expiry"] = days_left
            result["cert_lifetime_days"] = total_days
            result["is_expired"]        = days_left <= 0
            result["expires_soon"]      = 0 < days_left <= 30
        except Exception as date_err:
            result["not_before"] = not_before_str
            result["not_after"]  = not_after_str
            result["date_parse_error"] = str(date_err)
            days_left = 999  # assume valid for grading purposes

        # ── Subject Alternative Names ────────────────────────────────────
        result["subject_alt_names"] = _san_list(cert_dict)
        result["san_count"]         = len(result["subject_alt_names"])

        # ── Serial number ────────────────────────────────────────────────
        serial = cert_dict.get("serialNumber", "")
        result["serial_number"] = serial

        # ── OCSP / CRL endpoints ─────────────────────────────────────────
        # All three fields are plain tuples of URL strings in getpeercert()
        ocsp_uris  = list(cert_dict.get("OCSP",                 ()) or ())
        crl_uris   = list(cert_dict.get("crlDistributionPoints", ()) or ())
        ca_issuers = list(cert_dict.get("caIssuers",             ()) or ())
        result["ocsp_urls"]    = ocsp_uris
        result["crl_urls"]     = crl_uris
        result["ca_issuer_urls"] = ca_issuers

        # ── TLS / Cipher ─────────────────────────────────────────────────
        cipher_name, cipher_proto, cipher_bits = cipher_info if cipher_info else (None, None, None)
        result["tls_version"]   = tls_version
        result["cipher_suite"]  = cipher_name
        result["cipher_bits"]   = cipher_bits
        result["cipher_protocol"] = cipher_proto

        # ── Security warnings ────────────────────────────────────────────
        warnings = []
        if tls_version in ("TLSv1", "TLSv1.1", "SSLv2", "SSLv3"):
            warnings.append(f"Deprecated TLS version in use: {tls_version}")
        if cipher_bits and cipher_bits < 128:
            warnings.append(f"Weak cipher key size: {cipher_bits} bits")
        if result.get("is_expired"):
            warnings.append("Certificate has EXPIRED")
        if result.get("expires_soon"):
            warnings.append(f"Certificate expires in {days_left} days — renew soon!")
        result["warnings"] = warnings

        # ── Overall grade ────────────────────────────────────────────────
        result["grade"] = _grade_ssl(
            tls_version  or "",
            cipher_bits  or 0,
            days_left,
            is_ev,
        )

    except ssl.SSLCertVerificationError as e:
        result["error"]            = f"Certificate verification failed: {e}"
        result["is_expired"]       = False
        result["grade"]            = "F"
    except ssl.SSLError as e:
        result["error"]  = f"SSL error: {e}"
        result["grade"]  = "F"
    except socket.timeout:
        result["error"] = f"Connection timed out (>{10}s)"
    except ConnectionRefusedError:
        result["error"] = f"Connection refused on port {port}"
    except socket.gaierror as e:
        result["error"] = f"DNS resolution failed: {e}"
    except Exception as e:
        result["error"] = str(e)

    return result


# ── CLI entry-point ────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys, json
    domain = sys.argv[1] if len(sys.argv) > 1 else "google.com"
    print(json.dumps(check_ssl(domain), indent=2, default=str))
