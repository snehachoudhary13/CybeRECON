"""
CyberRecon Academy — SSL/TLS Inspector
Usage: python tools/ssl_tool.py <domain>
"""

import ssl
import socket
import datetime
import certifi


def check_ssl(domain):
    result = {}
    try:
        context = ssl.create_default_context(cafile=certifi.where())
        sock = socket.socket(socket.AF_INET)
        sock.settimeout(10)
        conn = context.wrap_socket(sock, server_hostname=domain)
        conn.connect((domain, 443))
        tls_version = conn.version()
        cipher      = conn.cipher()
        cert        = conn.getpeercert()
        conn.close()

        subject = dict(x[0] for x in cert.get("subject", []))
        issuer  = dict(x[0] for x in cert.get("issuer",  []))

        not_before = datetime.datetime.strptime(cert["notBefore"], "%b %d %H:%M:%S %Y %Z")
        not_after  = datetime.datetime.strptime(cert["notAfter"],  "%b %d %H:%M:%S %Y %Z")
        days_left  = (not_after - datetime.datetime.utcnow()).days

        result["domain"]         = domain
        result["subject_cn"]     = subject.get("commonName", "N/A")
        result["issuer_org"]     = issuer.get("organizationName", "N/A")
        result["issuer_cn"]      = issuer.get("commonName", "N/A")
        result["valid_from"]     = not_before.strftime("%Y-%m-%d")
        result["valid_until"]    = not_after.strftime("%Y-%m-%d")
        result["days_remaining"] = days_left
        result["expired"]        = days_left < 0
        result["expiring_soon"]  = 0 < days_left < 30
        result["san"]            = [x[1] for x in cert.get("subjectAltName", [])][:8]
        result["tls_version"]    = tls_version
        result["cipher_name"]    = cipher[0] if cipher else "Unknown"
        result["cipher_bits"]    = cipher[2] if cipher else "Unknown"
        result["valid"]          = True

        if days_left < 0:          result["grade"] = "F"
        elif days_left < 30:       result["grade"] = "C"
        elif tls_version in ("TLSv1", "TLSv1.1"): result["grade"] = "C"
        elif tls_version == "TLSv1.2":             result["grade"] = "B"
        else:                      result["grade"] = "A+"

    except ssl.SSLCertVerificationError as e:
        result["valid"] = False
        result["error"] = "Certificate verification FAILED: " + str(e)
        result["grade"] = "F"
    except socket.timeout:
        result["error"] = "Connection timed out (10s). Check domain and port 443."
    except Exception as e:
        result["error"] = str(e)

    return result


if __name__ == "__main__":
    import sys, json
    domain = sys.argv[1] if len(sys.argv) > 1 else "google.com"
    print(json.dumps(check_ssl(domain), indent=2))
