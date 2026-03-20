/* ═══════════════════════════════════════════════
   CYBERRECON ACADEMY — script.js
═══════════════════════════════════════════════ */

// ─── BACKGROUND FX ──────────────────────────────
(function initMatrix() {
  const canvas = document.getElementById('matrixCanvas');
  const ctx = canvas.getContext('2d');
  let cols, drops;
  const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%&';
  
  function resize() {
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    cols = Math.floor(canvas.width / 14); drops = new Array(cols).fill(1);
  }
  
  function draw() {
    ctx.fillStyle = 'rgba(2, 8, 16, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drops.forEach((y, i) => {
      const char = chars[Math.floor(Math.random() * chars.length)];
      ctx.fillStyle = Math.random() > 0.97 ? '#ffffff' : (i % 3 === 0 ? '#00f5ff' : '#00ff88');
      ctx.font = '14px "Share Tech Mono"';
      ctx.fillText(char, i * 14, y * 14);
      if (y * 14 > canvas.height && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    });
  }
  resize(); window.addEventListener('resize', resize); setInterval(draw, 50);
})();

(function initParticles() {
  const corner = document.getElementById('particleCorner');
  const colors = ['#00f5ff', '#00ff88', '#bf00ff', '#ffee00', '#ff003c'];
  function burst() {
    for (let i = 0; i < 12; i++) {
      const p = document.createElement('div'); p.className = 'particle';
      const angle = Math.random() * Math.PI * 2; const dist = 30 + Math.random() * 60;
      const col = colors[Math.floor(Math.random() * colors.length)];
      p.style.cssText = `width:5px;height:5px;background:${col};box-shadow:0 0 6px ${col};left:50%;top:50%;--tx:${Math.cos(angle)*dist}px;--ty:${Math.sin(angle)*dist}px;animation-duration:${0.8+Math.random()*0.8}s;`;
      corner.appendChild(p); setTimeout(() => p.remove(), 1600);
    }
  }
  burst(); setInterval(burst, 3500);
})();

// ─── Lilith AI INSTRUCTOR LOGIC ─────────────────────
const uiState = { currentTool: 1 };
const mouthBars = document.querySelectorAll('.mouth-bar');
const bubbleMsg = document.getElementById('ariaMessage');

// ─── Skip / Advance State ────────────────────────────
let isTyping = false;
let _typingTimer = null;
let _skipFn = null;   // call this to instantly finish current speech
let _nextFn = null;   // call this to advance to next queued line

function speak(text, callback) {
  // Cancel any previous typing timer (safety)
  if (_typingTimer) { clearTimeout(_typingTimer); _typingTimer = null; }

  isTyping = true;
  bubbleMsg.textContent = '';
  mouthBars.forEach(b => b.classList.add('talking'));

  let i = 0;
  const speed = 30;

  function done() {
    _typingTimer = null;
    isTyping = false;
    _skipFn = null;
    mouthBars.forEach(b => b.classList.remove('talking'));
    if (callback) callback();
  }

  // Set _skipFn BEFORE starting type() — no null-window bug
  _skipFn = function() {
    if (_typingTimer) { clearTimeout(_typingTimer); _typingTimer = null; }
    bubbleMsg.textContent = text;   // show full sentence instantly
    done();
  };

  function type() {
    if (i < text.length) {
      bubbleMsg.textContent += text.charAt(i++);
      _typingTimer = setTimeout(type, speed);
    } else {
      done();
    }
  }
  type();
}

// Double-click handler — works in both states
window.handleAvatarDblClick = function() {
  if (isTyping && _skipFn) {
    // While typing: complete current sentence, stop. Wait for next dblclick.
    const fn = _skipFn;
    _skipFn = null;
    fn();
  } else if (!isTyping && _nextFn) {
    // Between lines: jump to next line immediately
    const fn = _nextFn;
    _nextFn = null;
    fn();
  }
};

// Global document listener — dblclick ANYWHERE works (not just on the card)
document.addEventListener('dblclick', function(e) {
  e.preventDefault();
  handleAvatarDblClick();
});

// ─── INTRO SEQUENCE (queue-based, double-click to advance) ───
const INTRO_LINES = [
  "Hello, Operative. I am Lilith — your AI instructor at cybeRECON Academy.",
  "This platform teaches real-world OSINT, network recon, and threat intelligence.",
  "Golden rule: only scan systems you own or have explicit written permission to test.",
  "Let's begin. Paste any URL into Tool 1 below and I'll walk you through it.",
];

