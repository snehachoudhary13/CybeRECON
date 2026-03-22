import requests
import re
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

SECURITY_HEADERS_LIST = [
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
    "X-Permitted-Cross-Domain-Policies"
]

# Rotate multiple real browser User-Agents to avoid blocking
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0"
]

def analyze_headers(domain):
    result = {}
    response = None

    # Strip protocol if user included it
    domain = domain.replace("https://","").replace("http://","").split("/")[0]

    for scheme in ["https", "http"]:
        for ua in USER_AGENTS:
            try:
                url = f"{scheme}://{domain}"
                headers = {
                    "User-Agent": ua,
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.9",
                    "Accept-Encoding": "gzip, deflate, br",
                    "Connection": "keep-alive",
                    "Upgrade-Insecure-Requests": "1",
                    "Cache-Control": "max-age=0"
                }
                response = requests.get(
                    url,
                    timeout=8,
                    allow_redirects=True,
                    headers=headers,
                    verify=False
                )
                result["scheme_used"] = scheme
                result["user_agent_used"] = ua[:40] + "..."
                break
            except Exception as e:
                result["attempt_error"] = str(e)
                continue
        if response:
            break

    if response is None:
        result["error"] = "Could not connect to domain on HTTPS or HTTP"
        return result

    result["status_code"] = response.status_code
    result["final_url"] = response.url
    result["elapsed_ms"] = round(response.elapsed.total_seconds() * 1000)

    # Store ALL raw headers for debugging
    result["all_headers_raw"] = dict(response.headers)

    # Security header analysis
    security = {}
    for h in SECURITY_HEADERS_LIST:
        val = response.headers.get(h, None)
        security[h] = {
            "status": "Present" if val else "Missing",
            "value": val
        }
    result["security_headers"] = security

    # Server leak check
    server_val = response.headers.get("Server", None)
    if server_val:
        has_version = bool(re.search(r'\d+\.\d+', server_val))
        
        # Ensure 'server_leak' exists for frontend backward compatibility
        result["server_leak"] = server_val if has_version else None
        
        result["server_header"] = server_val
        result["server_version_exposed"] = has_version
        result["server_note"] = (
            f"VERSION EXPOSED — {server_val}" if has_version
            else f"Obscured — {server_val} (no version leaked ✓)"
        )

    # Tech leak check
    xpb = response.headers.get("X-Powered-By", None)
    if xpb:
        # Backward compatibility for frontend
        result["tech_leak"] = xpb
        
        result["tech_leak_note"] = f"BACKEND EXPOSED — {xpb}"

    # Weighted score
    score = 100
    if not response.headers.get("Strict-Transport-Security"): score -= 20
    if not response.headers.get("Content-Security-Policy"):   score -= 20
    if not response.headers.get("X-Frame-Options"):           score -= 15
    if not response.headers.get("X-Content-Type-Options"):    score -= 10
    if not response.headers.get("Referrer-Policy"):           score -= 10
    if not response.headers.get("Permissions-Policy"):        score -= 10
    if not response.headers.get("Cross-Origin-Opener-Policy"): score -= 5
    if server_val and re.search(r'\d+\.\d+', server_val):     score -= 15
    if xpb:                                                    score -= 10
    result["security_score"] = max(score, 0)

    if score >= 80:   result["grade"] = "A"
    elif score >= 60: result["grade"] = "B"
    elif score >= 40: result["grade"] = "C"
    elif score >= 20: result["grade"] = "D"
    else:             result["grade"] = "F"

    # Add note if score seems wrong
    if result["security_score"] <= 20:
        result["warning"] = (
            "Very low score detected. "
            "This may mean the server blocked our request and returned minimal headers. "
            "Real headers may differ. Try scanning a different domain to verify."
        )

    return result

if __name__ == "__main__":
    import sys, json
    domain = sys.argv[1] if len(sys.argv) > 1 else "google.com"
    print(json.dumps(analyze_headers(domain), indent=2, default=str))
