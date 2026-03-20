"""
cybeRECON — DNS Reconnaissance
Usage: python tools/dns_tool.py <domain>
"""

try:
    import dns.resolver
    import dns.reversename
    DNS_AVAILABLE = True
except ImportError:
    DNS_AVAILABLE = False


def dns_recon(domain):
    if not DNS_AVAILABLE:
        return {"error": "dnspython not installed. Run: pip install dnspython"}

    result = {"domain": domain}
    record_types = ["A", "AAAA", "MX", "NS", "TXT", "CNAME", "SOA"]

    for rtype in record_types:
        try:
            answers = dns.resolver.resolve(domain, rtype, lifetime=5)
            result[rtype] = [str(r) for r in answers]
        except Exception:
            result[rtype] = []

    # PTR reverse lookup on first A record
    try:
        a_records = dns.resolver.resolve(domain, "A", lifetime=5)
        for ip in a_records:
            try:
                rev = dns.reversename.from_address(str(ip))
                ptr = dns.resolver.resolve(rev, "PTR", lifetime=5)
                result["PTR"] = [str(r) for r in ptr]
                break
            except Exception:
                result["PTR"] = []
    except Exception:
        result["PTR"] = []

    # CAA records
    try:
        caa = dns.resolver.resolve(domain, "CAA", lifetime=5)
        result["CAA"] = [str(r) for r in caa]
    except Exception:
        result["CAA"] = []

    return result


if __name__ == "__main__":
    import sys, json
    domain = sys.argv[1] if len(sys.argv) > 1 else "google.com"
    print(json.dumps(dns_recon(domain), indent=2))