let introIndex = 0;

function runNextIntroLine() {
  if (introIndex >= INTRO_LINES.length) {
    _nextFn = null;
    moveToSidebar();
    return;
  }
  const text = INTRO_LINES[introIndex++];
  speak(text, () => {
    if (introIndex < INTRO_LINES.length) {
      // Between lines: 2.5s auto OR instant on dblclick
      const auto = setTimeout(() => { _nextFn = null; runNextIntroLine(); }, 2500);
      _nextFn = () => { clearTimeout(auto); runNextIntroLine(); };
    } else {
      // After last line: 2s auto OR instant dblclick → move to sidebar
      const auto = setTimeout(() => { _nextFn = null; moveToSidebar(); }, 2000);
      _nextFn = () => { clearTimeout(auto); moveToSidebar(); };
    }
  });
}

window.addEventListener('DOMContentLoaded', () => {
  setTimeout(runNextIntroLine, 800);
  // Unlock all tools immediately — no sequential gating
  [2, 3, 4, 5, 6, 7].forEach(id => unlockTool(id));
});


function moveToSidebar() {
  const floatContainer = document.getElementById('ariaFloatingContainer');
  const ph = document.getElementById('ariaPlaceholder');
  document.body.classList.remove('intro-active');
  
  // Prep elements for transit
  const rect = floatContainer.getBoundingClientRect();
  floatContainer.classList.remove('aria-intro-mode');
  
  // Set explicit absolute coords to replace fixed transform
  floatContainer.style.position = 'fixed';
  floatContainer.style.top = rect.top + 'px';
  floatContainer.style.left = rect.left + 'px';
  floatContainer.style.transform = 'translate(0, 0) scale(1.4)';
  floatContainer.style.transition = 'all 1s cubic-bezier(0.25, 1, 0.5, 1)';
  
  void floatContainer.offsetWidth; // force reflow
  
  // Go to placeholder coords
  const targetRect = ph.getBoundingClientRect();
  floatContainer.style.top = targetRect.top + 'px';
  floatContainer.style.left = targetRect.left + 'px';
  floatContainer.style.transform = 'translate(0, 0) scale(1)';
  
  setTimeout(() => {
    floatContainer.style.position = 'relative';
    floatContainer.style.top = '0';
    floatContainer.style.left = '0';
    floatContainer.style.transition = 'none';
    ph.appendChild(floatContainer);
  }, 1000);
}

// ─── TABS & TOOLS INTERACTION ────────────────────
window.switchTab = function(toolId, tabName) {
  const card = document.getElementById('tool-' + toolId);
  card.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  card.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  if(tabName === 'scan') {
    card.querySelectorAll('.tab-btn')[0].classList.add('active');
    card.querySelector('.scan-tab').classList.add('active');
  } else {
    card.querySelectorAll('.tab-btn')[1].classList.add('active');
    card.querySelector('.learn-tab').classList.add('active');
  }
};

function unlockTool(id) {
  const nextTarget = document.getElementById('tool-' + id);
  if(nextTarget) nextTarget.classList.add('unlocked');
  
  const btn = document.querySelectorAll('.lesson-btn')[id-1];
  if(btn) btn.classList.remove('locked');
}

function printTerminal(termElementId, linesArray, onComplete) {
  const term = document.getElementById(termElementId);
  term.innerHTML = '';
  let i = 0;
  function printNext() {
    if(i < linesArray.length) {
      const sp = document.createElement('span');
      sp.className = 't-line';
      sp.innerHTML = linesArray[i];
      term.appendChild(sp);
      i++;
      setTimeout(printNext, 120 + Math.random() * 100);
    } else {
      if(onComplete) onComplete();
    }
  }
  printNext();
}

