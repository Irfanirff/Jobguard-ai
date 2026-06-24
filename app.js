/* ============================================
   JOBGUARD AI — app.js
   API calls go to /.netlify/functions/analyze
   (Never call Anthropic directly from browser)
   ============================================ */

const EXAMPLES = {
  scam: `Job Title: Work From Home Data Entry Specialist - URGENT HIRING

Company: Global Opportunities LLC

About Us: We are a fast-growing international company offering amazing work from home positions to individuals worldwide. No experience necessary! Start earning $500-$1500 per week from home today!

Job Description:
- Simple data entry tasks completed on your own schedule
- Process payments and transfers using your personal bank account
- Receive packages at your home address and forward them to our clients
- Communicate with clients via WhatsApp only

Requirements:
- Must have a bank account (we will transfer funds directly to you!)
- Computer or smartphone
- 18+ years old
- No experience needed

Salary: $25-$50 per hour guaranteed! Weekly payments directly to your bank!

TO APPLY: Do NOT apply through this website. Send your full name, home address, date of birth, and bank account details to: globalopportunities.hiring@gmail.com or WhatsApp: +1 (555) 234-5678

HURRY! Only 5 spots remaining! Must start immediately. We will send you a check for $2000 to purchase your equipment - just send back the remainder after buying.

Note: Please keep this opportunity confidential as we have limited openings.`,

  legit: `Software Engineer II - Backend Platform

Company: Stripe (stripe.com)
Location: San Francisco, CA / Remote (US)
Department: Infrastructure Engineering

About Stripe:
Stripe is a financial infrastructure platform for businesses. We build the economic infrastructure of the internet, giving millions of companies the tools to start, run, and scale their businesses.

About the Role:
We're looking for a Backend Platform Engineer to join our core infrastructure team.

What You'll Do:
- Design and build highly available distributed services in Go and Ruby
- Improve our infrastructure reliability, scalability, and performance
- Partner with product teams to create APIs and internal platforms
- Conduct code reviews and contribute to engineering best practices

Who We're Looking For:
- 3+ years of backend software engineering experience
- Experience with distributed systems and microservices architecture
- Proficiency in Go, Ruby, Java, or Python
- Strong understanding of database design (SQL and NoSQL)

Compensation: $175,000 - $235,000 base salary + equity + benefits
- Medical, dental, and vision insurance
- 401(k) with company matching
- Parental leave

To Apply: Submit your application through careers.stripe.com/jobs/12345`,

  suspicious: `Remote Customer Success Manager

Company: TechVentures Solutions
Location: Fully Remote

We are a growing B2B SaaS startup looking for motivated individuals!

Responsibilities:
- Onboard new clients and ensure successful product adoption
- Manage a portfolio of 50-100 accounts
- Conduct upsell conversations

Requirements:
- 1-3 years of customer success experience
- Excellent communication skills
- CRM experience preferred

Compensation: $45,000 - $75,000 + commission
- Health insurance after 90 days
- Fully remote

How to Apply: Email your resume to: hiring@techventures-solutions.net

Note: We move fast! Candidates who apply today may receive an offer within 48 hours!`
};

const SYSTEM_PROMPT = `You are JobGuard AI, an expert system for detecting fake, fraudulent, or suspicious job postings. Analyze the provided job posting and return ONLY a valid JSON object with this exact structure (no markdown, no explanation, just raw JSON):

{
  "scam_probability": <number 0-100>,
  "verdict": "<SAFE|SUSPICIOUS|SCAM>",
  "verdict_title": "<short title>",
  "verdict_description": "<2-3 sentence explanation>",
  "red_flags": [
    {
      "title": "<flag name>",
      "detail": "<specific explanation>",
      "severity": "<HIGH|MEDIUM|LOW>"
    }
  ],
  "positive_signals": [
    {
      "title": "<signal name>",
      "detail": "<specific explanation>"
    }
  ],
  "ai_insight": "<3-5 sentence detailed insight for job seekers about this specific posting>"
}

SCORING: 0-30 = SAFE, 31-65 = SUSPICIOUS, 66-100 = SCAM

RED FLAGS TO CHECK:
- Email from free providers (gmail/yahoo/hotmail) used as company contact
- Requests for bank account, SSN, DOB, home address upfront
- Vague or unverifiable company identity
- No experience needed + high salary claims
- Request to forward packages or process payments through personal account
- Urgency tactics (limited spots, apply today, immediate hiring)
- Confidentiality requests about the job
- Check/overpayment scam patterns
- WhatsApp/Telegram only contact, no official channels
- Unrealistically high pay for simple tasks
- Poor grammar or overly generic descriptions

POSITIVE SIGNALS:
- Official company domain email
- Verifiable well-known company
- Realistic salary range for the role
- Clear specific job responsibilities
- Apply through official career portals
- Standard benefits mentioned (401k, health insurance)
- Specific team or department named`;

