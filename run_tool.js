/* ═══════════════════════════════════════════════════════
   CYBERRECON ACADEMY — run_tool.js (Real Backend Edition)
   All tools call Flask backend at http://localhost:5000
   Zero fake data. Zero Math.random(). Zero hardcoded values.
═══════════════════════════════════════════════════════ */

const API_BASE = 'http://localhost:5000';

// ─── Inject learn-line CSS ───────────────────────────
(function injectLearnStyles() {
  if (document.getElementById('learn-style')) return;
  const s = document.createElement('style');
  s.id = 'learn-style';
  s.textContent = `
    .learn-line {
      background: rgba(0,245,255,0.04);
      border-left: 2px solid rgba(0,245,255,0.4);
      border-radius: 0 6px 6px 0;
      padding: 8px 12px; margin-bottom: 10px;
      font-size: 0.72rem; line-height: 1.65; color: #a0c8d0;
    }
    .learn-line .learn-key {
      display: block; color: #ffee00; font-weight: bold;
      margin-bottom: 4px; font-family: 'Share Tech Mono', monospace;
    }
    .learn-line code { background:rgba(0,0,0,0.6); padding:1px 5px; border-radius:3px; color:#00f5ff; font-size:0.68rem; }
    .learn-line strong { color:#fff; }
    .spinner { display:inline-block; width:10px; height:10px; border:2px solid rgba(0,245,255,0.3); border-top-color:#00f5ff; border-radius:50%; animation:spin 0.7s linear infinite; margin-right:6px; }
    @keyframes spin { to { transform:rotate(360deg); } }
    .t-loading { color:rgba(0,245,255,0.5); font-style:italic; }
    #learn1,#learn2,#learn3,#learn4,#learn5,#learn6,#learn7 { margin-bottom:10px; }
  `;
  document.head.appendChild(s);
})();

// ─── Generic API caller ──────────────────────────────
async function callAPI(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status} — backend returned an error`);
  return resp.json();
}

// ─── Show loading state in terminal ─────────────────
function showLoading(termId, label) {
  const term = document.getElementById(termId);
  if (!term) return;
  term.innerHTML = `<span class="t-loading"><span class="spinner"></span>Connecting to backend... querying ${label}</span>`;
}

// ─── Print terminal lines one by one ────────────────
function printTerminal(termId, lines, onComplete) {
  const term = document.getElementById(termId);
  if (!term) return;
  term.innerHTML = '';
  let i = 0;
  function next() {
    if (i < lines.length) {
      const sp = document.createElement('span');
      sp.className = 't-line';
      sp.innerHTML = lines[i];
      term.appendChild(sp);
      term.scrollTop = term.scrollHeight;
      i++;
      setTimeout(next, 90 + Math.floor(Math.random() * 0)); // deterministic
    } else {
      if (onComplete) onComplete();
    }
  }
  next();
}

// ─── Colour helper ──────────────────────────────────
function cls(val, good, warn, bad) {
  // good/warn/bad are threshold comparisons — just use manually
  return val;
}
function C(text, type) {
  const map = { success:'t-success', warn:'t-warn', danger:'t-danger', val:'t-val', key:'t-key', comment:'t-comment' };
  return `<span class="${map[type]||'t-val'}">${text}</span>`;
}
function line(key, val, type='val') {
  return `${C(key+':', 'key')} ${C(val, type)}`;
}
function comment(text) { return C(`## ${text} ##`, 'comment'); }
function err(msg)       { return `${C('[ERROR]','danger')} <span style="color:#ff8080">${msg}</span>`; }

// ═══════════════════════════════════════════════════════
//  window.runTool — dispatches to each tool function
// ═══════════════════════════════════════════════════════
window.runTool = function(toolId) {
  switch (toolId) {
    case 1: runURLInspector();   break;
    case 2: runSSL();            break;
    case 3: runHeaders();        break;
    case 4: runGeoIP();          break;
    case 5: runWHOIS();          break;
    case 6: runThreatIntel();    break;
    case 7: runDNS();            break;
  }
};

