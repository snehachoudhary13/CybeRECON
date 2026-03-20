"""
cybeRECON — IP Geolocation & ASN
Usage: python tools/geoip_tool.py <ip_or_domain>
"""

import requests
import socket


def geolocate(target):
    result = {}
    try:
        try:
            ip = socket.gethostbyname(target)
            if ip != target:
                result["resolved_from"] = target
        except Exception:
            ip = target
        result["ip"] = ip

        resp = requests.get(
            f"https://ipapi.co/{ip}/json/",
            timeout=8,
            headers={"User-Agent": "CybeRECON-Scanner/3.2"}
        )
        data = resp.json()

        if "error" in data:
            result["error"] = data.get("reason", "Unknown error from ipapi.co")
            return result

        result["city"]         = data.get("city")
        result["region"]       = data.get("region")
        result["country"]      = data.get("country_name")
        result["country_code"] = data.get("country_code")
        result["postal"]       = data.get("postal")
        result["latitude"]     = data.get("latitude")
        result["longitude"]    = data.get("longitude")
        result["timezone"]     = data.get("timezone")
        result["utc_offset"]   = data.get("utc_offset")
        result["isp"]          = data.get("org")
        result["asn"]          = data.get("asn")
        result["currency"]     = data.get("currency")
        result["calling_code"] = data.get("country_calling_code")

    except Exception as e:
        result["error"] = str(e)

    return result


if __name__ == "__main__":
    import sys, json
    target = sys.argv[1] if len(sys.argv) > 1 else "8.8.8.8"
    print(json.dumps(geolocate(target), indent=2))
