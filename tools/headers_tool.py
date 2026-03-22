"""
cybeRECON — HTTP Header Analyzer
Usage: python tools/headers_tool.py <domain>

Fetches HTTP response headers for a domain and scores its security posture
based on the presence / correctness of key security headers.
"""

import requests
import socket


# ── Security header definitions ─────────────────────────────────────────────

# Each entry: (header_name, weight, description, good_value_hint)
SECURITY_HEADERS = [
    ("Strict-Transport-Security",    20, "HSTS — forces HTTPS",                 "max-age≥31536000"),
    ("Content-Security-Policy",      20, "CSP — prevents XSS/injection",        "policy present"),
    ("X-Frame-Options",              10, "Clickjacking protection",             "DENY or SAMEORIGIN"),
    ("X-Content-Type-Options",       10, "MIME-sniffing protection",            "nosniff"),
    ("Referrer-Policy",               5, "Controls referrer leakage",           "strict-origin…"),
    ("Permissions-Policy",            5, "Feature policy (camera, mic…)",       "any value"),
    ("X-XSS-Protection",              5, "Legacy XSS filter (old browsers)",    "1; mode=block"),
    ("Cache-Control",                 5, "Caching directives",                  "no-store / private"),
    ("Cross-Origin-Opener-Policy",    5, "Isolates browsing context",           "same-origin"),
    ("Cross-Origin-Resource-Policy",  5, "Limits resource sharing",             "same-origin"),
    ("Cross-Origin-Embedder-Policy",  5, "Requires CORP for subresources",      "require-corp"),
    ("X-Permitted-Cross-Domain-Policies", 5, "Adobe cross-domain policy",       "none"),
]

MISSING_PENALTY = {h[0]: h[1] for h in SECURITY_HEADERS}

# Headers that are considered information-leaking
INFO_LEAK_HEADERS = [
    "Server",
    "X-Powered-By",
    "X-AspNet-Version",
    "X-AspNetMvc-Version",
    "X-Generator",
    "X-Runtime",
    "Via",
    "X-Drupal-Cache",
    "X-Varnish",
]


# ── HSTS parser ──────────────────────────────────────────────────────────────

def _parse_hsts(value: str) -> dict:
    directives = [d.strip().lower() for d in value.split(";")]
    max_age = None
    for d in directives:
        if d.startswith("max-age="):
            try:
                max_age = int(d.split("=", 1)[1])
            except ValueError:
                pass
    return {
        "max_age":            max_age,
        "include_subdomains": "includesubdomains" in directives,
        "preload":            "preload" in directives,
        "max_age_ok":         max_age is not None and max_age >= 31_536_000,
    }


# ── Score / grade ────────────────────────────────────────────────────────────

def _score_and_grade(present: set) -> tuple:
    total   = sum(w for _, w, _, _ in SECURITY_HEADERS)
    earned  = sum(w for h, w, _, _ in SECURITY_HEADERS if h in present)
    score   = round(earned / total * 100)

    if score >= 90:  grade = "A+"
    elif score >= 75: grade = "A"
    elif score >= 60: grade = "B"
    elif score >= 45: grade = "C"
    elif score >= 30: grade = "D"
    else:             grade = "F"

    return score, grade


# ── Main public function ─────────────────────────────────────────────────────