function updateCharCount() {
  const text = document.getElementById('jobInput').value;
  document.getElementById('charCount').textContent = `${text.length} / 5000`;
}

function loadExample(type) {
  const textarea = document.getElementById('jobInput');
  textarea.value = EXAMPLES[type];
  updateCharCount();
}

function shareLinkedIn() {
  const url = encodeURIComponent(window.location.href);
  const text = encodeURIComponent("Built an AI that detects fake job listings using NLP + pattern detection. 1 in 7 online jobs are scams. Try it free:");
  window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}&summary=${text}`, '_blank');
}

function copyLink() {
  navigator.clipboard.writeText(window.location.href).then(() => {
    const btn = document.getElementById('copyBtn');
    btn.textContent = '✅ Copied!';
    setTimeout(() => { btn.textContent = '📋 Copy Link'; }, 2000);
  });
}

async function analyzeJob() {
  const jobText = document.getElementById('jobInput').value.trim();
  if (!jobText || jobText.length < 50) {
    alert('Please paste a job description (at least 50 characters) to analyze.');
    return;
  }

  const scanBtn = document.getElementById('scanBtn');
  const scanBtnText = document.getElementById('scanBtnText');
  scanBtn.disabled = true;
  scanBtnText.textContent = '🔍 Scanning...';

  document.getElementById('resultPlaceholder').classList.add('hidden');
  document.getElementById('resultContent').classList.remove('hidden');

  const meterFill = document.getElementById('meterFill');
  meterFill.className = 'meter-fill suspicious scan-anim';
  meterFill.style.width = '40%';
  setThreatBadge('suspicious', 'SCANNING...');
  document.getElementById('threatScore').textContent = '—';
  document.getElementById('threatScore').className = 'threat-score-value';
  document.getElementById('verdictTitle').textContent = 'Analyzing job posting...';
  document.getElementById('verdictDesc').textContent = 'Running NLP analysis, company validation, and pattern detection.';
  document.getElementById('verdictBox').className = 'verdict-box suspicious';
  document.getElementById('verdictIcon').textContent = '🔍';
  document.getElementById('flagsList').innerHTML = '<div class="flag-item loading-pulse"><span>Detecting patterns...</span></div>';
  document.getElementById('signalsList').innerHTML = '';
  document.getElementById('insightText').textContent = 'Please wait...';
  document.getElementById('actionSection').innerHTML = '';
  document.getElementById('flagsCount').textContent = '...';
  document.getElementById('signalsCount').textContent = '...';

  try {
    // Calls YOUR Netlify function — not Anthropic directly
    const response = await fetch('/.netlify/functions/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobText: jobText,
        systemPrompt: SYSTEM_PROMPT
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Server error: ${response.status}`);
    }

    const data = await response.json();
    const rawText = data.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    const clean = rawText.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);
    renderResult(result);

  } catch (err) {
    console.error('Analysis error:', err);
    renderError(err.message);
  } finally {
    scanBtn.disabled = false;
    scanBtnText.textContent = '🔍 Analyze Job Posting';
  }
}

