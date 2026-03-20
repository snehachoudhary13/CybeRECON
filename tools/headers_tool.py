"""
CyberRecon Academy — HTTP Header Analyzer
Usage: python tools/headers_tool.py <domain>
"""

import requests
import re

BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

SECURITY_HEADERS = [
    "Content-Security-Policy",
    "Strict-Transport-Security",
    "X-Frame-Options",
    "X-Content-Type-Options",
    "Referrer-Policy",
    "Permissions-Policy",
    "X-XSS-Protection",
    "Cross-Origin-Opener-Policy",
    "Cross-Origin-Resource-Policy",
    "Cross-Origin-Embedder-Policy",
    "Cache-Control",
    "Expect-CT",
]


def analyze_headers(domain):
    result = {}
    response = None
    try:
        # Try HTTPS first, fallback to HTTP
        try:
            response = requests.get(
                "https://" + domain, timeout=10, allow_redirects=True,
                headers={"User-Agent": BROWSER_UA}
            )
        except Exception:
            response = requests.get(
                "http://" + domain, timeout=10, allow_redirects=True,
                headers={"User-Agent": BROWSER_UA}
            )

        result["status_code"]    = response.status_code
        result["final_url"]      = response.url
        result["protocol_used"]  = "HTTPS" if response.url.startswith("https") else "HTTP"
        result["all_headers_raw"] = dict(response.headers)

        # Case-insensitive check (requests handles this natively)
        security_analysis = {}
        for h in SECURITY_HEADERS:
            value = response.headers.get(h, None)
            security_analysis[h] = {
                "status": "Present" if value else "Missing",
                "value":  value
            }
        result["security_headers"] = security_analysis

        # Weighted security score
        score = 100
        if not response.headers.get("Strict-Transport-Security"): score -= 20
        if not response.headers.get("Content-Security-Policy"):   score -= 20
        if not response.headers.get("X-Frame-Options"):           score -= 15
        if not response.headers.get("X-Content-Type-Options"):    score -= 10
        if not response.headers.get("Referrer-Policy"):           score -= 10
        if not response.headers.get("Permissions-Policy"):        score -= 10
        if not response.headers.get("Cross-Origin-Opener-Policy"): score -= 5

        # Server header — only penalise if version digits leak
        server_val = response.headers.get("Server", None)
        if server_val:
            result["server_header"] = server_val
            if re.search(r'\d+\.\d+', server_val):
                result["server_leak"] = "VERSION EXPOSED — " + server_val
                score -= 15
            else:
                result["server_leak"] = "OBSCURED — " + server_val + " (no version leaked ✓)"

        xpb = response.headers.get("X-Powered-By", None)
        if xpb:
            result["tech_leak"] = xpb
            score -= 10

        result["security_score"] = max(score, 0)
        s = result["security_score"]
        result["score_label"] = "Good" if s >= 80 else "Moderate" if s >= 55 else "Poor" if s >= 30 else "Critical"

    except requests.exceptions.SSLError as e:
        result["error"] = "SSL Error: " + str(e)
    except requests.exceptions.ConnectionError as e:
        result["error"] = "Connection refused / host unreachable: " + str(e)
    except Exception as e:
        result["error"] = str(e)

    return result


if __name__ == "__main__":
    import sys, json
    domain = sys.argv[1] if len(sys.argv) > 1 else "google.com"
    print(json.dumps(analyze_headers(domain), indent=2))