// ═══════════════════════════════════════════════════════
//  TOOL 1 — URL INSPECTOR (pure frontend, no backend)
// ═══════════════════════════════════════════════════════
function runURLInspector() {
  const raw = document.getElementById('input-url').value.trim() || 'https://example.com/api/v2/users?id=1';
  const RISKY = ['id','admin','query','user','token','auth','key','secret','pass','cmd','exec'];
  const lines = [];

  try {
    const u = new URL(raw.startsWith('http') ? raw : 'https://' + raw);
    const isHttps = u.protocol === 'https:';
    const paramArr = Array.from(new URLSearchParams(u.search).entries());

    lines.push(comment(`URL DECOMPOSITION: ${u.host}`));
    lines.push(line('Protocol', u.protocol.replace(':','').toUpperCase() + (isHttps ? ' [SECURE ✓]' : ' [PLAINTEXT — RISK ✗]'), isHttps ? 'success' : 'danger'));
    lines.push(line('Domain', u.hostname, 'val'));
    if (u.port) lines.push(line('Port', `${u.port} (non-standard — check if intentional)`, 'warn'));
    lines.push(line('Path', u.pathname, 'val'));

    if (paramArr.length) {
      lines.push(line('Parameters', `${paramArr.length} found`, 'val'));
      paramArr.forEach(([k, v]) => {
        const risky = RISKY.some(r => k.toLowerCase().includes(r));
        lines.push(`&nbsp;&nbsp;${C('>>','comment')} ${C(k,'key')} = ${C(v, risky?'danger':'warn')}${risky ? C(' ⚠ INJECTION SURFACE','danger') : ''}`);
      });
    } else {
      lines.push(line('Parameters', 'None detected', 'success'));
    }
    if (u.hash) lines.push(line('Fragment', u.hash + ' (client-side only, never sent to server)', 'val'));
    lines.push(comment('SCAN COMPLETE'));

    const riskyParams = paramArr.filter(([k]) => RISKY.some(r => k.toLowerCase().includes(r)));
    printTerminal('term-1', lines, () => {
      document.getElementById('learn1').innerHTML = buildURLLearn(u, isHttps, paramArr, riskyParams);
      speak(`URL parsed. Protocol is ${u.protocol.replace(':','')} — ${isHttps ? 'encrypted.' : 'WARNING: plaintext!'}${riskyParams.length ? ` Found ${riskyParams.length} risky parameter(s): ${riskyParams.map(([k])=>k).join(', ')}. These are injection vectors.` : ' No risky parameters found.'} Check the LEARN tab. Moving to Tool 2 — SSL Inspector.`);
      unlockTool(2);
    });

  } catch(e) {
    printTerminal('term-1', [err('Invalid URL: ' + e.message)]);
    speak('Invalid URL format. Please include the full URL with https:// prefix.');
  }
}

function buildURLLearn(u, isHttps, paramArr, riskyParams) {
  return `
    <div class="learn-line"><span class="learn-key">Protocol: ${u.protocol.replace(':','').toUpperCase()}</span>${isHttps
      ? '✅ <span class="t-success">HTTPS — TLS encrypted. Data is protected in transit between browser and server.</span>'
      : '❌ <span class="t-danger">HTTP — Plaintext connection! Any network observer (ISP, coffee-shop MITM) can read all data. Enforce HTTPS + HSTS.</span>'}</div>
    <div class="learn-line"><span class="learn-key">Domain: ${u.hostname}</span>Use this with <strong>WHOIS</strong> to check registration age, and <strong>IP Geo</strong> to trace the hosting provider. Sub-domains like <code>api.target.com</code> often have weaker defenses than the main domain.</div>
    ${u.port ? `<div class="learn-line"><span class="learn-key">Port: ${u.port}</span>⚠️ Non-standard port. HTTP=80, HTTPS=443. Port <strong>${u.port}</strong> often indicates an exposed dev server, debug endpoint, or internal API not intended to be public-facing.</div>` : ''}
    <div class="learn-line"><span class="learn-key">Path: ${u.pathname}</span>Exposes the API routing structure. <code>/api/v2/users</code> reveals the API version and resource type. Version-specific exploits exist — e.g., v1 endpoints may still be accessible even if v2 is the main one.</div>
    ${riskyParams.length ? `<div class="learn-line"><span class="learn-key t-danger">⚠️ Risky Parameters: ${riskyParams.map(([k,v])=>`<code>${k}=${v}</code>`).join(', ')}</span>
      <strong>SQLi:</strong> try <code>${riskyParams[0][0]}=1 OR 1=1--</code> to test if DB queries are sanitized.<br>
      <strong>IDOR:</strong> change <code>${riskyParams[0][1]}</code> to another value — can you access another user's resource?<br>
      <strong>Parameter Pollution:</strong> duplicate the parameter with different values — some frameworks use the last, some the first.
    </div>` : '<div class="learn-line"><span class="t-success">✅ No high-risk parameters found.</span> Always validate server-side regardless — client-side guards can be bypassed with Burp Suite or curl.</div>'}
    ${u.hash ? `<div class="learn-line"><span class="learn-key">Fragment: ${u.hash}</span>Client-side only. Never sent to server. Cannot be accessed from server logs. Common in React/Vue SPA routing. Cannot be used for server-side injection attacks.</div>` : ''}
  `;
}