function renderResult(result) {
  const prob  = Math.max(0, Math.min(100, result.scam_probability || 0));
  const level = result.verdict === 'SCAM' ? 'scam' : result.verdict === 'SUSPICIOUS' ? 'suspicious' : 'safe';

  const meterFill = document.getElementById('meterFill');
  meterFill.classList.remove('scan-anim');
  meterFill.className = `meter-fill ${level}`;
  setTimeout(() => { meterFill.style.width = `${prob}%`; }, 100);

  const badgeText = level === 'safe' ? '✅ SAFE' : level === 'suspicious' ? '⚠️ SUSPICIOUS' : '🚨 SCAM';
  setThreatBadge(level, badgeText);

  const scoreEl = document.getElementById('threatScore');
  scoreEl.textContent = `${prob}%`;
  scoreEl.className = `threat-score-value ${level}`;

  document.getElementById('verdictBox').className = `verdict-box ${level}`;
  document.getElementById('verdictIcon').textContent = level === 'safe' ? '✅' : level === 'suspicious' ? '⚠️' : '🚨';
  document.getElementById('verdictTitle').textContent = result.verdict_title || 'Analysis Complete';
  document.getElementById('verdictDesc').textContent  = result.verdict_description || '';

  const flags = result.red_flags || [];
  document.getElementById('flagsCount').textContent = flags.length;
  document.getElementById('flagsList').innerHTML = flags.length === 0
    ? '<div style="font-size:13px;color:var(--slate);padding:8px 0">No major red flags detected.</div>'
    : flags.map(f => `
      <div class="flag-item">
        <span class="flag-icon">${f.severity === 'HIGH' ? '🔴' : f.severity === 'MEDIUM' ? '🟡' : '🔵'}</span>
        <div class="flag-text">
          <div class="flag-title">${escapeHTML(f.title)}</div>
          <div class="flag-detail">${escapeHTML(f.detail)}</div>
        </div>
      </div>`).join('');

  const signals = result.positive_signals || [];
  document.getElementById('signalsCount').textContent = signals.length;
  document.getElementById('signalsList').innerHTML = signals.length === 0
    ? '<div style="font-size:13px;color:var(--slate);padding:8px 0">No strong positive signals detected.</div>'
    : signals.map(s => `
      <div class="signal-item">
        <span class="signal-icon">✅</span>
        <div class="signal-text">
          <div class="signal-title">${escapeHTML(s.title)}</div>
          <div class="signal-detail">${escapeHTML(s.detail)}</div>
        </div>
      </div>`).join('');

  document.getElementById('insightText').textContent = result.ai_insight || '';

  const actionSection = document.getElementById('actionSection');
  if (level === 'scam') {
    actionSection.innerHTML = `
      <button class="action-btn danger" onclick="window.open('https://reportfraud.ftc.gov/','_blank')">🚨 Report This Scam</button>
      <button class="action-btn secondary" onclick="analyzeNew()">↩ Analyze Another</button>`;
  } else {
    actionSection.innerHTML = `
      <button class="action-btn primary" onclick="analyzeNew()">🔍 Scan Another Job</button>
      <button class="action-btn secondary" onclick="shareLinkedIn()">📤 Share JobGuard</button>`;
  }
}

function renderError(msg) {
  const meterFill = document.getElementById('meterFill');
  meterFill.classList.remove('scan-anim');
  meterFill.style.width = '0%';
  setThreatBadge('suspicious', 'ERROR');
  document.getElementById('threatScore').textContent = '—';
  document.getElementById('verdictBox').className = 'verdict-box suspicious';
  document.getElementById('verdictIcon').textContent = '⚠️';
  document.getElementById('verdictTitle').textContent = 'Analysis Failed';
  document.getElementById('verdictDesc').textContent = 'Could not reach the AI server. See details below.';
  document.getElementById('flagsList').innerHTML = `
    <div class="flag-item">
      <span class="flag-icon">🔴</span>
      <div class="flag-text">
        <div class="flag-title">Error Details</div>
        <div class="flag-detail">${escapeHTML(msg)}</div>
      </div>
    </div>`;
  document.getElementById('signalsList').innerHTML = '';
  document.getElementById('insightText').textContent = 'This error means the serverless function is not reachable. Make sure you deployed to Netlify (not GitHub Pages) and added your ANTHROPIC_API_KEY environment variable.';
  document.getElementById('actionSection').innerHTML = `<button class="action-btn secondary" onclick="analyzeJob()">↩ Retry</button>`;
  document.getElementById('flagsCount').textContent = '!';
  document.getElementById('signalsCount').textContent = '0';
}

function setThreatBadge(level, text) {
  const badge = document.getElementById('threatBadge');
  badge.className = `threat-badge ${level}`;
  badge.textContent = text;
}

function escapeHTML(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function analyzeNew() {
  document.getElementById('jobInput').value = '';
  updateCharCount();
  document.getElementById('resultContent').classList.add('hidden');
  document.getElementById('resultPlaceholder').classList.remove('hidden');
  document.getElementById('jobInput').focus();
}

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  });
});