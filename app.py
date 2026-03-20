"""
╔══════════════════════════════════════════════════════╗
║   CYBERRECON ACADEMY — Flask Backend  (app.py)       ║
║   Run: python app.py                                 ║
║   API base: http://localhost:5000                    ║
║                                                      ║
║   Tool scripts (also runnable standalone):           ║
║     python tools/ssl_tool.py     google.com          ║
║     python tools/headers_tool.py google.com          ║
║     python tools/whois_tool.py   google.com          ║
║     python tools/geoip_tool.py   8.8.8.8             ║
║     python tools/dns_tool.py     google.com          ║
║     python tools/threat_tool.py  8.8.8.8             ║
╚══════════════════════════════════════════════════════╝
"""

import os
from flask import Flask, request, jsonify
from flask_cors import CORS

# ── Import each tool from its own file ────────────────────────
from tools.ssl_tool     import check_ssl
from tools.headers_tool import analyze_headers
from tools.whois_tool   import lookup_whois
from tools.geoip_tool   import geolocate
from tools.dns_tool     import dns_recon
from tools.threat_tool  import check_threat, ABUSEIPDB_API_KEY

app = Flask(__name__)
CORS(app)

# ─────────────────────────────────────────────────────────────
#  ROUTE 1 — SSL / TLS INSPECTOR
# ─────────────────────────────────────────────────────────────
@app.route("/api/ssl")
def ssl_route():
    domain = request.args.get("domain", "").strip()
    if not domain:
        return jsonify({"error": "No domain provided"})
    domain = domain.replace("https://", "").replace("http://", "").split("/")[0]
    return jsonify(check_ssl(domain))

# ─────────────────────────────────────────────────────────────
#  ROUTE 2 — HTTP HEADER ANALYZER
# ─────────────────────────────────────────────────────────────
@app.route("/api/headers")
def headers_route():
    domain = request.args.get("domain", "").strip()
    if not domain:
        return jsonify({"error": "No domain provided"})
    domain = domain.replace("https://", "").replace("http://", "").split("/")[0]
    return jsonify(analyze_headers(domain))

# ─────────────────────────────────────────────────────────────
#  ROUTE 3 — WHOIS INTELLIGENCE
# ─────────────────────────────────────────────────────────────
@app.route("/api/whois")
def whois_route():
    domain = request.args.get("domain", "").strip()
    if not domain:
        return jsonify({"error": "No domain provided"})
    domain = domain.replace("https://", "").replace("http://", "").split("/")[0]
    return jsonify(lookup_whois(domain))

# ─────────────────────────────────────────────────────────────
#  ROUTE 4 — IP GEOLOCATION
# ─────────────────────────────────────────────────────────────
@app.route("/api/geoip")
def geoip_route():
    target = request.args.get("target", "").strip()
    if not target:
        return jsonify({"error": "No target provided"})
    return jsonify(geolocate(target))

# ─────────────────────────────────────────────────────────────
#  ROUTE 5 — DNS RECONNAISSANCE
# ─────────────────────────────────────────────────────────────
@app.route("/api/dns")
def dns_route():
    domain = request.args.get("domain", "").strip()
    if not domain:
        return jsonify({"error": "No domain provided"})
    domain = domain.replace("https://", "").replace("http://", "").split("/")[0]
    return jsonify(dns_recon(domain))

# ─────────────────────────────────────────────────────────────
#  ROUTE 6 — THREAT INTELLIGENCE
# ─────────────────────────────────────────────────────────────
@app.route("/api/threat")
def threat_route():
    target = request.args.get("target", "").strip()
    if not target:
        return jsonify({"error": "No target provided"})
    return jsonify(check_threat(target))

# ─────────────────────────────────────────────────────────────
#  HEALTH CHECK
# ─────────────────────────────────────────────────────────────
@app.route("/")
def index():
    return jsonify({
        "status":  "cybeRECON BACKEND ONLINE",
        "routes":  ["/api/ssl", "/api/headers", "/api/whois",
                    "/api/geoip", "/api/dns", "/api/threat"],
        "abuseipdb": "configured" if ABUSEIPDB_API_KEY != "YOUR_ABUSEIPDB_KEY_HERE" else "not configured (optional)"
    })

if __name__ == "__main__":
    print("\n" + "═" * 52)
    print("  cybeRECON — Backend Server")
    print("  Running on http://localhost:5000")
    print("  Press Ctrl+C to stop")
    print("═" * 52 + "\n")
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=False, host="0.0.0.0", port=port, threaded=True)
