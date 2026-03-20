"""
cybeRECON — WHOIS Intelligence
Usage: python tools/whois_tool.py <domain>
"""

import datetime

try:
    import whois
    WHOIS_AVAILABLE = True
except ImportError:
    WHOIS_AVAILABLE = False


def lookup_whois(domain):
    if not WHOIS_AVAILABLE:
        return {"error": "python-whois not installed. Run: pip install python-whois"}

    result = {}
    try:
        w = whois.whois(domain)

        def first(val):
            return val[0] if isinstance(val, list) else val

        def to_naive(dt):
            """Strip timezone info so arithmetic works consistently."""
            if isinstance(dt, datetime.datetime) and dt.tzinfo is not None:
                return dt.replace(tzinfo=None)
            return dt

        creation = to_naive(first(w.creation_date))
        expiry   = to_naive(first(w.expiration_date))
        updated  = to_naive(first(w.updated_date))
        today    = datetime.datetime.utcnow()

        if isinstance(creation, datetime.datetime):
            age_days  = (today - creation).days
            age_years = round(age_days / 365, 1)
        else:
            age_days = age_years = None

        days_until_expiry = (expiry - today).days if isinstance(expiry, datetime.datetime) else None

        result["domain"]            = str(w.domain_name) if w.domain_name else domain
        result["registrar"]         = w.registrar
        result["creation_date"]     = creation.strftime("%Y-%m-%d") if isinstance(creation, datetime.datetime) else str(creation)
        result["expiry_date"]       = expiry.strftime("%Y-%m-%d")   if isinstance(expiry,   datetime.datetime) else str(expiry)
        result["updated_date"]      = updated.strftime("%Y-%m-%d")  if isinstance(updated,  datetime.datetime) else str(updated)
        result["domain_age_days"]   = age_days
        result["domain_age_years"]  = age_years
        result["days_until_expiry"] = days_until_expiry
        result["nameservers"]       = list(w.name_servers) if w.name_servers else []
        result["status"]            = (w.status if isinstance(w.status, list) else [w.status]) if w.status else []
        result["emails"]            = w.emails
        result["country"]           = w.country
        result["org"]               = w.org

        if age_days is not None:
            if age_days < 30:     result["risk_level"] = "CRITICAL"
            elif age_days < 365:  result["risk_level"] = "HIGH"
            elif age_days < 1825: result["risk_level"] = "MEDIUM"
            else:                 result["risk_level"] = "LOW"

    except Exception as e:
        result["error"] = str(e)

    return result


if __name__ == "__main__":
    import sys, json
    domain = sys.argv[1] if len(sys.argv) > 1 else "google.com"
    print(json.dumps(lookup_whois(domain), indent=2, default=str))
