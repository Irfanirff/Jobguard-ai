/* ============================================
   JOBGUARD AI — app.js
   Handles: Claude API, UI logic, examples
   ============================================ */

// ── EXAMPLE JOB POSTINGS ─────────────────────────────────────────────────────

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

Benefits: Work from ANYWHERE in the world! Be your own boss!

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
We're looking for a Backend Platform Engineer to join our core infrastructure team. You'll work on distributed systems that process millions of transactions daily. This is a high-impact role where your work will directly influence Stripe's reliability and performance at scale.

What You'll Do:
- Design and build highly available distributed services in Go and Ruby
- Improve our infrastructure reliability, scalability, and performance
- Partner with product teams to create APIs and internal platforms
- Conduct code reviews and contribute to engineering best practices
- Participate in on-call rotations to ensure system reliability

Who We're Looking For:
- 3+ years of backend software engineering experience
- Experience with distributed systems and microservices architecture
- Proficiency in Go, Ruby, Java, or Python
- Strong understanding of database design (SQL and NoSQL)
- Experience with cloud infrastructure (AWS/GCP/Azure)

Nice to Have:
- Experience with Kubernetes or container orchestration
- Open source contributions
- Financial services background

Compensation: $175,000 - $235,000 base salary + equity + benefits
- Medical, dental, and vision insurance
- 401(k) with company matching
- Parental leave
- Annual learning budget

To Apply: Submit your application through careers.stripe.com/jobs/12345
No third-party recruiters please.`,

  suspicious: `Remote Customer Success Manager

Company: TechVentures Solutions
Location: Fully Remote - Worldwide

We are a growing B2B SaaS startup looking for motivated individuals to join our customer success team!

About Us: TechVentures Solutions provides cloud-based business optimization software to SMBs globally. Founded in 2021, we are growing rapidly and looking to scale our team.

Responsibilities:
- Onboard new clients and ensure successful product adoption
- Manage a portfolio of 50-100 accounts
- Conduct QBRs and upsell conversations
- Provide product feedback to our development team

Requirements:
- 1-3 years of customer success or account management experience
- Excellent communication skills
- Self-motivated and able to work independently
- CRM experience preferred (Salesforce, HubSpot)
- Available for meetings between 9AM-6PM EST

Compensation: $45,000 - $75,000 (depends on experience) + commission
- Health insurance after 90 days
- Paid time off
- Fully remote

How to Apply: Email your resume to: hiring@techventures-solutions.net
Please include "CSM Application" in the subject line.

Note: We move fast! Candidates who apply today may receive an offer within 48 hours. We look forward to working with you!`
};

// ── UTILITY FUNCTIONS ─────────────────────────────────────────────────────────

function updateCharCount() {
  const text = document.getElementById('jobInput').value;
  document.getElementById('charCount').textContent = `${text.length} / 5000`;
}

function loadExample(type) {
  const textarea = document.getElementById('jobInput');
  textarea.value = EXAMPLES[type];
  updateCharCount();
  textarea.scrollTop = 0;
}

function shareLinkedIn() {
  const url = encodeURIComponent(window.location.href);
  const text = encodeURIComponent("🛡️ Built an AI that detects fake job listings using NLP + pattern detection!\n\nFresh grads: always scan a job posting before you apply. 1 in 7 online jobs are scams.\n\nTry it free 👇");
  window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}&summary=${text}`, '_blank');
}

function copyLink() {
  navigator.clipboard.writeText(window.location.href).then(() => {
    const btn = document.getElementById('copyBtn');
    btn.textContent = '✅ Copied!';
    setTimeout(() => { btn.textContent = '📋 Copy Link'; }, 2000);
  });
}

// ── MAIN ANALYSIS FUNCTION ────────────────────────────────────────────────────