def analyze_headers(domain: str) -> dict:
    """
    Fetch HTTP(S) headers for *domain* and analyse its security posture.
    Returns a flat dict suitable for JSON serialisation.
    """
    result = {"domain": domain}

    # Resolve IP for informational purposes
    try:
        result["ip"] = socket.gethostbyname(domain)
    except Exception:
        result["ip"] = None

    # Try HTTPS first, fall back to HTTP
    for scheme in ("https", "http"):
        url = f"{scheme}://{domain}"
        try:
            resp = requests.get(
                url,
                timeout=10,
                allow_redirects=True,
                headers={"User-Agent": "CybeRECON-Scanner/3.2"},
            )
            result["url"]         = resp.url
            result["status_code"] = resp.status_code
            result["scheme"]      = scheme
            headers = resp.headers
            break
        except requests.exceptions.SSLError:
            # HTTPS failed — try HTTP
            continue
        except Exception as e:
            result["error"] = str(e)
            return result
    else:
        result["error"] = "Could not connect over HTTPS or HTTP"
        return result

    # ── Raw headers ───────────────────────────────────────────────────────
    result["raw_headers"] = dict(headers)

    # ── Redirect chain ────────────────────────────────────────────────────
    result["redirect_chain"] = [r.url for r in resp.history]
    result["final_url"]      = resp.url

    # ── Security header analysis ──────────────────────────────────────────
    present_headers = set()
    security_analysis = {}

    for header_name, weight, description, hint in SECURITY_HEADERS:
        value = headers.get(header_name)
        present = value is not None
        if present:
            present_headers.add(header_name)

        entry = {
            "present":     present,
            "value":       value,
            "description": description,
            "good_value":  hint,
            "weight":      weight,
        }

        # Extra parsing for key headers
        if header_name == "Strict-Transport-Security" and present:
            entry["hsts_details"] = _parse_hsts(value)

        if header_name == "X-Frame-Options" and present:
            val_upper = value.upper()
            entry["is_safe"] = val_upper in ("DENY", "SAMEORIGIN")

        if header_name == "X-Content-Type-Options" and present:
            entry["is_safe"] = value.lower() == "nosniff"

        security_analysis[header_name] = entry

    result["security_headers"] = security_analysis

    # ── Score & grade ─────────────────────────────────────────────────────
    score, grade = _score_and_grade(present_headers)
    result["security_score"] = score
    result["grade"]           = grade

    # ── Information leakage ───────────────────────────────────────────────
    leaking = {}
    for h in INFO_LEAK_HEADERS:
        v = headers.get(h)
        if v:
            leaking[h] = v
    result["info_leak_headers"] = leaking
    result["info_leak_risk"]    = "HIGH" if len(leaking) >= 3 else ("MEDIUM" if leaking else "LOW")

    # ── Missing headers summary ───────────────────────────────────────────
    result["missing_headers"] = [
        h for h, _, _, _ in SECURITY_HEADERS if h not in present_headers
    ]

    # ── Server / technology fingerprint ──────────────────────────────────
    result["server"]       = headers.get("Server")
    result["powered_by"]   = headers.get("X-Powered-By")
    result["content_type"] = headers.get("Content-Type")

    # ── HTTP → HTTPS upgrade check ────────────────────────────────────────
    result["uses_https"] = result["scheme"] == "https"

    # ── Warnings ─────────────────────────────────────────────────────────
    warnings = []
    if not result["uses_https"]:
        warnings.append("Site does not use HTTPS — traffic is unencrypted")
    if leaking:
        warnings.append(f"Server leaks technology info via: {', '.join(leaking.keys())}")
    hsts = security_analysis.get("Strict-Transport-Security", {})
    if result["uses_https"] and not hsts.get("present"):
        warnings.append("HSTS header missing — browsers may not enforce HTTPS")
    hsts_details = hsts.get("hsts_details", {})
    if hsts_details and not hsts_details.get("max_age_ok"):
        warnings.append("HSTS max-age is too short (should be ≥ 1 year / 31536000 s)")
    if not security_analysis.get("Content-Security-Policy", {}).get("present"):
        warnings.append("No Content-Security-Policy — site vulnerable to XSS/injection")
    if score < 50:
        warnings.append(f"Low security score ({score}/100) — many recommended headers are missing")
    result["warnings"] = warnings

    return result


# ── CLI entry-point ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys, json
    domain = sys.argv[1] if len(sys.argv) > 1 else "google.com"
    print(json.dumps(analyze_headers(domain), indent=2, default=str))
