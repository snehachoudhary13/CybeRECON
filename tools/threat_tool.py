"""
CyberRecon Academy — Threat Intelligence
Usage: python tools/threat_tool.py <ip_or_domain>

Tier 1 (free / no key): ip-api.com — proxy, VPN, datacenter detection
Tier 2 (optional key) : AbuseIPDB  — abuse score, reports, history

Set ABUSEIPDB_KEY as an environment variable OR edit the constant below:
    set ABUSEIPDB_KEY=your_key_here    (Windows)
    export ABUSEIPDB_KEY=your_key_here (Linux/Mac)
"""

import requests
import socket
import os

# Optional: set your AbuseIPDB key here OR as an env variable
ABUSEIPDB_API_KEY = os.environ.get("ABUSEIPDB_KEY", "YOUR_ABUSEIPDB_KEY_HERE")


def check_threat(target):
    result = {}

    # ── Resolve hostname → IP ──────────────────────────────────
    try:
        ip = socket.gethostbyname(target)
        if ip != target:
            result["resolved_ip"] = ip
    except Exception:
        ip = target
    result["ip"] = ip

    # ── TIER 1: ip-api.com (free, no key needed) ──────────────
    try:
        fields = "status,message,country,countryCode,regionName,city,isp,org,as,proxy,hosting,query"
        r = requests.get(
            f"http://ip-api.com/json/{ip}",
            params={"fields": fields},
            timeout=8
        )
        geo = r.json()

        if geo.get("status") == "success":
            result["country"]    = geo.get("country")
            result["country_code"] = geo.get("countryCode")
            result["region"]     = geo.get("regionName")
            result["city"]       = geo.get("city")
            result["isp"]        = geo.get("isp")
            result["org"]        = geo.get("org")
            result["asn"]        = geo.get("as")
            result["is_proxy"]   = geo.get("proxy", False)    # VPN/Tor/proxy
            result["is_hosting"] = geo.get("hosting", False)  # datacenter
        else:
            result["geo_error"] = geo.get("message", "ip-api lookup failed")

    except Exception as e:
        result["geo_error"] = str(e)

    # ── TIER 2: AbuseIPDB (optional) ──────────────────────────
    has_key = ABUSEIPDB_API_KEY != "YOUR_ABUSEIPDB_KEY_HERE"
    result["abuseipdb_enabled"] = has_key

    if has_key:
        try:
            resp = requests.get(
                "https://api.abuseipdb.com/api/v2/check",
                params={"ipAddress": ip, "maxAgeInDays": 90, "verbose": True},
                headers={"Key": ABUSEIPDB_API_KEY, "Accept": "application/json"},
                timeout=8
            )
            data = resp.json().get("data", {})
            result["abuse_score"]        = data.get("abuseConfidenceScore", 0)
            result["total_reports"]      = data.get("totalReports", 0)
            result["distinct_reporters"] = data.get("numDistinctUsers", 0)
            result["last_reported"]      = data.get("lastReportedAt")
            result["usage_type"]         = data.get("usageType")
            result["is_whitelisted"]     = data.get("isWhitelisted")
            result["hostnames"]          = data.get("hostnames", [])
        except Exception as e:
            result["abuseipdb_error"] = str(e)
    else:
        result["abuseipdb_note"] = "Set ABUSEIPDB_KEY env var or edit threat_tool.py for full abuse history"

    # ── Verdict ───────────────────────────────────────────────
    abuse_score = result.get("abuse_score", None)
    is_proxy    = result.get("is_proxy", False)
    is_hosting  = result.get("is_hosting", False)

    if abuse_score is not None:
        if abuse_score >= 75:   result["verdict"] = "MALICIOUS"
        elif abuse_score >= 25: result["verdict"] = "SUSPICIOUS"
        elif abuse_score > 0:   result["verdict"] = "LOW RISK"
        elif is_proxy:          result["verdict"] = "PROXY / VPN"
        elif is_hosting:        result["verdict"] = "DATACENTER"
        else:                   result["verdict"] = "CLEAN"
    else:
        if is_proxy:            result["verdict"] = "PROXY / VPN DETECTED"
        elif is_hosting:        result["verdict"] = "DATACENTER / HOSTING IP"
        else:                   result["verdict"] = "NO THREATS DETECTED"

    return result


if __name__ == "__main__":
    import sys, json
    target = sys.argv[1] if len(sys.argv) > 1 else "8.8.8.8"
    print(json.dumps(check_threat(target), indent=2))