async function analyzeJob() {
  const jobText = document.getElementById('jobInput').value.trim();

  if (!jobText || jobText.length < 50) {
    alert('Please paste a job description (at least 50 characters) to analyze.');
    return;
  }

  // ── UI: Start loading state ──
  const scanBtn = document.getElementById('scanBtn');
  const scanBtnText = document.getElementById('scanBtnText');
  scanBtn.disabled = true;
  scanBtnText.textContent = '🔍 Scanning...';

  // Show result panel, hide placeholder
  document.getElementById('resultPlaceholder').classList.add('hidden');
  document.getElementById('resultContent').classList.remove('hidden');

  // Animate meter to scanning state
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
  document.getElementById('insightText').textContent = 'Please wait while the AI analyzes this posting...';
  document.getElementById('actionSection').innerHTML = '';
  document.getElementById('flagsCount').textContent = '...';
  document.getElementById('signalsCount').textContent = '...';

  // ── CLAUDE API CALL ──
  const systemPrompt = `You are JobGuard AI, an expert system for detecting fake, fraudulent, or suspicious job postings. You have deep expertise in:
1. NLP analysis of job posting language patterns
2. Company legitimacy validation techniques
3. Common job scam patterns and red flags
4. Legitimate job posting characteristics

Analyze the provided job posting and return ONLY a valid JSON object with this exact structure (no markdown, no explanation, just JSON):

{
  "scam_probability": <number 0-100>,
  "verdict": "<SAFE|SUSPICIOUS|SCAM>",
  "verdict_title": "<short title like 'Likely Legitimate Posting' or 'HIGH SCAM RISK'>",
  "verdict_description": "<2-3 sentence explanation of your overall assessment>",
  "red_flags": [
    {
      "title": "<flag name>",
      "detail": "<specific explanation of why this is a red flag in this posting>",
      "severity": "<HIGH|MEDIUM|LOW>"
    }
  ],
  "positive_signals": [
    {
      "title": "<signal name>",
      "detail": "<specific explanation of why this is a positive signal>"
    }
  ],
  "ai_insight": "<3-5 sentence detailed insight paragraph for job seekers about this specific posting. Be specific, cite details from the posting. Give actionable advice.>",
  "recommended_actions": [
    "<action verb + short instruction>"
  ]
}

SCORING GUIDE:
- 0-30: SAFE - Appears to be a legitimate posting
- 31-65: SUSPICIOUS - Has some red flags, needs verification
- 66-100: SCAM - High likelihood of being fraudulent

RED FLAGS TO CHECK (examine each carefully):
- Email addresses from free providers (gmail, yahoo, hotmail) for company contact
- Requests for personal/financial info upfront (SSN, bank account, DOB)
- Vague company identity or hard to verify online
- "No experience needed" + high salary claims
- Request to forward packages, process payments through personal account
- "Work from home" with unusual financial tasks
- Urgency tactics ("limited spots", "apply today", "immediate hiring")
- Confidentiality requests about the job opportunity
- Check/overpayment scam patterns (sending check, buying equipment)
- Salary that seems unrealistically high for the role
- Recruiter uses only WhatsApp/Telegram, no official channels
- Poor grammar or generic descriptions
- No specific company information, location, or registration details
- Application via external unofficial channels only

POSITIVE SIGNALS:
- Official company domain email
- Verifiable company (public company, known brand)
- Specific salary range that matches industry standards
- Clear job responsibilities and requirements
- Apply through official career portals
- Mentions of standard benefits (401k, health insurance)
- Specific team/department mentioned
- No unusual requests
- Professional job description language
- LinkedIn, official website references`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": "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",
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-iab": "true"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: `Please analyze this job posting for scam indicators:\n\n---\n${jobText}\n---`
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const rawText = data.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    // Parse JSON — strip any accidental markdown fences
    const clean = rawText.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);

    renderResult(result);

  } catch (err) {
    console.error('Analysis failed:', err);
    renderError(err.message);
  } finally {
    scanBtn.disabled = false;
    scanBtnText.textContent = '🔍 Analyze Job Posting';
  }
}

// ── RENDER RESULT ─────────────────────────────────────────────────────────────

function renderResult(result) {
  const prob  = Math.max(0, Math.min(100, result.scam_probability || 0));
  const level = result.verdict?.toUpperCase() === 'SCAM' ? 'scam'
              : result.verdict?.toUpperCase() === 'SUSPICIOUS' ? 'suspicious'
              : 'safe';

  // ── Threat Meter ──
  const meterFill = document.getElementById('meterFill');
  meterFill.classList.remove('scan-anim');
  meterFill.className = `meter-fill ${level}`;

  // Small delay so user sees the meter animate in
  setTimeout(() => { meterFill.style.width = `${prob}%`; }, 100);

  // Badge + Score
  const badgeText = level === 'safe' ? '✅ SAFE' : level === 'suspicious' ? '⚠️ SUSPICIOUS' : '🚨 SCAM';
  setThreatBadge(level, badgeText);

  const scoreEl = document.getElementById('threatScore');
  scoreEl.textContent = `${prob}%`;
  scoreEl.className = `threat-score-value ${level}`;

  // ── Verdict ──
  const verdictBox   = document.getElementById('verdictBox');
  const verdictIcon  = document.getElementById('verdictIcon');
  const verdictTitle = document.getElementById('verdictTitle');
  const verdictDesc  = document.getElementById('verdictDesc');

  verdictBox.className = `verdict-box ${level}`;
  verdictIcon.textContent = level === 'safe' ? '✅' : level === 'suspicious' ? '⚠️' : '🚨';
  verdictTitle.textContent = result.verdict_title || 'Analysis Complete';
  verdictDesc.textContent  = result.verdict_description || '';

  // ── Red Flags ──
  const flags = result.red_flags || [];
  document.getElementById('flagsCount').textContent = flags.length;
  const flagsList = document.getElementById('flagsList');
  if (flags.length === 0) {
    flagsList.innerHTML = '<div style="font-size:13px;color:var(--slate);padding:8px 0">No major red flags detected.</div>';
  } else {
    flagsList.innerHTML = flags.map(f => `
      <div class="flag-item">
        <span class="flag-icon">${f.severity === 'HIGH' ? '🔴' : f.severity === 'MEDIUM' ? '🟡' : '🔵'}</span>
        <div class="flag-text">
          <div class="flag-title">${escapeHTML(f.title)}</div>
          <div class="flag-detail">${escapeHTML(f.detail)}</div>
        </div>
      </div>`).join('');
  }

  // ── Positive Signals ──
  const signals = result.positive_signals || [];
  document.getElementById('signalsCount').textContent = signals.length;
  const signalsList = document.getElementById('signalsList');
  if (signals.length === 0) {
    signalsList.innerHTML = '<div style="font-size:13px;color:var(--slate);padding:8px 0">No strong positive signals detected.</div>';
  } else {
    signalsList.innerHTML = signals.map(s => `
      <div class="signal-item">
        <span class="signal-icon">✅</span>
        <div class="signal-text">
          <div class="signal-title">${escapeHTML(s.title)}</div>
          <div class="signal-detail">${escapeHTML(s.detail)}</div>
        </div>
      </div>`).join('');
  }

  // ── AI Insight ──
  document.getElementById('insightText').textContent = result.ai_insight || '';

  // ── Action Buttons ──
  const actions = result.recommended_actions || [];
  const actionSection = document.getElementById('actionSection');
  if (level === 'scam') {
    actionSection.innerHTML = `
      <button class="action-btn danger" onclick="reportScam()">🚨 Report This Scam</button>
      <button class="action-btn secondary" onclick="analyzeNew()">↩ Analyze Another</button>`;
  } else if (level === 'suspicious') {
    actionSection.innerHTML = `
      <button class="action-btn primary" onclick="analyzeNew()">🔍 Scan Another Job</button>
      <button class="action-btn secondary" onclick="copyReport(${JSON.stringify(result).replace(/"/g, '&quot;')})">📋 Copy Report</button>`;
  } else {
    actionSection.innerHTML = `
      <button class="action-btn primary" onclick="analyzeNew()">🔍 Scan Another Job</button>
      <button class="action-btn secondary" onclick="shareLinkedIn()">📤 Share JobGuard</button>`;
  }
}