window.runTool = function(toolId) {
  let inputVal = '';
  let output = [];
  
  if(toolId === 1) { // URL Inspector
    inputVal = document.getElementById('input-url').value || 'https://target-corp.io/api?id=1';
    try {
      const u = new URL(inputVal.startsWith('http') ? inputVal : 'https://' + inputVal);
      output.push(`<span class="t-comment">## URL DECOMPOSITION: ${u.href} ##</span>`);
      output.push(`<span class="t-key">Protocol:</span> <span class="${u.protocol==='https:'?'t-success':'t-danger'}">${u.protocol.replace(':','').toUpperCase()} ${u.protocol==='https:'?'[SECURE]':'[RISK]'}</span>`);
      output.push(`<span class="t-key">Domain:</span> <span class="t-val">${u.hostname}</span>`);
      if(u.port) output.push(`<span class="t-key">Port:</span> <span class="t-val">${u.port}</span>`);
      output.push(`<span class="t-key">Path:</span> <span class="t-val">${u.pathname}</span>`);
      
      let params = new URLSearchParams(u.search);
      let paramArr = Array.from(params.entries());
      if(paramArr.length > 0) {
        output.push(`<span class="t-key">Params Found:</span> <span class="t-val">${paramArr.length}</span>`);
        paramArr.forEach(([k,v]) => {
          const risk = (['id','admin','query','user','token','auth'].some(r=>k.toLowerCase().includes(r))) ? 't-danger' : 't-warn';
          output.push(`&nbsp;&nbsp;<span class="t-comment">-></span> <span class="t-key">${k}</span> = <span class="${risk}">${v}</span>`);
        });
      } else {
        output.push(`<span class="t-key">Params:</span> <span class="t-success">None</span>`);
      }
      if(u.hash) output.push(`<span class="t-key">Fragment:</span> <span class="t-val">${u.hash}</span>`);
      
      printTerminal('term-1', output, () => {
        speak(`Notice the components. Any unsecured HTTP protocols or explicit parameters are potential injection vectors. Great job! Now let's move to Tool 2 and check SSL.`);
        unlockTool(2);
      });
    } catch(e) {
      printTerminal('term-1', [`<span class="t-danger">[!] ERROR: Invalid URL format.</span>`]);
      speak("Invalid target URL. Check your syntax and try again.");
    }
  }
  
  else if(toolId === 2) { // SSL Inspector
    inputVal = document.getElementById('input-ssl').value || 'target-corp.io';
    const domain = inputVal.replace(/^https?:\/\//, '').split('/')[0];
    
    output = [
      `<span class="t-comment">## PROBING CERTIFICATE CHAIN: ${domain}:443 ##</span>`,
      `<span class="t-key">Status:</span> <span class="t-success">Valid</span>`,
      `<span class="t-key">Issuer/CA:</span> <span class="t-val">Let's Encrypt R3</span>`,
      `<span class="t-key">Protocol:</span> <span class="t-success">TLSv1.3</span>`,
      `<span class="t-key">Cipher:</span> <span class="t-val">TLS_AES_256_GCM_SHA384</span>`,
      `<span class="t-key">Expiry:</span> <span class="t-warn">87 days remaining</span>`,
      `<span class="t-key">HSTS Policy:</span> <span class="t-success">Enabled (max-age=31536000)</span>`,
      `<span class="t-key">Security Grade:</span> <span class="t-success">A+</span>`,
      `<span class="t-comment">## SCAN COMPLETE ##</span>`
    ];
    
    printTerminal('term-2', output, () => {
      speak(`Excellent. The certificate is issued by Let's Encrypt and uses TLS 1.3. A solid Grade A+. Let's inspect the HTTP Response Headers next in Tool 3.`);
      unlockTool(3);
    });
  }
  
  else if(toolId === 3) { // HTTP Headers
    inputVal = document.getElementById('input-http').value || 'https://target-corp.io';
    output = [
      `<span class="t-comment">## FETCHING HTTP HEADERS ##</span>`,
      `<span class="t-key">Server:</span> <span class="t-danger">nginx/1.18.0 ⚠ (Version Exposed)</span>`,
      `<span class="t-key">X-Powered-By:</span> <span class="t-danger">Express ⚠ (Framework Leaked)</span>`,
      `<span class="t-key">Content-Type:</span> <span class="t-val">application/json; charset=utf-8</span>`,
      `<span class="t-key">Strict-Transport-Security:</span> <span class="t-success">max-age=31536000; includeSubDomains</span>`,
      `<span class="t-key">X-Frame-Options:</span> <span class="t-success">SAMEORIGIN</span>`,
      `<span class="t-key">Content-Security-Policy:</span> <span class="t-danger">MISSING ✗</span>`,
      `<span class="t-key">X-XSS-Protection:</span> <span class="t-warn">0</span>`,
      `<span class="t-comment">## SECURITY SCORE: 65/100 ##</span>`
    ];
    printTerminal('term-3', output, () => {
      speak(`They're leaking their Nginx and Node.js framework versions in the headers! This allows attackers to search for specific CVEs. And they're missing a CSP policy. Next: Geolocation in Tool 4.`);
      unlockTool(4);
    });
  }
  
  else if(toolId === 4) { // IP Geo
    inputVal = document.getElementById('input-geo').value || '185.220.101.47';
    output = [
      `<span class="t-comment">## LOCATING IP ORIGIN: ${inputVal} ##</span>`,
      `<span class="t-key">Country:</span> <span class="t-val">Netherlands 🇳🇱</span>`,
      `<span class="t-key">City:</span> <span class="t-val">Amsterdam</span>`,
      `<span class="t-key">ASN:</span> <span class="t-val">AS204778</span>`,
      `<span class="t-key">ISP:</span> <span class="t-warn">Tor Exit Node Operator</span>`,
      `<span class="t-key">Coords:</span> <span class="t-val">52.3702° N, 4.8952° E</span>`,
      `<span class="t-key">Proxy/VPN:</span> <span class="t-danger">YES - ANONYMIZATION DETECTED</span>`,
    ];
    printTerminal('term-4', output, () => {
      speak(`That IP routes through Amsterdam but is flagged as a Tor Exit Node. The adversary is masking their origin. Time to pivot to the domain's WHOIS data in Tool 5.`);
      unlockTool(5);
    });
  }
  
  else if(toolId === 5) { // WHOIS
    inputVal = document.getElementById('input-whois').value || 'target-corp.io';
    output = [
      `<span class="t-comment">## WHOIS QUERY INTIATED ##</span>`,
      `<span class="t-key">Registrar:</span> <span class="t-val">Namecheap, Inc.</span>`,
      `<span class="t-key">Created:</span> <span class="t-val">2024-03-12</span> <span class="t-danger">⚠ (Newly Registered Domain)</span>`,
      `<span class="t-key">Expires:</span> <span class="t-warn">2025-03-12 (1 year lifecycle)</span>`,
      `<span class="t-key">Name Servers:</span> <span class="t-val">dns1.registrar-servers.com, dns2.registrar-servers.com</span>`,
      `<span class="t-key">Privacy:</span> <span class="t-warn">WhoisGuard Protected</span>`,
      `<span class="t-comment">## DOMAIN AGE: 2 Days. HIGH RISK PISHING DOMAIN ##</span>`
    ];
    printTerminal('term-5', output, () => {
      speak(`Aha! The domain is only 2 days old and registered through Namecheap with privacy protection. Classic burner domain for phishing. Let's finish up in Tool 6: Threat Intel.`);
      unlockTool(6);
      document.querySelectorAll('.lesson-btn')[3].classList.remove('locked'); // Unlocks Dark Web UI indicator
    });
  }
  
  else if(toolId === 6) { // Threat Intel
    inputVal = document.getElementById('input-threat').value || '185.220.101.47';
    output = [
      `<span class="t-comment">## QUERYING GLOBAL THREAT FEEDS ##</span>`,
      `<span class="t-key">IOC:</span> <span class="t-val">${inputVal}</span>`,
      `<span class="t-key">AbuseIPDB Score:</span> <span class="t-danger">99% Confidence (BLACKLISTED)</span>`,
      `<span class="t-key">VirusTotal:</span> <span class="t-danger">48/94 Engines Flagged Malicious</span>`,
      `<span class="t-key">Recent Reports:</span> <span class="t-val">3,492 in last 24h</span>`,
      `<span class="t-key">Categories:</span> <span class="t-danger">DDoS, SSH Brute-Force, Web App Attack</span>`,
      `<span class="t-key">Attributed Campaign:</span> <span class="t-warn">Cobalt Mirage (Suspected)</span>`,
      `<span class="t-comment">## INCIDENT RESOLVED: ATTACK VECTOR IDENTIFIED ##</span>`
    ];
    printTerminal('term-6', output, () => {
      speak(`Threat flagged across 48 engines. We have our adversary profile. You've completed the Reconnaissance module. Excellent work, Operative.`);
    });
  }
};

// ─── MODAL SYSTEM ────────────────────────────────

const modalData = {
  missions: {
    html: `
      <h2>🎯 CYBERRECON ACADEMY MISSIONS</h2>
      <p class="modal-subtitle">// WHY THIS PLATFORM EXISTS</p>
      <p>CyberRecon Academy is a <strong style="color:var(--cyan)">free, open educational platform</strong> to teach the next generation of ethical security researchers the fundamentals of OSINT, network reconnaissance, and digital threat analysis.</p>
      <h3>📋 WHAT YOU WILL LEARN</h3>
      <ul>
        <li>How to deconstruct URLs and identify API attack surfaces</li>
        <li>How to evaluate SSL/TLS certificate security grades</li>
        <li>How to detect dangerous or missing HTTP security headers</li>
        <li>How to geolocate IPs, identify ASNs, and detect VPN/Tor usage</li>
        <li>How to perform WHOIS intelligence to assess domain credibility</li>
        <li>How to query threat intelligence feeds and interpret IOC data</li>
      </ul>
      <h3>⚖️ ETHICS & LEGAL POLICY</h3>
      <div class="ethics-box">
        <p><strong>🔴 CRITICAL WARNING:</strong> All tools on this platform are for <strong>educational and authorized security testing ONLY</strong>. Performing reconnaissance, scanning, or probing any system without explicit written permission from the owner is <strong>illegal</strong> in most jurisdictions including the Computer Fraud and Abuse Act (CFAA) and the UK Computer Misuse Act.</p>
      </div>
      <ul>
        <li>Only use these techniques on systems you own or have written permission to test</li>
        <li>Never use OSINT to harass, stalk, or target individuals</li>
        <li>Always follow responsible disclosure if you discover a real vulnerability</li>
        <li>This platform does not facilitate or endorse any form of illegal hacking</li>
      </ul>
      <h3>🌐 RESPONSIBLE USE</h3>
      <p>CyberRecon Academy prepares you for careers in penetration testing, threat intelligence, SOC analysis, and digital forensics. All workflows simulate tools used by certified professionals (CEH, OSCP, CISSP) in authorized environments only.</p>
      <p style="color:var(--green)">// Stay curious. Stay legal. Protect the digital world.</p>
    `
  },
  recon: {
    html: `
      <h2>🌐 MODULE 1: NETWORK RECONNAISSANCE</h2>
      <p class="modal-subtitle">// BEGINNER — OSINT FOUNDATION</p>
      <p>Network Reconnaissance is the first phase of any security assessment. Before a defender or attacker can act, they must <strong style="color:var(--cyan)">gather intelligence about the target's digital footprint</strong> using only publicly available information.</p>
      <h3>🧠 WHAT IS IT?</h3>
      <p>Passive gathering of data — identifying IP addresses, subdomains, technologies, and web application structure — all without directly touching the target system.</p>
      <h3>🛠️ TECHNIQUES IN THIS MODULE</h3>
      <ul>
        <li><strong style="color:var(--yellow)">URL Inspection:</strong> Decompose URLs to find API versions, path structure, and query parameters vulnerable to injection attacks</li>
        <li><strong style="color:var(--yellow)">DNS Enumeration:</strong> Discover subdomains (mail.target.com, api.target.com) that may have weaker defenses</li>
        <li><strong style="color:var(--yellow)">Banner Grabbing:</strong> Read HTTP headers and service banners to identify software versions and cross-reference with known CVEs</li>
      </ul>
      <div class="ethics-box"><p><strong>🔴 LEGAL NOTE:</strong> Active port scanning against systems you do not own is illegal. Only use these tools in CTF environments, bug bounty programs, or with written authorization.</p></div>
      <p style="color:var(--green)">// Start with Tool 1: URL Inspector on the dashboard →</p>
    `
  },
  'ssl-lesson': {
    html: `
      <h2>🔐 MODULE 2: SSL/TLS SECURITY AUDIT</h2>
      <p class="modal-subtitle">// INTERMEDIATE — TRANSPORT LAYER SECURITY</p>
      <p>TLS (Transport Layer Security) is the cryptographic protocol that secures data between a client and server. Misconfigured SSL/TLS is one of the most common web vulnerabilities.</p>
      <h3>🧠 WHY IT MATTERS</h3>
      <p>Without proper TLS, attackers perform a <strong style="color:var(--red)">Man-in-the-Middle (MITM) attack</strong> — silently intercepting login credentials and session cookies without either party knowing.</p>
      <h3>🔍 WHAT TO LOOK FOR</h3>
      <ul>
        <li><strong style="color:var(--yellow)">TLS Version:</strong> TLS 1.3 required. TLS 1.0/1.1 are deprecated and vulnerable to POODLE and BEAST exploits</li>
        <li><strong style="color:var(--yellow)">Cipher Suite:</strong> Weak ciphers like RC4/DES can be broken in hours with modern hardware</li>
        <li><strong style="color:var(--yellow)">Certificate Expiry:</strong> Expired certs indicate poor security hygiene and are used in phishing</li>
        <li><strong style="color:var(--yellow)">HSTS:</strong> Forced HTTPS — without it, downgrade attacks can force HTTP connections</li>
      </ul>
      <h3>📊 GRADES</h3>
      <ul>
        <li><span style="color:var(--green)">A+ / A:</span> TLS 1.3, strong ciphers, HSTS enabled. Excellent configuration.</li>
        <li><span style="color:var(--yellow)">B:</span> Minor issues. TLS 1.2 only or weak cipher availability.</li>
        <li><span style="color:var(--red)">C / F:</span> Critical risk. Deprecated protocols in active use.</li>
      </ul>
      <p style="color:var(--green)">// Progress to Tool 2: SSL/TLS Inspector →</p>
    `
  },
  osint: {
    html: `
      <h2>📡 MODULE 3: OSINT FUNDAMENTALS</h2>
      <p class="modal-subtitle">// INTERMEDIATE — OPEN-SOURCE INTELLIGENCE</p>
      <p>OSINT (Open-Source Intelligence) is the collection and analysis of <strong style="color:var(--cyan)">publicly available information</strong>. It uses no hacking, no unauthorized access — only legally obtainable data from open sources.</p>
      <h3>🔍 KEY TECHNIQUES</h3>
      <ul>
        <li><strong style="color:var(--yellow)">Passive DNS Recon:</strong> Historical DNS records reveal IP changes, hosting migrations, and abandoned subdomains over time</li>
        <li><strong style="color:var(--yellow)">WHOIS Intelligence:</strong> Domain registration dates, registrars, and nameservers. Newly registered = phishing risk</li>
        <li><strong style="color:var(--yellow)">Certificate Transparency Logs:</strong> Every SSL cert ever issued is public. Goldmine for hidden subdomains of any organization</li>
        <li><strong style="color:var(--yellow)">Google Dorking:</strong> <code>site:</code>, <code>filetype:</code>, <code>inurl:</code> to surface exposed files, admin panels, and sensitive data indexed accidentally</li>
        <li><strong style="color:var(--yellow)">Shodan / Censys:</strong> Search engines for internet-connected IoT. Find misconfigured servers and exposed databases without touching the target</li>
      </ul>
      <h3>🌍 USE CASES</h3>
      <ul>
        <li>Bug bounty reconnaissance</li>
        <li>Threat intelligence and attack attribution</li>
        <li>Journalist investigations</li>
        <li>Law enforcement digital forensics</li>
        <li>Red team pre-engagement profiling</li>
      </ul>
      <div class="ethics-box"><p><strong>🔴 NOTE:</strong> Using OSINT to profile individuals without legitimate purpose may violate GDPR and privacy laws globally. OSINT for stalking or harassment is strictly illegal.</p></div>
      <p style="color:var(--green)">// Progress to Tools 4–6: IP Geo, WHOIS, and Threat Intel →</p>
    `
  },
  darkweb: {
    html: `
      <h2>🖥️ MODULE 4: DARK WEB MAPPING</h2>
      <p class="modal-subtitle">// ADVANCED — THREAT INTELLIGENCE & TOR ANALYSIS</p>
      <p>The dark web is a subset of the internet only accessible via anonymization networks like <strong style="color:var(--cyan)">Tor (The Onion Router)</strong>. It hosts both legitimate privacy tools and illicit marketplaces, forums, and C2 (Command & Control) infrastructure used by threat actors.</p>

      <h3>🧕 HOW TOR WORKS</h3>
      <p>Tor routes traffic through <strong>3 relay nodes</strong> (Guard, Middle, Exit). Each hop only knows the previous and next node — no single node knows both the origin and destination. This creates layered encryption (like an onion), making traffic extremely difficult to trace.</p>
      <ul>
        <li><strong style="color:var(--yellow)">Guard Node:</strong> Knows your real IP but not your destination</li>
        <li><strong style="color:var(--yellow)">Middle Relay:</strong> Knows neither source nor destination</li>
        <li><strong style="color:var(--yellow)">Exit Node:</strong> Knows the destination but not your real IP — this is what IP Geolocation sees</li>
        <li><strong style="color:var(--yellow)">.onion Services:</strong> Hosted inside Tor — their real server IP is completely hidden even from Tor exit nodes</li>
      </ul>

      <h3>🔍 OSINT ON THE DARK WEB</h3>
      <ul>
        <li><strong style="color:var(--yellow)">Paste Site Monitoring:</strong> Threat actors dump stolen credentials on Pastebin, Riseup Pad, and dark web paste sites. Tools like <code>haveibeen pwned</code> scan these for email leaks</li>
        <li><strong style="color:var(--yellow)">Darknet Marketplace Analysis:</strong> Investigators monitor listings for stolen corporate data, API keys, VPN credentials, and zero-day exploits being sold</li>
        <li><strong style="color:var(--yellow)">Forum Threat Tracking:</strong> Forums like Exploit.in and XSS.is are where APT groups recruit, share tools, and coordinate attacks. OSINT analysts monitor for mentions of target organizations</li>
        <li><strong style="color:var(--yellow)">Ransomware Leak Sites:</strong> Most ransomware gangs (LockBit, BlackCat/ALPHV) operate .onion leak sites where they publish stolen data to pressure victims. Investigators monitor these in real time</li>
        <li><strong style="color:var(--yellow)">C2 Infrastructure:</strong> Malware uses .onion domains for Command & Control to prevent law enforcement from seizing servers by tracing IP addresses</li>
      </ul>

      <h3>🛠️ INVESTIGATOR TOOLS</h3>
      <ul>
        <li><code>Ahmia.fi</code> — A surface-web search engine that indexes .onion sites (safe to use from regular browser)</li>
        <li><code>OnionSearch</code> — CLI tool for searching multiple dark web search engines simultaneously</li>
        <li><code>Hunchly</code> — Dark web investigation capture tool used by law enforcement</li>
        <li><code>DarkOwl Vision</code> — Commercial darknet intelligence platform used by enterprise SOC teams</li>
        <li><code>Tor Browser</code> — The only safe way to access .onion services; never use your real browser</li>
      </ul>

      <h3>📊 HOW TO READ A DARK WEB IOC</h3>
      <ul>
        <li>A ransomware group posting your company name on their leak site = confirmed breach, 72-hour disclosure window</li>
        <li>Your organization's credentials appearing on a dark web forum = active credential stuffing risk, rotate all passwords immediately</li>
        <li>A threat actor selling 0-day exploits for your software stack = patch immediately or implement compensating controls</li>
      </ul>

      <div class="ethics-box">
        <p><strong>🔴 CRITICAL LEGAL WARNING:</strong> Accessing the dark web for OSINT must be done with <strong>extreme caution</strong>. While browsing is generally legal, purchasing illegal goods, interacting with malicious actors, or accessing CSAM is <strong>a serious crime</strong> in all jurisdictions. Always operate under legal authorization, use isolated virtual machines, and if working as an analyst, follow your organization's dark web monitoring policy. Never access the dark web from personal devices or corporate networks without proper isolation and approval.</p>
      </div>
      <p style="color:var(--green)">🟢 You have reached the advanced module. Always operate within legal and ethical boundaries. Protect the innocent. Hunt the adversary.</p>
    `
  }
};

window.openModal = function(key) {
  const data = modalData[key];
  if (!data) return;
  document.getElementById('modalInner').innerHTML = data.html;
  const overlay = document.getElementById('modalOverlay');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
};

window.closeModal = function(event, force) {
  if (force || (event && event.target === document.getElementById('modalOverlay'))) {
    document.getElementById('modalOverlay').classList.remove('open');
    document.body.style.overflow = '';
  }
};

window.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal(null, true);
});

console.log('%c[ CYBERRECON ACADEMY v3.2.0 ]', 'color:#00f5ff;font-family:monospace;font-size:14px;');
console.log('%c[ LILITH ONLINE — ALL SYSTEMS GO ]', 'color:#00ff88;font-family:monospace;font-size:11px;');