// ═══════════════════════════════════════════════════════
//  TOOL 2 — SSL/TLS INSPECTOR → /api/ssl
// ═══════════════════════════════════════════════════════
async function runSSL() {
  const domain = (document.getElementById('input-ssl').value.trim() || 'example.com').replace(/^https?:\/\//,'').split('/')[0];
  showLoading('term-2', `ssl certificate for ${domain}:443`);

  try {
    const d = await callAPI(`${API_BASE}/api/ssl?domain=${encodeURIComponent(domain)}`);
    console.log('[CybeRECON] /api/ssl response:', d);

    if (d.error) {
      printTerminal('term-2', [comment(`SSL PROBE: ${domain}:443`), err(d.error)]);
      speak(`Backend error on SSL scan: ${d.error}`);
      return;
    }

    const gradeColor = {'A+':'success','A':'success','B':'warn','C':'warn','F':'danger'}[d.grade] || 'val';
    const expiryColor = d.expired ? 'danger' : d.expiring_soon ? 'warn' : 'success';

    const lines = [
      comment(`SSL CERT PROBE: ${domain}:443`),
      line('Status',        d.valid ? 'VALID ✓' : 'INVALID ✗', d.valid ? 'success' : 'danger'),
      line('Subject CN',    d.subject_cn, 'val'),
      line('Issuer Org',    d.issuer_org, 'val'),
      line('Issuer CN',     d.issuer_cn, 'val'),
      line('TLS Version',   d.tls_version, d.tls_version === 'TLSv1.3' ? 'success' : d.tls_version === 'TLSv1.2' ? 'warn' : 'danger'),
      line('Cipher Suite',  d.cipher_name + (d.cipher_bits ? ` (${d.cipher_bits}-bit)` : ''), 'val'),
      line('Valid From',    d.valid_from, 'val'),
      line('Valid Until',   d.valid_until, expiryColor),
      line('Days Remaining',d.days_remaining >= 0 ? `${d.days_remaining} days` : `EXPIRED ${Math.abs(d.days_remaining)} days ago`, expiryColor),
      line('Security Grade',d.grade, gradeColor),
    ];
    if (d.san && d.san.length) lines.push(line('SAN Domains', d.san.slice(0,4).join(', ') + (d.san.length > 4 ? ` +${d.san.length-4} more` : ''), 'val'));
    lines.push(comment('CERTIFICATE SCAN COMPLETE'));

    printTerminal('term-2', lines, () => {
      document.getElementById('learn2').innerHTML = buildSSLLearn(d);
      const gr = d.grade;
      speak(`${domain} scores grade ${gr} on SSL. TLS version: ${d.tls_version}. Cipher: ${d.cipher_name}. ${d.expired ? 'CRITICAL: Certificate is EXPIRED!' : `${d.days_remaining} days until expiry.`} Check the LEARN tab for a full breakdown. Next — HTTP Headers in Tool 3.`);
      unlockTool(3);
    });

  } catch(e) {
    printTerminal('term-2', [comment(`SSL PROBE: ${domain}`), err('Cannot reach backend. Is Flask server running? Start with: python app.py — Error: ' + e.message)]);
    speak('Cannot reach the backend server. Make sure to run python app.py in the CybeRECON folder first.');
  }
}

function buildSSLLearn(d) {
  const gradeExp = {'A+':'Excellent — TLS 1.3, strong AEAD cipher, valid CA cert.','A':'Very good — TLS 1.2+, strong cipher.','B':'Acceptable but older TLS version or weaker cipher.','C':'Risky — deprecated TLS 1.0/1.1 or expiring soon.','F':'Critical — expired cert or verification failure. Do not trust this server.'}[d.grade] || '';
  return `
    <div class="learn-line"><span class="learn-key">Status: ${d.valid ? '✅ Valid' : '❌ Invalid'}</span>${d.valid ? `The certificate for <strong>${d.domain}</strong> is trusted by a recognized CA. Identity verified.` : 'Certificate is invalid for this domain. This can indicate an expired cert, a self-signed cert with no CA verification, or a domain mismatch — all enable Man-in-the-Middle attacks.'}</div>
    <div class="learn-line"><span class="learn-key">Issuer: ${d.issuer_org}</span>The Certificate Authority that signed this cert. <strong>${d.issuer_org}</strong> has verified the server identity. Red flags: unknown CAs, self-signed certs (<code>Issuer == Subject</code>), or CA companies used exclusively by phishing kits.</div>
    <div class="learn-line"><span class="learn-key">TLS Version: ${d.tls_version}</span>${d.tls_version==='TLSv1.3'?'✅ TLS 1.3 is the gold standard — encrypts the handshake itself, eliminates all legacy weak ciphers, guarantees Perfect Forward Secrecy.':d.tls_version==='TLSv1.2'?'⚠️ TLS 1.2 is acceptable but older — lacks some TLS 1.3 security improvements. Upgrade to 1.3 when possible.':'❌ TLS 1.0/1.1 are deprecated and vulnerable to POODLE, BEAST, and CRIME attacks. This server needs urgent patching.'}</div>
    <div class="learn-line"><span class="learn-key">Cipher: ${d.cipher_name}</span>This cipher encrypts the data stream. <strong>${d.cipher_name}</strong> — key size: ${d.cipher_bits} bits. AEAD ciphers (AES-GCM, CHACHA20-POLY1305) provide both encryption and integrity. Watch for: <span class="t-danger">RC4, DES, 3DES, NULL</span> — these are broken ciphers.</div>
    <div class="learn-line"><span class="learn-key">Expiry: ${d.valid_until} (${d.days_remaining} days)</span>${d.expired?'❌ EXPIRED. This certificate has passed its validity window. Browsers show a frightening warning. Attackers time attacks on expired cert windows.':d.expiring_soon?'⚠️ Expiring within 30 days! Set up auto-renewal immediately via certbot/ACME protocol.':'✅ Certificate has adequate time remaining.'}</div>
    <div class="learn-line"><span class="learn-key">Grade: ${d.grade}</span>${gradeExp} Grade is determined by: TLS version, cipher strength, cert validity, and CA trust level.</div>
  `;
}

// ═══════════════════════════════════════════════════════
//  TOOL 3 — HTTP HEADER ANALYZER → /api/headers
// ═══════════════════════════════════════════════════════
async function runHeaders() {
  const domain = (document.getElementById('input-http').value.trim() || 'example.com').replace(/^https?:\/\//,'').split('/')[0];
  showLoading('term-3', `http headers for ${domain}`);

  try {
    const d = await callAPI(`${API_BASE}/api/headers?domain=${encodeURIComponent(domain)}`);
    console.log('[CybeRECON] /api/headers response:', d);

    if (d.error) {
      printTerminal('term-3', [comment(`HTTP HEADERS: ${domain}`), err(d.error)]);
      speak(`Backend error: ${d.error}`);
      return;
    }

    const score = d.security_score;
    const scoreColor = score >= 80 ? 'success' : score >= 55 ? 'warn' : 'danger';
    const lines = [comment(`HTTP RESPONSE HEADERS: ${domain}`)];
    lines.push(line('Status Code',   d.status_code, d.status_code < 400 ? 'success' : 'danger'));
    lines.push(line('Protocol',      d.protocol_used || 'HTTPS', d.protocol_used === 'HTTPS' ? 'success' : 'warn'));
    lines.push(line('Final URL',     d.final_url, 'val'));
    // Server header — backend already formats "VERSION EXPOSED" vs "OBSCURED"
    if (d.server_leak) {
      const isExposed = d.server_leak.startsWith('VERSION EXPOSED');
      lines.push(line('Server', d.server_leak, isExposed ? 'danger' : 'success'));
    }
    if (d.tech_leak) lines.push(line('X-Powered-By', d.tech_leak + ' ⚠ FRAMEWORK LEAKED', 'danger'));

    const sh = d.security_headers || {};
    Object.entries(sh).forEach(([header, info]) => {
      const present = info.status === 'Present';
      const shortVal = info.value ? (info.value.length > 60 ? info.value.slice(0,57)+'…' : info.value) : '';
      lines.push(line(header, present ? (shortVal || 'Present ✓') : 'MISSING ✗', present ? 'success' : 'danger'));
    });

    lines.push(comment(`SECURITY SCORE: ${score}/100`));

    printTerminal('term-3', lines, () => {
      document.getElementById('learn3').innerHTML = buildHeadersLearn(d);
      speak(`${domain} scores ${score}/100. ${d.server_leak ? 'Server version is exposed — attackers can look up CVEs for ' + d.server_leak + '.' : ''} ${(sh['Content-Security-Policy']||{}).status === 'Missing' ? 'Critical: No Content Security Policy — XSS attacks can execute freely.' : 'CSP is present.'} Check LEARN for details. Moving to IP Geolocation in Tool 4.`);
      unlockTool(4);
    });

  } catch(e) {
    printTerminal('term-3', [comment('HTTP HEADERS'), err('Cannot reach backend. Start Flask server: python app.py — ' + e.message)]);
    speak('Cannot reach backend. Start the Flask server first.');
  }
}

function buildHeadersLearn(d) {
  const sh = d.security_headers || {};
  let html = '';
  if (d.server_leak) html += `<div class="learn-line"><span class="learn-key">Server: <span class="t-danger">${d.server_leak}</span></span>❌ <strong>Version disclosed.</strong> Attackers search this exact version on NVD/Exploit-DB in seconds. <strong>Fix:</strong> for nginx: <code>server_tokens off;</code> in nginx.conf. For Apache: <code>ServerTokens Prod</code> in httpd.conf.</div>`;
  if (d.tech_leak)   html += `<div class="learn-line"><span class="learn-key">X-Powered-By: <span class="t-danger">${d.tech_leak}</span></span>❌ Reveals backend framework. Remove this to deny attackers a free stack fingerprint. For Express.js: <code>app.disable('x-powered-by')</code>.</div>`;

  const headerExplanations = {
    'Content-Security-Policy': {
      miss: '❌ <strong>CRITICAL.</strong> Without CSP, any injected <code>&lt;script&gt;</code> runs freely — enabling XSS. Minimal fix: <code>Content-Security-Policy: default-src \'self\'</code>',
      hit:  '✅ CSP is active. Review the policy for overly-permissive <code>unsafe-inline</code> or <code>*</code> sources that weaken it.'
    },
    'X-Frame-Options': {
      miss: '❌ Missing — page can be embedded in an iframe on any domain. Enables <strong>Clickjacking</strong>: users click hidden buttons without knowing.',
      hit:  '✅ Clickjacking protection active — page cannot be framed by external domains.'
    },
    'Strict-Transport-Security': {
      miss: '❌ Missing HSTS — browser may connect via HTTP on first visit. Enables SSL stripping attacks.',
      hit:  '✅ HSTS active — browser only connects via HTTPS, even if the user types http://.'
    },
    'X-Content-Type-Options': {
      miss: '⚠️ Missing — browsers may MIME-sniff content and run a mis-labeled file as JavaScript.',
      hit:  '✅ MIME sniffing disabled. Browsers respect declared Content-Type.'
    },
    'Referrer-Policy': {
      miss: '⚠️ Missing — full URL is sent in the Referer header to external sites, potentially leaking sensitive URL parameters.',
      hit:  '✅ Referrer policy active — controls how much referrer info leaks to third-party sites.'
    },
    'Permissions-Policy': {
      miss: '⚠️ Missing — browser features (camera, microphone, geolocation) are not restricted for this domain.',
      hit:  '✅ Permissions Policy active — browser feature access is restricted.'
    }
  };

  Object.entries(sh).forEach(([header, info]) => {
    const exp = headerExplanations[header];
    if (!exp) {
      html += `<div class="learn-line"><span class="learn-key">${header}: <span class="${info.status==='Present'?'t-success':'t-danger'}">${info.status}</span></span>${info.value ? `Value: <code>${info.value.slice(0,100)}</code>` : ''}</div>`;
    } else {
      html += `<div class="learn-line"><span class="learn-key">${header}: <span class="${info.status==='Present'?'t-success':'t-danger'}">${info.status}</span></span>${info.status==='Present' ? exp.hit + (info.value ? `<br>Value: <code>${info.value.slice(0,100)}</code>` : '') : exp.miss}</div>`;
    }
  });

  const score = d.security_score;
  html += `<div class="learn-line"><span class="learn-key">Security Score: <span class="${score>=80?'t-success':score>=50?'t-warn':'t-danger'}">${score}/100</span></span>Score is calculated from presence/absence of security headers and absence of info-disclosing headers. Score 90+ = production-ready. Score below 60 = multiple critical risks present.</div>`;
  return html;
}

// ═══════════════════════════════════════════════════════
//  TOOL 4 — IP GEOLOCATION → /api/geoip
// ═══════════════════════════════════════════════════════
async function runGeoIP() {
  const target = document.getElementById('input-geo').value.trim() || '8.8.8.8';
  showLoading('term-4', `geolocating ${target}`);

  try {
    const d = await callAPI(`${API_BASE}/api/geoip?target=${encodeURIComponent(target)}`);
    console.log('[CybeRECON] /api/geoip response:', d);

    if (d.error) {
      printTerminal('term-4', [comment(`GEOIP: ${target}`), err(d.error)]);
      speak(`Geolocation error: ${d.error}`);
      return;
    }

    const lines = [comment(`IP ORIGIN TRACE: ${target}`)];
    if (d.resolved_from && d.resolved_from !== d.ip) lines.push(line('Resolved', `${d.resolved_from} → ${d.ip}`, 'val'));
    lines.push(line('IP Address',  d.ip, 'val'));
    lines.push(line('Country',     `${d.country} (${d.country_code})`, 'val'));
    lines.push(line('Region',      d.region, 'val'));
    lines.push(line('City',        d.city, 'val'));
    lines.push(line('Postal',      d.postal || 'N/A', 'val'));
    lines.push(line('Coordinates', `${d.latitude}°N, ${d.longitude}°E`, 'val'));
    lines.push(line('Timezone',    `${d.timezone} (UTC${d.utc_offset || ''})`, 'val'));
    lines.push(line('ISP / Org',   d.isp || 'Unknown', 'warn'));
    lines.push(line('ASN',         d.asn || 'Unknown', 'val'));
    lines.push(line('Currency',    d.currency || 'N/A', 'val'));
    lines.push(comment('LOCATION RESOLVED'));

    printTerminal('term-4', lines, () => {
      document.getElementById('learn4').innerHTML = buildGeoLearn(d, target);
      speak(`IP ${d.ip} resolves to ${d.city}, ${d.country}. ISP: ${d.isp}. ASN: ${d.asn}. Check LEARN for investigator context. Moving to WHOIS Intelligence in Tool 5.`);
      unlockTool(5);
    });

  } catch(e) {
    printTerminal('term-4', [comment(`GEOIP: ${target}`), err('Backend offline. Run python app.py — ' + e.message)]);
    speak('Backend server is not running. Start it with python app.py');
  }
}

function buildGeoLearn(d, target) {
  return `
    <div class="learn-line"><span class="learn-key">IP: ${d.ip}</span>${d.resolved_from && d.resolved_from !== d.ip ? `Resolved from hostname <strong>${d.resolved_from}</strong>. ` : ''}Every internet-connected device has an IP address. This is the public-facing IP of the target.${d.asn ? ` Lookup <strong>${d.asn}</strong> on bgpview.io to see the full network block owned by this ASN.` : ''}</div>
    <div class="learn-line"><span class="learn-key">Location: ${d.city}, ${d.region}, ${d.country}</span>City-level geolocation only — not a street address. For VPNs and Tor nodes, this is the <strong>exit point</strong>, not the attacker's actual location. Cross-reference with corporate registration records to detect discrepancies.</div>
    <div class="learn-line"><span class="learn-key">ISP/Org: ${d.isp || 'Unknown'}</span>The internet provider or organization owning this IP block. Common red flags: hosting providers (OVH, Hetzner, DigitalOcean) used for C2; known Tor/VPN operators; ASNs with poor abuse-report track records.</div>
    <div class="learn-line"><span class="learn-key">ASN: ${d.asn || 'Unknown'}</span>Autonomous System Number — identifies the network block owner. SOC teams block entire ASNs during APT campaigns. You can look up any ASN's full IP range on <code>bgpview.io</code> or <code>RIPE NCC</code> to see all IPs in that block.</div>
    <div class="learn-line"><span class="learn-key">Coordinates: ${d.latitude}°, ${d.longitude}°</span>IP geolocation resolves to city-level at best (~25km radius). Use for datacenter identification only. Never use for precise physical tracking — that requires legal process and ISP cooperation.</div>
  `;
}

// ═══════════════════════════════════════════════════════
//  TOOL 5 — WHOIS INTELLIGENCE → /api/whois
// ═══════════════════════════════════════════════════════
async function runWHOIS() {
  const domain = (document.getElementById('input-whois').value.trim() || 'example.com').replace(/^https?:\/\//,'').split('/')[0];
  showLoading('term-5', `whois records for ${domain}`);

  try {
    const d = await callAPI(`${API_BASE}/api/whois?domain=${encodeURIComponent(domain)}`);
    console.log('[CybeRECON] /api/whois response:', d);

    if (d.error) {
      printTerminal('term-5', [comment(`WHOIS: ${domain}`), err(d.error)]);
      speak(`WHOIS error: ${d.error}`);
      return;
    }

    const riskColor = {'CRITICAL':'danger','HIGH':'danger','MEDIUM':'warn','LOW':'success'}[d.risk_level] || 'val';
    const lines = [comment(`WHOIS INTELLIGENCE: ${domain}`)];
    lines.push(line('Domain',          String(d.domain || domain).toLowerCase(), 'val'));
    lines.push(line('Registrar',       d.registrar || 'Unknown', 'val'));
    lines.push(line('Org',             d.org || 'Hidden', 'val'));
    lines.push(line('Country',         d.country || 'Unknown', 'val'));
    lines.push(line('Created',         d.creation_date || 'Unknown', 'val'));
    lines.push(line('Updated',         d.updated_date || 'Unknown', 'val'));
    lines.push(line('Expires',         d.expiry_date || 'Unknown', 'val'));
    lines.push(line('Domain Age',      d.domain_age_years != null ? `${d.domain_age_years} years (${d.domain_age_days} days)` : 'Unknown', 'val'));
    lines.push(line('Days to Expiry',  d.days_until_expiry != null ? `${d.days_until_expiry} days` : 'Unknown', d.days_until_expiry < 30 ? 'warn' : 'val'));
    if (d.nameservers && d.nameservers.length) lines.push(line('Nameservers', d.nameservers.slice(0,3).join(', '), 'val'));
    if (d.emails) lines.push(line('Emails',       Array.isArray(d.emails) ? d.emails.join(', ') : d.emails, 'warn'));
    lines.push(line('Risk Level',      d.risk_level || 'UNKNOWN', riskColor));
    lines.push(comment('WHOIS QUERY COMPLETE'));

    printTerminal('term-5', lines, () => {
      document.getElementById('learn5').innerHTML = buildWHOISLearn(d, domain);
      const ageMsg = d.domain_age_years ? `Domain is ${d.domain_age_years} years old.` : 'Domain age unknown.';
      speak(`${domain} — ${ageMsg} Registrar: ${d.registrar || 'Unknown'}. Risk: ${d.risk_level || 'Unknown'}. ${d.risk_level === 'CRITICAL' || d.risk_level === 'HIGH' ? 'Newly registered domain — high phishing risk!' : 'Established domain with history.'} Proceeding to Tool 6 — Threat Intelligence.`);
      unlockTool(6);
    });

  } catch(e) {
    printTerminal('term-5', [comment('WHOIS'), err('Backend offline: ' + e.message)]);
    speak('Cannot reach backend server. Start it with python app.py');
  }
}

function buildWHOISLearn(d, domain) {
  const riskExpl = {
    'CRITICAL': '❌ Domain is less than 30 days old — extremely high phishing risk. Legitimate businesses have years of history. Fresh domains evade blocklists.',
    'HIGH':     '⚠️ Domain is less than 1 year old — treat with caution. Phishing and malware domains often have short lifespans.',
    'MEDIUM':   '🔶 Domain is 1–5 years old. Established but relatively young. Verify with additional threat intelligence.',
    'LOW':      '✅ Domain has 5+ years of registration history. Established and likely legitimate.',
  }[d.risk_level] || '';
  return `
    <div class="learn-line"><span class="learn-key">Registrar: ${d.registrar || 'Unknown'}</span>The company through which the domain was purchased. Attackers prefer fast/cheap registrars with minimal identity verification and slow abuse response. Cross-reference the registrar against known phishing registrar lists.</div>
    <div class="learn-line"><span class="learn-key">Creation Date: ${d.creation_date}</span>${riskExpl} Domain age is the single most reliable phishing indicator — less than 30 days means treat as suspicious until proven otherwise.</div>
    <div class="learn-line"><span class="learn-key">Domain Age: ${d.domain_age_years != null ? d.domain_age_years + ' years' : 'Unknown'}</span>${d.domain_age_days != null ? `${d.domain_age_days} days since registration. ` : ''}Attackers use freshly registered domains to avoid reputation-based blocklists. Phishing kits are typically abandoned within 30–90 days.</div>
    <div class="learn-line"><span class="learn-key">Days to Expiry: ${d.days_until_expiry != null ? d.days_until_expiry : 'Unknown'}</span>${d.days_until_expiry < 30 ? '⚠️ Expiring soon — monitor for domain hijacking attempts.' : 'Registration is current.'} 1-year minimum registrations are more common on throwaway phishing domains vs. 5–10 year registrations on legitimate businesses.</div>
    ${d.nameservers && d.nameservers.length ? `<div class="learn-line"><span class="learn-key">Nameservers: ${d.nameservers.slice(0,2).join(', ')}</span>DNS servers that resolve this domain. Default registrar nameservers (no custom setup) suggest a minimal/throwaway configuration. Corporate domains typically use Cloudflare, AWS Route53, or custom NS.</div>` : ''}
    <div class="learn-line"><span class="learn-key">Risk Level: ${d.risk_level || 'Unknown'}</span>${riskExpl || 'Risk is calculated from domain age and registration history.'} Always combine WHOIS analysis with IP Geolocation and Threat Intel for a complete picture.</div>
  `;
}

// ═══════════════════════════════════════════════════════
//  TOOL 6 — THREAT INTELLIGENCE → /api/threat
// ═══════════════════════════════════════════════════════
async function runThreatIntel() {
  const target = document.getElementById('input-threat').value.trim() || '8.8.8.8';
  showLoading('term-6', `threat intel for ${target}`);

  try {
    const d = await callAPI(`${API_BASE}/api/threat?target=${encodeURIComponent(target)}`);
    console.log('[CybeRECON] /api/threat response:', d);

    if (d.setup_required) {
      printTerminal('term-6', [
        comment('THREAT INTELLIGENCE — SETUP REQUIRED'),
        `${C('AbuseIPDB API key not configured.','warn')}`,
        `${C('Get a FREE key at: https://www.abuseipdb.com/register','val')}`,
        `${C('Then open app.py and set ABUSEIPDB_API_KEY = "your-key-here"','val')}`,
        `${C('Restart the Flask server and try again.','success')}`,
      ]);
      speak('The Threat Intelligence tool needs an AbuseIPDB API key. Get a free one at abuseipdb.com and add it to app.py. Instructions are shown in the terminal.');
      return;
    }
    if (d.error) {
      printTerminal('term-6', [comment('THREAT INTEL'), err(d.error)]);
      speak('Threat intel error: ' + d.error);
      return;
    }

    const vColor = {'CLEAN':'success','LOW RISK':'warn','SUSPICIOUS':'warn','MALICIOUS':'danger'}[d.verdict] || 'val';
    const scoreColor = d.abuse_score > 75 ? 'danger' : d.abuse_score > 25 ? 'warn' : 'success';

    const lines = [comment(`THREAT CORRELATION: ${d.ip || target}`)];
    if (d.resolved_ip) lines.push(line('Resolved IP',       d.resolved_ip, 'val'));
    lines.push(line('IP',               d.ip || target, 'val'));
    lines.push(line('AbuseIPDB Score',  `${d.abuse_score}%`, scoreColor));
    lines.push(line('Total Reports',    `${d.total_reports || 0} (by ${d.distinct_reporters || 0} distinct reporters)`, d.total_reports > 0 ? 'warn' : 'success'));
    lines.push(line('Country',          d.country || 'Unknown', 'val'));
    lines.push(line('ISP',              d.isp || 'Unknown', 'val'));
    lines.push(line('Domain',           d.domain || 'None', 'val'));
    lines.push(line('Usage Type',       d.usage_type || 'Unknown', 'val'));
    lines.push(line('Last Reported',    d.last_reported || 'Never', 'val'));
    if (d.hostnames && d.hostnames.length) lines.push(line('Hostnames', d.hostnames.slice(0,3).join(', '), 'val'));
    lines.push(line('Verdict',          d.verdict || 'UNKNOWN', vColor));
    lines.push(comment(`THREAT ANALYSIS COMPLETE — ${d.verdict}`));

    printTerminal('term-6', lines, () => {
      document.getElementById('learn6').innerHTML = buildThreatLearn(d, target);
      speak(`${d.ip || target} — AbuseIPDB score: ${d.abuse_score}%. Total reports: ${d.total_reports || 0}. Verdict: ${d.verdict}. ${d.verdict === 'MALICIOUS' ? 'Block this IP at the firewall immediately!' : d.verdict === 'SUSPICIOUS' ? 'Flag for monitoring.' : 'No significant threats found.'} Check the LEARN tab for full context. Recon complete.`);
    });

  } catch(e) {
    printTerminal('term-6', [comment('THREAT INTEL'), err('Backend offline: ' + e.message)]);
    speak('Cannot reach backend server. Start it with python app.py');
  }
}

function buildThreatLearn(d, target) {
  const vDesc = {'CLEAN':'No abuse reports. This IP is not currently flagged in any threat database.','LOW RISK':'A small number of reports. Monitor but do not outright block.','SUSPICIOUS':'Moderate abuse score. Flag for investigation and consider rate-limiting.','MALICIOUS':'Block this IP at the WAF and firewall immediately. High confidence of active malicious activity.'}[d.verdict] || '';
  return `
    <div class="learn-line"><span class="learn-key">AbuseIPDB Score: ${d.abuse_score}%</span>AbuseIPDB aggregates crowd-sourced reports from security teams globally. A 99% score means hundreds of independent sources reported this IP recently. <strong>0–25%:</strong> Clean/Low. <strong>25–75%:</strong> Suspicious. <strong>75–100%:</strong> Block immediately.</div>
    <div class="learn-line"><span class="learn-key">Total Reports: ${d.total_reports}</span>${d.distinct_reporters} distinct organizations reported this IP. High report counts in a short time window indicate automated attack campaigns — port scanning, brute-forcing, or DDoS participation from a botnet node.</div>
    <div class="learn-line"><span class="learn-key">ISP: ${d.isp || 'Unknown'}</span>The internet provider for this IP. Hosting providers (OVH, Hetzner, DigitalOcean, Vultr) are commonly used by threat actors for disposable C2 infrastructure because they offer easy anonymous registration and fast spin-up.</div>
    <div class="learn-line"><span class="learn-key">Usage Type: ${d.usage_type || 'Unknown'}</span>Classifies the IP as: Data Center/Web Hosting, ISP, Business, or Educational. Data center IPs with high abuse scores almost always indicate attack infrastructure rather than legitimate business use.</div>
    <div class="learn-line"><span class="learn-key">Verdict: ${d.verdict}</span>${vDesc} <strong>Recommended actions:</strong>${d.verdict==='MALICIOUS'||d.verdict==='SUSPICIOUS'?'<br>• Add to WAF IP blocklist<br>• Search access logs for past requests from this IP<br>• Alert your SOC team<br>• Correlate with other threat feeds (Shodan, GreyNoise, AlienVault OTX)':'<br>• Continue monitoring<br>• No immediate action required'}</div>
  `;
}

// ═══════════════════════════════════════════════════════
//  TOOL 7 — DNS RECON → /api/dns
// ═══════════════════════════════════════════════════════
async function runDNS() {
  const domain = (document.getElementById('input-dns').value.trim() || 'example.com').replace(/^https?:\/\//,'').split('/')[0];
  showLoading('term-7', `dns records for ${domain}`);

  try {
    const d = await callAPI(`${API_BASE}/api/dns?domain=${encodeURIComponent(domain)}`);
    console.log('[CybeRECON] /api/dns response:', d);

    if (d.error) {
      printTerminal('term-7', [comment(`DNS RECON: ${domain}`), err(d.error)]);
      speak('DNS error: ' + d.error);
      return;
    }

    const lines = [comment(`DNS RECONNAISSANCE: ${domain}`)];
    const rtypes = ['A','AAAA','CNAME','MX','NS','TXT','SOA','PTR','CAA'];
    let totalRecords = 0;

    rtypes.forEach(type => {
      const records = d[type];
      if (records && records.length) {
        totalRecords += records.length;
        records.forEach((r, i) => {
          lines.push(`${C(type.padEnd(6),'key')} ${C(i===0 ? `[${records.length}]` : '   ','comment')} ${C(r,'val')}`);
        });
      } else {
        lines.push(`${C(type.padEnd(6),'key')} ${C('[0]','comment')} ${C('No records found','comment')}`);
      }
    });

    lines.push(comment(`DNS SCAN COMPLETE — ${totalRecords} RECORDS FOUND`));

    printTerminal('term-7', lines, () => {
      document.getElementById('learn7').innerHTML = buildDNSLearn(d, domain);
      const aRec = d.A && d.A.length ? d.A[0] : 'unknown';
      speak(`DNS recon on ${domain} complete. ${d.A && d.A.length ? `${d.A.length} A record(s) found, primary IP: ${aRec}.` : 'No A records found.'} ${d.MX && d.MX.length ? d.MX.length + ' mail server(s) found.' : ''} ${d.TXT && d.TXT.length ? 'TXT records reveal SPF/DMARC policies.' : ''} Check LEARN for the full breakdown.`);
    });

  } catch(e) {
    printTerminal('term-7', [comment('DNS RECON'), err('Backend offline: ' + e.message)]);
    speak('Cannot reach backend server. Start it with python app.py');
  }
}

function buildDNSLearn(d, domain) {
  let html = '';
  if (d.A && d.A.length) html += `<div class="learn-line"><span class="learn-key">A Records: ${d.A.join(', ')}</span>IPv4 address(es) the domain resolves to. Multiple A records indicate load balancing. Use these IPs with the <strong>IP Geolocation tool</strong> to find the hosting provider. Attackers note multiple A records for redundancy analysis.</div>`;
  if (d.AAAA && d.AAAA.length) html += `<div class="learn-line"><span class="learn-key">AAAA Records (IPv6)</span>IPv6 addresses. Some organizations expose IPv6 endpoints that bypass IPv4-only firewall rules — a recon opportunity.</div>`;
  if (d.MX && d.MX.length) html += `<div class="learn-line"><span class="learn-key">MX Records: Mail Servers</span>Mail exchange servers: <strong>${d.MX.slice(0,2).join(', ')}</strong>. MX records reveal the email infrastructure. Google Workspace = <code>aspmx.l.google.com</code>, Microsoft 365 = <code>*.mail.protection.outlook.com</code>. Knowing the mail provider helps craft targeted phishing bypasses.</div>`;
  if (d.NS && d.NS.length) html += `<div class="learn-line"><span class="learn-key">NS Records: Nameservers</span>${d.NS.slice(0,3).join(', ')} — DNS nameservers authoritative for this domain. DNS propagation attacks (DNS hijacking) target the registrar to change NS records and redirect all traffic.</div>`;
  if (d.TXT && d.TXT.length) html += `<div class="learn-line"><span class="learn-key">TXT Records: ${d.TXT.length} found</span>TXT records contain SPF (anti-spoofing), DMARC (phishing policy), DKIM keys, and domain verification tokens for Google/GitHub/AWS. <strong>No SPF record</strong> = anyone can send email appearing to be from this domain (spoofing). Look for: <code>v=spf1</code>, <code>v=DMARC1</code>.</div>`;
  if (d.SOA && d.SOA.length) html += `<div class="learn-line"><span class="learn-key">SOA Record</span>Start of Authority — defines the primary nameserver and administrator email (encoded). The serial number reveals when the DNS zone was last updated. Zone transfers (AXFR) from the SOA server can dump the entire DNS zone if misconfigured.</div>`;
  if (d.CAA && d.CAA.length) html += `<div class="learn-line"><span class="learn-key">CAA Records</span>Certificate Authority Authorization — specifies which CAs are allowed to issue SSL certs for this domain. Without CAA, any CA can issue a cert. This is a critical control against rogue certificate issuance.</div>`;
  if (!html) html = '<div class="learn-line"><span class="t-warn">Run a DNS scan first to see output-specific explanations.</span></div>';
  return html;
}