// ── RENDER ERROR ──────────────────────────────────────────────────────────────

function renderError(msg) {
  const meterFill = document.getElementById('meterFill');
  meterFill.classList.remove('scan-anim');
  meterFill.style.width = '0%';
  setThreatBadge('suspicious', 'ERROR');
  document.getElementById('threatScore').textContent = '—';
  document.getElementById('verdictBox').className = 'verdict-box suspicious';
  document.getElementById('verdictIcon').textContent = '⚠️';
  document.getElementById('verdictTitle').textContent = 'Analysis Failed';
  document.getElementById('verdictDesc').textContent = 'Could not complete the analysis. Please check your connection and try again.';
  document.getElementById('flagsList').innerHTML = `<div class="flag-item"><span class="flag-icon">🔴</span><div class="flag-text"><div class="flag-title">Error</div><div class="flag-detail">${escapeHTML(msg)}</div></div></div>`;
  document.getElementById('signalsList').innerHTML = '';
  document.getElementById('insightText').textContent = 'The AI analysis service encountered an error. This may be a temporary issue. Please try again.';
  document.getElementById('actionSection').innerHTML = `<button class="action-btn secondary" onclick="analyzeJob()">↩ Retry Analysis</button>`;
  document.getElementById('flagsCount').textContent = '!';
  document.getElementById('signalsCount').textContent = '0';
}

// ── HELPERS ───────────────────────────────────────────────────────────────────

function setThreatBadge(level, text) {
  const badge = document.getElementById('threatBadge');
  badge.className = `threat-badge ${level}`;
  badge.textContent = text;
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function analyzeNew() {
  document.getElementById('jobInput').value = '';
  updateCharCount();
  document.getElementById('resultContent').classList.add('hidden');
  document.getElementById('resultPlaceholder').classList.remove('hidden');
  document.getElementById('jobInput').focus();
  window.scrollTo({ top: document.getElementById('demo').offsetTop - 80, behavior: 'smooth' });
}

function reportScam() {
  window.open('https://reportfraud.ftc.gov/', '_blank');
}

function copyReport(result) {
  const text = `JobGuard AI Analysis Report
---------------------------
Verdict: ${result.verdict}
Scam Probability: ${result.scam_probability}%

${result.verdict_title}
${result.verdict_description}

Red Flags (${result.red_flags?.length || 0}):
${(result.red_flags || []).map(f => `• ${f.title}: ${f.detail}`).join('\n')}

Positive Signals (${result.positive_signals?.length || 0}):
${(result.positive_signals || []).map(s => `• ${s.title}: ${s.detail}`).join('\n')}

AI Insight: ${result.ai_insight}

Analyzed by JobGuard AI`;
  navigator.clipboard.writeText(text).then(() => alert('Report copied to clipboard!'));
}

// ── INIT ──────────────────────────────────────────────────────────────────────

// Smooth scroll for nav links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

console.log('%c⬡ JobGuard AI Loaded', 'color:#3D8EFF;font-weight:bold;font-size:14px');