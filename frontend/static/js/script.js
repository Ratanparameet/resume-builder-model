// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const API_BASE_URL = "";

// Graphura Skill Requirement Matrix for Rule-Based Engine
const ROLE_SKILLS_MATRIX = {
  "Data Analytics Intern": {
    skills: ["python", "sql", "power bi", "tableau", "excel", "pandas", "numpy", "statistics", "data analysis", "r"],
    icon: "line-chart"
  },
  "Web Development Intern": {
    skills: ["html", "css", "javascript", "react", "node.js", "git", "python", "flask", "django", "sql"],
    icon: "code-2"
  },
  "Digital Marketing Intern": {
    skills: ["seo", "sem", "social media", "google analytics", "content writing", "canva", "meta ads", "email marketing"],
    icon: "megaphone"
  },
  "Graphic Design Intern": {
    skills: ["figma", "photoshop", "illustrator", "canva", "ui/ux", "typography", "premiere pro", "after effects"],
    icon: "palette"
  },
  "HR / Operations Intern": {
    skills: ["recruiting", "communication", "excel", "ms office", "management", "scheduling", "operations", "hris"],
    icon: "users-round"
  }
};

// Mock Candidate Profiles for Dashboard Shortlist Loader
const MOCK_PROFILES = {
  "Aarav": {
    name: "Aarav Sharma",
    education: "B.Tech in Information Technology",
    experience: "3 months internship as data science trainee",
    skills: "Python, SQL, Power BI, Excel, Pandas, Numpy, Statistics, Data Analysis",
    projects: "Developed Car Sales Dashboard with Power BI; Built a Rice Recommendation model using Random Forest",
    certificates: "Data Science & AI Certification (IT Vedant)"
  },
  "Priya": {
    name: "Priya Patel",
    education: "B.E. in Computer Science",
    experience: "Fresher",
    skills: "HTML, CSS, JavaScript, React, Node.js, Git, SQL",
    projects: "E-commerce Website using React & Node; Portfolio Website",
    certificates: "Full Stack Web Development (Udemy)"
  },
  "Vikram": {
    name: "Vikram Malhotra",
    education: "BBA in Marketing",
    experience: "6 months digital marketing intern",
    skills: "SEO, SEM, Social Media, Google Analytics, Content Writing, Canva, Meta Ads",
    projects: "Managed social media campaign raising engagement by 40%",
    certificates: "Google Analytics certification"
  },
  "Karan": {
    name: "Karan Johar",
    education: "BCA",
    experience: "Fresher",
    skills: "Java, HTML, CSS, JavaScript, SQL",
    projects: "Library Management System in Java",
    certificates: "Java Developer Certification"
  },
  "Neha": {
    name: "Neha Gupta",
    education: "MBA in HR",
    experience: "3 months recruiting assistant",
    skills: "Recruiting, Communication, Excel, MS Office, Management, Scheduling, Operations",
    projects: "Structured onboarding process for new interns",
    certificates: "Human Resources Management (LinkedIn)"
  },
  "Samir": {
    name: "Samir Sen",
    education: "B.Sc. in Physics",
    experience: "Fresher",
    skills: "Linux, Bash, Git, Docker",
    projects: "Home server setup using Raspberry Pi",
    certificates: ""
  }
};

// ---------------------------------------------------------------------------
// Elements
// ---------------------------------------------------------------------------
const form = document.getElementById("resume-form");
const submitBtn = document.getElementById("submit-btn");
const clearBtn = document.getElementById("clear-btn");
const formHint = document.getElementById("form-hint");

const emptyState = document.getElementById("empty-state");
const resultsContent = document.getElementById("results-content");
const reportBadge = document.getElementById("report-badge");

const resCandidateName = document.getElementById("res-candidate-name");
const resAvatar = document.getElementById("res-avatar");
const resultRole = document.getElementById("result-role");
const resultConfidence = document.getElementById("result-confidence");
const resultConfidenceBar = document.getElementById("result-confidence-bar");
const rankList = document.getElementById("rank-list");
const ruleMatches = document.getElementById("rule-matches");

const recAdvice = document.getElementById("rec-advice");
const recCard = document.getElementById("rec-card");

const footerStatus = document.getElementById("footer-status");

// ---------------------------------------------------------------------------
// Navigation / Tab Switching
// ---------------------------------------------------------------------------
document.querySelectorAll(".nav-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    // Remove active from all tabs & contents
    document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    
    // Add active to current
    tab.classList.add("active");
    const targetTab = tab.getAttribute("data-tab");
    document.getElementById(`tab-${targetTab}`).classList.add("active");
  });
});

// ---------------------------------------------------------------------------
// Health check on load
// ---------------------------------------------------------------------------
async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`);
    const data = await res.json();
    if (data.status === "ok") {
      const roleCount = data.roles ? data.roles.length : 0;
      footerStatus.textContent = `Backend online — ${roleCount} roles loaded`;
      footerStatus.style.color = "#38bdf8";
      document.getElementById("system-status-badge").textContent = "AI/ML Backend Online";
    } else {
      footerStatus.textContent = `Backend error: ${data.detail || "unknown"}`;
      footerStatus.style.color = "#f43f5e";
      document.getElementById("system-status-badge").textContent = "Backend Error";
    }
  } catch (err) {
    footerStatus.textContent = "Can't reach the ML prediction server.";
    footerStatus.style.color = "#f43f5e";
    document.getElementById("system-status-badge").textContent = "Backend Offline";
  }
}
checkHealth();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 5000 } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Rule-Based Calculator (Client-side Engine)
// ---------------------------------------------------------------------------
function calculateRuleBasedMatching(skillsText, educationText, experienceText, projectsText, certificatesText) {
  // Combine all candidate text to scan for keyword matches
  const fullText = `${skillsText} ${educationText} ${experienceText} ${projectsText} ${certificatesText}`.toLowerCase();
  
  const results = [];
  
  for (const [roleName, config] of Object.entries(ROLE_SKILLS_MATRIX)) {
    let matchCount = 0;
    const matchedSkills = [];
    const missingSkills = [];
    
    config.skills.forEach(skill => {
      // Create a regex to match the skill keyword cleanly (boundary check)
      const escapedSkill = skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedSkill}\\b`, 'i');
      if (regex.test(fullText)) {
        matchCount++;
        matchedSkills.push(skill);
      } else {
        missingSkills.push(skill);
      }
    });
    
    const percentage = Math.round((matchCount / config.skills.length) * 100);
    
    let category = "Low Fit";
    if (percentage >= 70) {
      category = "Strong Fit";
    } else if (percentage >= 40) {
      category = "Moderate Fit";
    }
    
    results.push({
      role: roleName,
      score: percentage,
      category: category,
      matched: matchedSkills,
      missing: missingSkills,
      icon: config.icon
    });
  }
  
  // Sort by highest score first
  return results.sort((a, b) => b.score - a.score);
}

// ---------------------------------------------------------------------------
// Render Results
// ---------------------------------------------------------------------------
let currentlyAnalyzedCandidate = null;

function renderReport(candidateName, aiData, ruleData) {
  // Store currently analyzed context
  currentlyAnalyzedCandidate = {
    name: candidateName,
    aiData: aiData,
    ruleData: ruleData,
    education: document.getElementById("education").value.trim(),
    experience: document.getElementById("experience").value.trim(),
    skills: document.getElementById("skills").value.trim(),
    projects: document.getElementById("projects").value.trim(),
    certificates: document.getElementById("certificates").value.trim()
  };

  // Reset Shortlist button visual state
  const addBtn = document.getElementById("add-to-shortlist-btn");
  if (addBtn) {
    addBtn.innerHTML = `<i data-lucide="user-plus"></i> Shortlist`;
    addBtn.disabled = false;
    lucide.createIcons();
  }

  // Set candidate meta
  resCandidateName.textContent = candidateName;
  resAvatar.textContent = candidateName.charAt(0).toUpperCase();
  
  // 1. Render AI/ML Engine prediction
  resultRole.textContent = aiData.predicted_role || "—";
  
  if (typeof aiData.confidence === "number") {
    const confPercentage = Math.round(aiData.confidence * 100);
    resultConfidence.textContent = `${confPercentage}% confidence`;
    resultConfidenceBar.style.width = `${confPercentage}%`;
  } else {
    resultConfidence.textContent = "N/A";
    resultConfidenceBar.style.width = "0%";
  }
  
  if (aiData.top_roles && aiData.top_roles.length) {
    rankList.innerHTML = aiData.top_roles
      .map(
        (r) => {
          const scorePercent = Math.round(r.score * 100);
          return `
            <div class="rank-row">
              <span class="rank-name">${escapeHtml(r.role)}</span>
              <span class="rank-score">${scorePercent}%</span>
              <div class="rank-track">
                <div class="rank-fill" style="width:${scorePercent}%"></div>
              </div>
            </div>`;
        }
      )
      .join("");
  } else {
    rankList.innerHTML = `<p style="font-size: 0.85rem; color: #64748b;">No alternative models classes returned.</p>`;
  }
  
  // 2. Render Rule-Based Matches
  ruleMatches.innerHTML = ruleData
    .map(
      (item) => {
        let catClass = "low-fit";
        if (item.category === "Strong Fit") catClass = "strong-fit";
        if (item.category === "Moderate Fit") catClass = "moderate-fit";
        
        const matchedStr = item.matched.length > 0 ? item.matched.join(", ") : "None";
        
        return `
          <div class="match-item">
            <div class="match-item-top">
              <span class="match-item-title">${escapeHtml(item.role)}</span>
              <span class="fit-category-badge ${catClass}">${item.category}</span>
            </div>
            <div class="match-item-top">
              <span class="match-item-percentage">${item.score}% skill match</span>
            </div>
            <div class="match-progress-bar">
              <div class="match-progress-fill ${catClass}" style="width: ${item.score}%"></div>
            </div>
            <div class="matched-keywords">
              <strong>Matched:</strong> ${escapeHtml(matchedStr)}
            </div>
          </div>`;
      }
    )
    .join("");
    
  // 3. Generateplacement advice
  const bestRule = ruleData[0];
  const predictedRole = aiData.predicted_role || "";
  
  let recommendationText = "";
  if (bestRule.score >= 70) {
    recommendationText = `<strong>Highly Recommended!</strong> ${candidateName} shows a robust skill alignment of <strong>${bestRule.score}%</strong> for the <strong>${bestRule.role}</strong> pathway, matching critical stack components like: <em>${bestRule.matched.slice(0, 4).join(", ")}</em>. `;
  } else if (bestRule.score >= 40) {
    recommendationText = `<strong>Conditional Match.</strong> ${candidateName} shows moderate suitability (<strong>${bestRule.score}%</strong> match) for the <strong>${bestRule.role}</strong> pathway. Consider mentoring them on missing tools/methods: <em>${bestRule.missing.slice(0, 3).join(", ")}</em>. `;
  } else {
    recommendationText = `<strong>Low Matrix Match.</strong> Candidate does not meet the baseline skill matrix thresholds for RAREINFOWAY's standard roles. `;
  }
  
  if (predictedRole) {
    recommendationText += `The AI/ML Classifier identifies general resume affinity with <strong>${predictedRole}</strong> roles with a confidence of <strong>${Math.round(aiData.confidence * 100)}%</strong>.`;
  }
  
  recAdvice.innerHTML = recommendationText;
  
  // Show results pane
  emptyState.style.display = "none";
  resultsContent.hidden = false;
  reportBadge.textContent = "Analysis Complete";
  reportBadge.className = "report-status-badge active-analysis";
}

// ---------------------------------------------------------------------------
// Submit Form Handler
// ---------------------------------------------------------------------------
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const candidateName = document.getElementById("candidate-name").value.trim();
  const payload = {
    education: document.getElementById("education").value.trim(),
    experience: document.getElementById("experience").value.trim(),
    projects: document.getElementById("projects").value.trim(),
    skills: document.getElementById("skills").value.trim(),
    certificates: document.getElementById("certificates").value.trim(),
  };

  const hasContent = Object.values(payload).some((v) => v.length > 0);
  if (!hasContent) {
    formHint.textContent = "Please fill in at least one resume field.";
    formHint.classList.add("is-error");
    return;
  }

  formHint.classList.remove("is-error");
  formHint.textContent = "Processing Engines...";
  submitBtn.disabled = true;
  
  // Scroll results into view on mobile
  if (window.innerWidth < 1024) {
    resultsContent.scrollIntoView({ behavior: 'smooth' });
  }

  try {
    // Run concurrent calculations
    // 1. AI/ML Prediction
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/predict-role`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      timeout: 5000
    });
    
    const aiData = await res.json();

    if (!res.ok) {
      formHint.textContent = "";
      formHint.textContent = aiData.error || "Prediction request failed.";
      formHint.classList.add("is-error");
      return;
    }

    // 2. Rule-based calculation on the frontend
    const ruleData = calculateRuleBasedMatching(
      payload.skills,
      payload.education,
      payload.experience,
      payload.projects,
      payload.certificates
    );

    formHint.textContent = "";
    renderReport(candidateName, aiData, ruleData);
    
    // Reinitialize icons in new dynamic HTML
    lucide.createIcons();
    
  } catch (err) {
    formHint.textContent = "Can't contact backend server. Reverting to rule-based engine only.";
    formHint.classList.add("is-error");
    
    // Fallback: still show rule-based results if backend is offline
    const ruleData = calculateRuleBasedMatching(
      payload.skills,
      payload.education,
      payload.experience,
      payload.projects,
      payload.certificates
    );
    
    const fallbackAi = {
      predicted_role: "Offline/Unknown",
      confidence: 0,
      top_roles: []
    };
    
    renderReport(candidateName, fallbackAi, ruleData);
    lucide.createIcons();
  } finally {
    submitBtn.disabled = false;
  }
});

// Clear Form Handler
clearBtn.addEventListener("click", () => {
  form.reset();
  formHint.textContent = "";
  emptyState.style.display = "flex";
  resultsContent.hidden = true;
  reportBadge.textContent = "Awaiting Input";
  reportBadge.className = "report-status-badge";
});

// ---------------------------------------------------------------------------
// Load Mock Profile Action (From shortlist dashboard table)
// ---------------------------------------------------------------------------
window.loadMockCandidate = function(candidateKey) {
  const profile = MOCK_PROFILES[candidateKey];
  if (!profile) return;
  
  // Switch to Analyzer Tab
  const analyzerTab = document.querySelector('[data-tab="analyzer"]');
  if (analyzerTab) {
    analyzerTab.click();
  }
  
  // Populate form
  document.getElementById("candidate-name").value = profile.name;
  document.getElementById("education").value = profile.education;
  document.getElementById("experience").value = profile.experience;
  document.getElementById("skills").value = profile.skills;
  document.getElementById("projects").value = profile.projects;
  document.getElementById("certificates").value = profile.certificates;
  
  // Trigger Submit
  setTimeout(() => {
    form.dispatchEvent(new Event('submit'));
  }, 100);
};

// ---------------------------------------------------------------------------
// Resume File Upload & Parsing (PDF / TXT)
// ---------------------------------------------------------------------------
const uploadZone = document.getElementById("upload-zone");
const fileInput = document.getElementById("resume-file-input");

// Trigger file input click when upload zone is clicked
uploadZone.addEventListener("click", () => {
  fileInput.click();
});

// Handle Drag over / leave effects
uploadZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadZone.classList.add("dragover");
});

uploadZone.addEventListener("dragleave", () => {
  uploadZone.classList.remove("dragover");
});

let sessionCandidatesList = [];

const analyzerSelectName = document.getElementById("analyzer-select-name");
if (analyzerSelectName) {
  analyzerSelectName.addEventListener("change", (e) => {
    const idx = parseInt(e.target.value);
    loadAnalyzerCandidateByIndex(idx);
  });
}

uploadZone.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadZone.classList.remove("dragover");
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    handleUploadedFiles(files);
  }
});

fileInput.addEventListener("change", (e) => {
  const files = e.target.files;
  if (files.length > 0) {
    handleUploadedFiles(files);
  }
});

async function handleUploadedFiles(files) {
  // Clear previous session candidates if uploading a new batch
  sessionCandidatesList = [];
  
  // Show visual processing state
  uploadZone.classList.add("parsing");
  const pTag = uploadZone.querySelector("p");
  const icon = uploadZone.querySelector(".upload-icon") || uploadZone.querySelector("svg") || uploadZone.querySelector("i");
  pTag.innerHTML = `Extracting data from ${files.length} resume(s)...`;
  if (icon) {
    icon.setAttribute("data-lucide", "loader-2");
    icon.classList.add("animate-spin");
  }
  lucide.createIcons();

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileExt = file.name.split('.').pop().toLowerCase();
    
    if (fileExt !== 'pdf' && fileExt !== 'txt') {
      console.warn(`File ${file.name} is not a PDF/TXT, skipping.`);
      continue;
    }

    try {
      pTag.innerHTML = `Parsing (${i + 1}/${files.length}): <strong style="color:var(--accent-gold);">${file.name}</strong>...`;
      const text = await readUploadedFileText(file, fileExt);
      
      if (!text || text.trim().length === 0) {
        continue;
      }

      const parsed = parseResumeText(text);
      
      // Calculate Rule-Based Matching
      const ruleData = calculateRuleBasedMatching(
        parsed.skills,
        parsed.education,
        parsed.experience,
        parsed.projects,
        parsed.certificates
      );

      // Concurrently run ML prediction API check (Engine 1)
      let aiData = { predicted_role: "Offline/Unknown", confidence: 0, top_roles: [] };
      try {
        const payload = {
          education: parsed.education,
          experience: parsed.experience,
          projects: parsed.projects,
          skills: parsed.skills,
          certificates: parsed.certificates
        };

        const res = await fetchWithTimeout(`${API_BASE_URL}/api/predict-role`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          timeout: 5000
        });

        if (res.ok) {
          aiData = await res.json();
        }
      } catch (err) {
        console.warn("AI prediction failed for candidate in session upload", err);
      }

      sessionCandidatesList.push({
        name: parsed.name || file.name.split('.')[0],
        parsed: parsed,
        aiData: aiData,
        ruleData: ruleData
      });

    } catch (err) {
      console.error(`Error uploading and parsing file ${file.name}:`, err);
    }
  }

  resetUploadZone();

  if (sessionCandidatesList.length === 0) {
    alert("No valid candidate resumes could be parsed.");
    return;
  }

  // Populate Candidate Selector
  populateAnalyzerSelector();

  // Load the first candidate
  loadAnalyzerCandidateByIndex(0);
}

function readUploadedFileText(file, fileExt) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    if (fileExt === 'txt') {
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (err) => reject(err);
      reader.readAsText(file);
    } else if (fileExt === 'pdf') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
      
      reader.onload = async (e) => {
        const typedarray = new Uint8Array(e.target.result);
        try {
          const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
          let fullText = "";
          
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            
            const items = textContent.items;
            const tolerance = 4;
            const linesMap = {};
            
            items.forEach(item => {
              const y = item.transform[5];
              const x = item.transform[4];
              
              let foundY = null;
              for (const key of Object.keys(linesMap)) {
                if (Math.abs(parseFloat(key) - y) < tolerance) {
                  foundY = key;
                  break;
                }
              }
              
              if (foundY !== null) {
                linesMap[foundY].push({ x, text: item.str });
              } else {
                linesMap[y] = [{ x, text: item.str }];
              }
            });
            
            const sortedYKeys = Object.keys(linesMap).sort((a, b) => parseFloat(b) - parseFloat(a));
            
            sortedYKeys.forEach(yKey => {
              const lineItems = linesMap[yKey].sort((a, b) => a.x - b.x);
              const lineStr = lineItems.map(item => item.text).join(" ").trim();
              if (lineStr.length > 0) {
                fullText += lineStr + "\n";
              }
            });
            fullText += "\n";
          }
          resolve(fullText);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    }
  });
}

function populateAnalyzerSelector() {
  const selectorRow = document.getElementById("analyzer-candidate-selector");
  const selectEl = document.getElementById("analyzer-select-name");
  if (!selectorRow || !selectEl) return;

  if (sessionCandidatesList.length > 1) {
    selectorRow.style.display = "flex";
    selectEl.innerHTML = sessionCandidatesList
      .map((c, idx) => {
        const bestRole = c.ruleData[0] || { role: "N/A" };
        return `<option value="${idx}">${escapeHtml(c.name)} (${escapeHtml(bestRole.role)})</option>`;
      })
      .join("");
  } else {
    selectorRow.style.display = "none";
  }
}

function loadAnalyzerCandidateByIndex(idx) {
  const c = sessionCandidatesList[idx];
  if (!c) return;

  // Fill form columns
  document.getElementById("candidate-name").value = c.name;
  document.getElementById("education").value = c.parsed.education || "";
  document.getElementById("experience").value = c.parsed.experience || "";
  document.getElementById("skills").value = c.parsed.skills || "";
  document.getElementById("projects").value = c.parsed.projects || "";
  document.getElementById("certificates").value = c.parsed.certificates || "";

  // Render the report
  renderReport(c.name, c.aiData, c.ruleData);
  
  // Show results panel
  emptyState.style.display = "none";
  resultsContent.hidden = false;
  
  lucide.createIcons();
}

function resetUploadZone() {
  uploadZone.classList.remove("parsing");
  const pTag = uploadZone.querySelector("p");
  const icon = uploadZone.querySelector(".upload-icon") || uploadZone.querySelector("svg") || uploadZone.querySelector("i");
  pTag.innerHTML = `Drag & drop candidate resume(s) (PDF or TXT) or <span class="browse-link">browse</span>`;
  if (icon) {
    icon.setAttribute("data-lucide", "upload-cloud");
    icon.classList.remove("animate-spin");
  }
  fileInput.value = ""; // clear input
  lucide.createIcons();
}

function parseResumeText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  // 1. Extract Candidate Name (heuristics: look at first 8 lines)
  let candidateName = "";
  for (let i = 0; i < Math.min(8, lines.length); i++) {
    const line = lines[i];
    if (line.includes('@') || line.includes('/') || line.includes('+') || /\b(resume|cv|portfolio|email|phone|mobile|address|gmail|linkedin|github)\b/i.test(line)) {
      continue;
    }
    const words = line.split(/\s+/);
    if (words.length >= 2 && words.length <= 4 && /^[a-zA-Z\s\.\,\-\|]+$/.test(line)) {
      candidateName = line.replace(/^(name|candidate name|curriculum vitae|resume)\s*:\s*/i, '').trim();
      break;
    }
  }
  if (!candidateName && lines.length > 0) {
    candidateName = lines[0];
  }

  // Clean candidateName if it grabbed education suffixes
  if (candidateName.includes("B.E.") || candidateName.includes("B.Tech") || candidateName.includes("BCA") || candidateName.includes("M.E.") || candidateName.includes("M.Tech")) {
    candidateName = candidateName.split(/\b(B\.?E\.?|B\.?Tech|BCA|MBA|MCA|M\.?E\.?|M\.?Tech)\b/i)[0].trim().replace(/[\-\,\|\s]+$/, "");
  }

  // 2. Classify text blocks into sections based on headers
  const sections = {
    education: [],
    experience: [],
    skills: [],
    projects: [],
    certificates: []
  };

  const sectionHeaders = {
    education: /^(education|academic|educational|qualification|academics|studies|university|college)/i,
    experience: /^(experience|work experience|employment|professional experience|internship|internships|work history)/i,
    skills: /^(skills|technical skills|key skills|technologies|proficiencies|tools|languages|core competencies)/i,
    projects: /^(projects|key projects|academic projects|personal projects|development projects)/i,
    certificates: /^(certifications|certificates|courses|credentials|achievements|training)/i
  };

  let activeSection = null;

  lines.forEach(line => {
    let foundHeader = false;
    if (line.length < 40) {
      const cleanLine = line.replace(/^[•\-\s\*\[\]\(\)\d\.\:\#]+/, '').trim();
      for (const [secName, regex] of Object.entries(sectionHeaders)) {
        if (regex.test(cleanLine)) {
          activeSection = secName;
          foundHeader = true;
          break;
        }
      }
    }

    if (!foundHeader && activeSection) {
      sections[activeSection].push(line);
    }
  });

  // Group experience lines into titles and bullet details
  const expCompanies = [];
  const expDetails = [];

  sections.experience.forEach(line => {
    const isBullet = /^[•\-\s\*]/.test(line) || /^(built|developed|managed|utilized|contributed|gained|assisted|implemented|created|designed|worked|responsible|handled|led)\b/i.test(line);
    
    if (!isBullet && (line.includes("-") || line.includes(":") || line.includes("|") || /\b(intern|developer|engineer|designer|manager|executive|analyst|associate|services|llp|infoware|co|ltd|inc|solutions)\b/i.test(line)) && line.length < 100) {
      const cleanLine = line.replace(/[:\s]+$/, "").replace(/^[•\-\s\*]+/, "").trim();
      if (cleanLine.length > 0) {
        // Extract ONLY company name
        let companyName = cleanLine;
        let parts = [];
        if (cleanLine.includes(" - ")) {
          parts = cleanLine.split(" - ");
        } else if (cleanLine.includes(" at ")) {
          parts = cleanLine.split(" at ");
        } else if (cleanLine.includes(" @ ")) {
          parts = cleanLine.split(" @ ");
        } else if (cleanLine.includes(" – ")) {
          parts = cleanLine.split(" – ");
        } else if (cleanLine.includes(" — ")) {
          parts = cleanLine.split(" — ");
        }
        
        if (parts.length >= 2) {
          companyName = parts[parts.length - 1].trim();
        }
        
        if (companyName.length > 0 && !expCompanies.includes(companyName)) {
          expCompanies.push(companyName);
        }
      }
    } else {
      expDetails.push(line);
    }
  });

  let experienceText = "";
  if (expCompanies.length > 0) {
    experienceText = expCompanies.join("; ");
  } else {
    // Fallback: search for first non-bullet line and try to extract company name from it
    const firstLine = sections.experience.find(l => !/^[•\-\s\*]/.test(l));
    if (firstLine) {
      let companyName = firstLine.replace(/[:\s]+$/, "").replace(/^[•\-\s\*]+/, "").trim();
      let parts = [];
      if (companyName.includes(" - ")) parts = companyName.split(" - ");
      else if (companyName.includes(" at ")) parts = companyName.split(" at ");
      else if (companyName.includes(" @ ")) parts = companyName.split(" @ ");
      
      if (parts.length >= 2) {
        companyName = parts[parts.length - 1].trim();
      }
      experienceText = companyName;
    } else {
      experienceText = sections.experience[0] || "Fresher";
    }
  }

  // Skills dictionary mapping to enrich matching
  const dictionarySkills = [
    "python", "sql", "power bi", "tableau", "excel", "pandas", "numpy", "statistics", "data analysis", "r",
    "html", "css", "javascript", "react", "node.js", "git", "flask", "django", "seo", "sem", "social media",
    "google analytics", "content writing", "canva", "meta ads", "email marketing", "figma", "photoshop",
    "illustrator", "ui/ux", "typography", "premiere pro", "after effects", "recruiting", "communication",
    "ms office", "management", "scheduling", "operations", "hris", "java", "c++", "c#", "aws", "docker",
    "kubernetes", "linux", "cloud", "machine learning", "deep learning", "nlp", "rest api", "rest apis",
    "backend", "frontend", "database", "databases", "django admin", "web development", "responsive web"
  ];

  let skillsList = [];
  const lowerText = text.toLowerCase();
  dictionarySkills.forEach(skill => {
    const escaped = skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(lowerText)) {
      const formatted = skill.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      skillsList.push(formattedSkill(formatted));
    }
  });

  // Specifically extract explicit terms mentioned in the work experience details
  if (expDetails.length > 0) {
    const expDetailsText = expDetails.join(" ").toLowerCase();
    dictionarySkills.forEach(skill => {
      const escaped = skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'i');
      if (regex.test(expDetailsText)) {
        const formatted = skill.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        const resolved = formattedSkill(formatted);
        if (!skillsList.includes(resolved)) {
          skillsList.push(resolved);
        }
      }
    });
  }

  if (sections.skills.length > 0) {
    const skillsText = sections.skills.join(", ");
    const customSkills = skillsText.split(/[,;\n•|/\\]/).map(s => s.trim()).filter(s => s.length > 1 && s.length < 30);
    customSkills.forEach(cs => {
      if (/^(and|with|using|in|for|the|or)$/i.test(cs)) return;
      const formatted = cs.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      const resolved = formattedSkill(formatted);
      if (!skillsList.includes(resolved)) {
        skillsList.push(resolved);
      }
    });
  }

  // Format final fields
  const parsedData = {
    name: candidateName.trim(),
    education: sections.education.slice(0, 5).join(" ").trim(),
    experience: experienceText,
    skills: skillsList.slice(0, 20).join(", "),
    projects: sections.projects.slice(0, 8).join(" ").trim(),
    certificates: sections.certificates.slice(0, 5).join(", ").trim()
  };

  // Clean list styles
  const cleanListSymbols = (txt) => {
    return txt
      .replace(/^[•\-\s\*]+/gm, '')
      .replace(/\s*[•\-\*]\s*/g, '; ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  parsedData.education = cleanListSymbols(parsedData.education);
  parsedData.experience = cleanListSymbols(parsedData.experience);
  parsedData.projects = cleanListSymbols(parsedData.projects);
  parsedData.certificates = cleanListSymbols(parsedData.certificates);

  // Fallbacks in case PDF has non-standard header formats:
  if (!parsedData.education) {
    const eduLines = lines.filter(l => /\b(b\.?tech|b\.?e|bca|mca|mba|degree|bachelor|master|university|college|school)\b/i.test(l));
    parsedData.education = cleanListSymbols(eduLines.slice(0, 3).join("; "));
  }

  if (!parsedData.experience || parsedData.experience === "Fresher") {
    const expLines = lines.filter(l => /\b(internship|months|years|experience|intern|worked|position|role|fresher)\b/i.test(l));
    if (expLines.length > 0) {
      parsedData.experience = cleanListSymbols(expLines.slice(0, 3).join("; "));
    }
  }

  return parsedData;
}

function formattedSkill(skillName) {
  const s = skillName.toLowerCase().trim();
  if (s === "sql") return "SQL";
  if (s === "seo") return "SEO";
  if (s === "sem") return "SEM";
  if (s === "hris") return "HRIS";
  if (s === "nlp") return "NLP";
  if (s === "rest api" || s === "rest apis") return "REST APIs";
  if (s === "django admin") return "Django Admin";
  if (s === "responsive web" || s === "responsive web interfaces") return "Responsive Web Design";
  if (s === "web development" || s === "web application development") return "Web Development";
  return skillName;
}

// ---------------------------------------------------------------------------
// Decision Engine (JS mirror of backend logic — blends AI 60% + Rule 40%)
// ---------------------------------------------------------------------------
function computeDecisionEngine(aiRole, aiConfPct, ruleRole, ruleScore) {
  const overall = Math.round((aiConfPct * 0.60) + (ruleScore * 0.40));
  let finalRole, explanation;

  if (aiRole === ruleRole) {
    finalRole = aiRole;
    explanation = "AI & Rule-Based predictions matched.";
  } else if (aiConfPct >= 60) {
    finalRole = aiRole;
    explanation = "AI confidence is higher.";
  } else if (ruleScore >= 75) {
    finalRole = ruleRole;
    explanation = "Rule-Based score is stronger.";
  } else {
    finalRole = aiRole;
    explanation = "AI prediction selected (rule score insufficient).";
  }

  let matchLevel;
  if (overall >= 90)      matchLevel = "Excellent Match";
  else if (overall >= 75) matchLevel = "Strong Match";
  else if (overall >= 60) matchLevel = "Moderate Match";
  else                    matchLevel = "Low Match";

  return { finalRole, overall, matchLevel, explanation, aiRole, ruleRole };
}

// ---------------------------------------------------------------------------
// FRONTEND VISUALIZATION LAYER
// Score Normalization: backend values are used as-is for logic;
// display scores are ONLY for UI rendering — never sent to backend.
// ---------------------------------------------------------------------------

/**
 * Normalize backend overall score into a more readable display score.
 * Backend remains completely unchanged.
 */
function getDisplayScore(backendScore) {
  const s = Number(backendScore) || 0;
  if (s <= 30) return 55;
  if (s <= 40) return Math.round(s + 35);
  if (s <= 50) return Math.round(s + 33);
  if (s <= 60) return Math.round(s + 30);
  if (s <= 70) return Math.round(s + 25);
  return Math.min(Math.round(s + 15), 100);
}

/** Match level based on DISPLAY score */
function getDisplayMatchLevel(displayScore) {
  if (displayScore >= 85) return "Excellent Match";
  if (displayScore >= 70) return "Strong Match";
  if (displayScore >= 50) return "Moderate Match";
  return "Low Match";
}

function getMatchIcon(level) {
  return { "Excellent Match": "⭐", "Strong Match": "🟢", "Moderate Match": "🟡", "Low Match": "🔴" }[level] || "🔴";
}

function getMatchBadgeClass(level) {
  return { "Excellent Match": "excellent", "Strong Match": "strong", "Moderate Match": "moderate", "Low Match": "low" }[level] || "low";
}

function getProgressGradient(level) {
  return {
    "Excellent Match": "linear-gradient(90deg,#00b09b,#00d4aa)",
    "Strong Match":    "linear-gradient(90deg,#56ab2f,#a8e063)",
    "Moderate Match":  "linear-gradient(90deg,#f7971e,#ffd200)",
    "Low Match":       "linear-gradient(90deg,#f85032,#e73827)"
  }[level] || "linear-gradient(90deg,#f85032,#e73827)";
}

function getRecommendation(level) {
  return {
    "Excellent Match": "Candidate strongly matches this role. Recommended for Interview.",
    "Strong Match":    "Candidate has very good matching skills. Recommended for Technical Round.",
    "Moderate Match":  "Candidate partially matches. Additional evaluation recommended.",
    "Low Match":       "Candidate needs additional skills. Consider another suitable role."
  }[level] || "";
}

/** Count-up animation for a DOM element */
function animateCountUp(el, target, duration = 900, suffix = "%") {
  let startTime = null;
  function step(ts) {
    if (!startTime) startTime = ts;
    const progress = Math.min((ts - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target) + suffix;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/** Build the animated score cell HTML */
function buildScoreCell(backendScore) {
  const disp = getDisplayScore(backendScore);
  const level = getDisplayMatchLevel(disp);
  const grad  = getProgressGradient(level);
  return `
    <div class="score-display-cell">
      <div class="score-tooltip-wrap">
        <span class="display-score-val" data-target="${disp}">0%</span>
        <div class="score-progress-bar">
          <div class="score-progress-fill" data-fill="${disp}" style="background:${grad};"></div>
        </div>
        <span class="score-tooltip-text">
          This score is normalized only for better visualization.
          The ML prediction and backend remain unchanged.
        </span>
      </div>
    </div>
  `;
}

/** Trigger count-up + progress bar animations for all score cells in DOM */
function animateScoreCells() {
  document.querySelectorAll(".display-score-val[data-target]").forEach(el => {
    animateCountUp(el, parseInt(el.dataset.target));
  });
  setTimeout(() => {
    document.querySelectorAll(".score-progress-fill[data-fill]").forEach(el => {
      el.style.width = el.dataset.fill + "%";
    });
  }, 80);
}

// Chart instances (kept so we can destroy & rebuild on re-render)
let matchLevelChartInst = null;
let roleDistChartInst   = null;

/** Draw / refresh Chart.js charts from the processed candidate list */
function refreshDashboardCharts(processedList) {
  if (typeof Chart === "undefined") return;

  // ── Match Level Bar Chart ──
  const mlCounts = { "Excellent Match": 0, "Strong Match": 0, "Moderate Match": 0, "Low Match": 0 };
  processedList.forEach(c => {
    const disp  = getDisplayScore(c._overallForChart || c.displayScore || 0);
    const level = getDisplayMatchLevel(disp);
    if (mlCounts[level] !== undefined) mlCounts[level]++;
  });

  const mlCanvas = document.getElementById("matchLevelChart");
  if (mlCanvas) {
    if (matchLevelChartInst) matchLevelChartInst.destroy();
    matchLevelChartInst = new Chart(mlCanvas, {
      type: "bar",
      data: {
        labels: ["⭐ Excellent", "🟢 Strong", "🟡 Moderate", "🔴 Low"],
        datasets: [{
          label: "Candidates",
          data: Object.values(mlCounts),
          backgroundColor: ["#C8F7E1", "#D8F5D0", "#FFF4CC", "#FFE5E5"],
          borderColor:      ["#00695C", "#2E7D32", "#C67C00", "#D32F2F"],
          borderWidth: 2,
          borderRadius: 8,
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: "rgba(0,0,0,0.04)" } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  // ── Role Distribution Doughnut ──
  const roleCounts = {};
  processedList.forEach(c => {
    const role = c._finalRoleForChart || c.displayRole || c.bestRuleRole || "Unknown";
    roleCounts[role] = (roleCounts[role] || 0) + 1;
  });
  const roleLabels = Object.keys(roleCounts);
  const roleData   = Object.values(roleCounts);
  const palette    = ["#993445","#c45068","#00695C","#2E7D32","#C67C00","#0369a1","#7c3aed","#d97706"];

  const rdCanvas = document.getElementById("roleDistChart");
  if (rdCanvas) {
    if (roleDistChartInst) roleDistChartInst.destroy();
    roleDistChartInst = new Chart(rdCanvas, {
      type: "doughnut",
      data: {
        labels: roleLabels,
        datasets: [{
          data: roleData,
          backgroundColor: palette.slice(0, roleLabels.length),
          borderWidth: 2,
          hoverOffset: 10
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: "bottom", labels: { font: { size: 11 }, padding: 12, boxWidth: 14 } }
        }
      }
    });
  }
}

/** Update the 6-card summary panel */
function updateSummaryPanel(processedList) {
  let excellent = 0, strong = 0, moderate = 0, low = 0, totalDisp = 0;
  processedList.forEach(c => {
    const disp  = getDisplayScore(c._overallForChart || c.displayScore || 0);
    const level = getDisplayMatchLevel(disp);
    totalDisp += disp;
    if (level === "Excellent Match") excellent++;
    else if (level === "Strong Match") strong++;
    else if (level === "Moderate Match") moderate++;
    else low++;
  });
  const n = processedList.length;
  const avg = n > 0 ? Math.round(totalDisp / n) : 0;

  function setVal(id, val, suffix = "") {
    const el = document.getElementById(id);
    if (!el) return;
    animateCountUp(el, Number(val), 700, suffix);
  }

  setVal("sum-total",     n,         "");
  setVal("sum-excellent", excellent, "");
  setVal("sum-strong",    strong,    "");
  setVal("sum-moderate",  moderate,  "");
  setVal("sum-low",       low,       "");
  setVal("sum-avg",       avg,       "%");
}

// ---------------------------------------------------------------------------
// Batch Candidate Screening Engine (Multiple Resume Upload)
// ---------------------------------------------------------------------------
const batchDropZone = document.getElementById("batch-drop-zone");
const batchFileInput = document.getElementById("batch-file-input");
const batchTargetRole = document.getElementById("batch-target-role");
const batchProgress = document.getElementById("batch-progress");
const batchProgressList = document.getElementById("batch-progress-list");
const batchResults = document.getElementById("batch-results");
const batchResultsRoleTitle = document.getElementById("batch-results-role-title");
const batchResultsBody = document.getElementById("batch-results-body");

let batchCandidatesList = []; // Array to store processed candidate profiles

// Trigger file input click when drop zone is clicked
batchDropZone.addEventListener("click", () => {
  batchFileInput.click();
});

// Drag & drop handlers
batchDropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  batchDropZone.classList.add("dragover");
});

batchDropZone.addEventListener("dragleave", () => {
  batchDropZone.classList.remove("dragover");
});

batchDropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  batchDropZone.classList.remove("dragover");
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    handleBatchFiles(files);
  }
});

batchFileInput.addEventListener("change", (e) => {
  const files = e.target.files;
  if (files.length > 0) {
    handleBatchFiles(files);
  }
});

async function handleBatchFiles(files) {
  // Clear previous state
  batchCandidatesList = [];
  batchProgressList.innerHTML = "";
  batchResults.style.display = "none";
  batchProgress.style.display = "block";
  
  const targetRole = batchTargetRole.value;
  batchResultsRoleTitle.textContent = targetRole;

  // Process files sequentially to avoid async resource lock
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileId = `batch-file-${i}`;
    
    // Add item to progress list
    const progressItem = document.createElement("div");
    progressItem.className = "batch-progress-item";
    progressItem.id = fileId;
    progressItem.innerHTML = `
      <span class="batch-file-name">
        <i data-lucide="file-text"></i> ${escapeHtml(file.name)}
      </span>
      <span class="batch-file-status parsing">Parsing...</span>
    `;
    batchProgressList.appendChild(progressItem);
    lucide.createIcons();

    const fileExt = file.name.split('.').pop().toLowerCase();
    
    if (fileExt !== 'pdf' && fileExt !== 'txt') {
      updateBatchFileStatus(fileId, "Error: Invalid type", "error");
      continue;
    }

    try {
      const text = await readBatchFileContent(file, fileExt);
      if (!text || text.trim().length === 0) {
        updateBatchFileStatus(fileId, "Error: Empty content", "error");
        continue;
      }

      // Parse candidate resume details
      const parsed = parseResumeText(text);
      
      // Calculate Rule-Based Matching for specifically the selected target role
      const ruleMatches = calculateRuleBasedMatching(
        parsed.skills,
        parsed.education,
        parsed.experience,
        parsed.projects,
        parsed.certificates
      );
      
      // Find matching item for our selected target role
      const targetRoleMatch = ruleMatches.find(item => item.role === targetRole) || {
        score: 0,
        category: "Low Fit"
      };

      // Concurrently run ML prediction API check (Engine 1)
      let aiResult = { predicted_role: "Offline/Unknown", confidence: 0 };
      try {
        const payload = {
          education: parsed.education,
          experience: parsed.experience,
          projects: parsed.projects,
          skills: parsed.skills,
          certificates: parsed.certificates
        };

        const res = await fetchWithTimeout(`${API_BASE_URL}/api/predict-role`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          timeout: 5000
        });

        if (res.ok) {
          const aiData = await res.json();
          aiResult.predicted_role = aiData.predicted_role;
          aiResult.confidence = aiData.confidence;
        }
      } catch (err) {
        console.warn("AI/ML prediction failed in batch for candidate, fallback applied.", err);
      }

      // Add to successful list
      batchCandidatesList.push({
        name: parsed.name || file.name.split('.')[0],
        score: targetRoleMatch.score,
        category: targetRoleMatch.category,
        aiPredicted: aiResult.predicted_role,
        aiConfidence: aiResult.confidence,
        skills: parsed.skills,
        fullProfile: parsed
      });

      updateBatchFileStatus(fileId, "Completed", "done");

    } catch (err) {
      console.error(`Error processing file ${file.name}:`, err);
      updateBatchFileStatus(fileId, "Error parsing file", "error");
    }
  }

  // Display and rank results
  renderBatchScreenResults();
}

function updateBatchFileStatus(elementId, text, statusClass) {
  const item = document.getElementById(elementId);
  if (item) {
    const statusSpan = item.querySelector(".batch-file-status");
    statusSpan.textContent = text;
    statusSpan.className = `batch-file-status ${statusClass}`;
  }
}

function readBatchFileContent(file, fileExt) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    if (fileExt === 'txt') {
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (err) => reject(err);
      reader.readAsText(file);
    } else if (fileExt === 'pdf') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
      
      reader.onload = async (e) => {
        const typedarray = new Uint8Array(e.target.result);
        try {
          const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
          let fullText = "";
          
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            
            // Group text items by y-coordinate
            const items = textContent.items;
            const tolerance = 4;
            const linesMap = {};
            
            items.forEach(item => {
              const y = item.transform[5];
              const x = item.transform[4];
              
              let foundY = null;
              for (const key of Object.keys(linesMap)) {
                if (Math.abs(parseFloat(key) - y) < tolerance) {
                  foundY = key;
                  break;
                }
              }
              
              if (foundY !== null) {
                linesMap[foundY].push({ x, text: item.str });
              } else {
                linesMap[y] = [{ x, text: item.str }];
              }
            });
            
            const sortedYKeys = Object.keys(linesMap).sort((a, b) => parseFloat(b) - parseFloat(a));
            
            sortedYKeys.forEach(yKey => {
              const lineItems = linesMap[yKey].sort((a, b) => a.x - b.x);
              const lineStr = lineItems.map(item => item.text).join(" ").trim();
              if (lineStr.length > 0) {
                fullText += lineStr + "\n";
              }
            });
            fullText += "\n";
          }
          resolve(fullText);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    }
  });
}

function renderBatchScreenResults() {
  // Sort candidates descending by match score
  batchCandidatesList.sort((a, b) => b.score - a.score);

  if (batchCandidatesList.length === 0) {
    batchResultsBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; color:#64748b;">No candidates could be successfully matched. Please verify file formats.</td>
      </tr>
    `;
  } else {
    batchResultsBody.innerHTML = batchCandidatesList
      .map((c, idx) => {
        let catClass = "low-fit";
        if (c.category === "Strong Fit") catClass = "strong-fit";
        if (c.category === "Moderate Fit") catClass = "moderate-fit";

        const scorePercent = `${c.score}%`;
        const aiConfPct = c.aiConfidence > 0 ? Math.round(c.aiConfidence * 100) : 0;

        // Merge AI + Rule into Decision Engine output
        const decision = computeDecisionEngine(
          c.aiPredicted || "Unknown",
          aiConfPct,
          batchTargetRole.value,
          c.score
        );

        let mlvlClass = "low-fit";
        if (decision.matchLevel === "Excellent Match" || decision.matchLevel === "Strong Match") mlvlClass = "strong-fit";
        else if (decision.matchLevel === "Moderate Match") mlvlClass = "moderate-fit";

        return `
          <tr id="batch-row-${idx}">
            <td><strong>#${idx + 1}</strong></td>
            <td><strong>${escapeHtml(c.name)}</strong></td>
            <td><span class="badge-score font-mono">${scorePercent}</span></td>
            <td><span class="fit-tag ${catClass}">${c.category}</span></td>
            <td>
              <strong style="font-size:0.88rem; color:#1e293b;">${escapeHtml(decision.finalRole)}</strong>
            </td>
            <td>${buildScoreCell(decision.overall)}</td>
            <td><span class="match-badge ${getMatchBadgeClass(getDisplayMatchLevel(getDisplayScore(decision.overall)))}">${getMatchIcon(getDisplayMatchLevel(getDisplayScore(decision.overall)))} ${getDisplayMatchLevel(getDisplayScore(decision.overall))}</span></td>
            <td style="max-width:220px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${escapeHtml(c.skills)}">
              ${escapeHtml(c.skills || "None")}
            </td>
            <td>
              <div style="display:flex; gap:0.35rem; flex-wrap:wrap;">
                <button class="btn-table-action" onclick="loadBatchCandidate(${idx})">Load Profiler</button>
                <button class="btn-table-action" id="batch-shortlist-btn-${idx}" style="color:#993445; border-color:#fecdd3; background-color:#fff1f2;" onclick="shortlistBatchCandidate(${idx})">
                  <i data-lucide="user-plus" style="width:12px; height:12px; display:inline-block;"></i> Shortlist
                </button>
                <button class="btn-table-action" style="color:#ef4444; border-color:#fca5a5; background-color:#fff5f5;" onclick="removeBatchCandidate(${idx})">
                  <i data-lucide="trash-2" style="width:12px; height:12px; display:inline-block; vertical-align:middle;"></i> Remove
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  }
  
  // Hide progress after short delay and show results
  setTimeout(() => {
    batchProgress.style.display = "none";
    batchResults.style.display = "block";
    lucide.createIcons();
    // Animate score cells in batch results
    setTimeout(() => animateScoreCells(), 50);
    
    // Scroll results table into view
    batchResults.scrollIntoView({ behavior: 'smooth' });
  }, 500);
}

// Remove a single candidate from the batch results list and re-render
window.removeBatchCandidate = function(idx) {
  if (batchCandidatesList[idx]) {
    batchCandidatesList.splice(idx, 1);
    if (batchCandidatesList.length === 0) {
      batchResults.style.display = "none";
    } else {
      renderBatchScreenResults();
    }
  }
};

// Global action callback to load candidate details back into analyzer form
window.loadBatchCandidate = function(index) {
  const candidate = batchCandidatesList[index];
  if (!candidate || !candidate.fullProfile) return;
  
  // Switch to Analyzer Tab
  const analyzerTab = document.querySelector('[data-tab="analyzer"]');
  if (analyzerTab) {
    analyzerTab.click();
  }
  
  // Populate form
  const profile = candidate.fullProfile;
  document.getElementById("candidate-name").value = candidate.name;
  document.getElementById("education").value = profile.education;
  document.getElementById("experience").value = profile.experience;
  document.getElementById("skills").value = profile.skills;
  document.getElementById("projects").value = profile.projects;
  document.getElementById("certificates").value = profile.certificates;
  
  // Trigger Submit
  setTimeout(() => {
    form.dispatchEvent(new Event('submit'));
  }, 100);
};

// ---------------------------------------------------------------------------
// Shortlist State & Management Functions
// ---------------------------------------------------------------------------
const DEFAULT_SHORTLIST = [
  {
    name: "Aarav Sharma",
    aiPredicted: "Data Analyst",
    aiConfidence: 0.88,
    bestRuleRole: "Data Analytics Intern",
    bestRuleScore: 90,
    category: "Strong Fit",
    fullProfile: MOCK_PROFILES["Aarav"]
  },
  {
    name: "Priya Patel",
    aiPredicted: "Front-end Developer",
    aiConfidence: 0.74,
    bestRuleRole: "Web Development Intern",
    bestRuleScore: 80,
    category: "Strong Fit",
    fullProfile: MOCK_PROFILES["Priya"]
  },
  {
    name: "Vikram Malhotra",
    aiPredicted: "Digital Marketing",
    aiConfidence: 0.91,
    bestRuleRole: "Digital Marketing Intern",
    bestRuleScore: 75,
    category: "Strong Fit",
    fullProfile: MOCK_PROFILES["Vikram"]
  },
  {
    name: "Karan Johar",
    aiPredicted: "Java Developer",
    aiConfidence: 0.41,
    bestRuleRole: "Web Development Intern",
    bestRuleScore: 50,
    category: "Moderate Fit",
    fullProfile: MOCK_PROFILES["Karan"]
  },
  {
    name: "Neha Gupta",
    aiPredicted: "HR Executive",
    aiConfidence: 0.82,
    bestRuleRole: "HR/Operations Intern",
    bestRuleScore: 87,
    category: "Strong Fit",
    fullProfile: MOCK_PROFILES["Neha"]
  },
  {
    name: "Samir Sen",
    aiPredicted: "DevOps Engineer",
    aiConfidence: 0.32,
    bestRuleRole: "Web Development Intern",
    bestRuleScore: 30,
    category: "Low Fit",
    fullProfile: MOCK_PROFILES["Samir"]
  }
];

let hrShortlist = [];

function loadShortlist() {
  const stored = localStorage.getItem("rareinfoway_hr_shortlist");
  if (stored) {
    try {
      hrShortlist = JSON.parse(stored);
    } catch (e) {
      console.error("Failed to load shortlist, resetting.", e);
      hrShortlist = [...DEFAULT_SHORTLIST];
    }
  } else {
    hrShortlist = [...DEFAULT_SHORTLIST];
    saveShortlist();
  }
}

function saveShortlist() {
  localStorage.setItem("rareinfoway_hr_shortlist", JSON.stringify(hrShortlist));
}

function renderShortlistTable() {
  const tableBody = document.getElementById("shortlist-table-body");
  const filterRole = document.getElementById("shortlist-filter-role") ? document.getElementById("shortlist-filter-role").value : "All";
  if (!tableBody) return;

  if (hrShortlist.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; color:#64748b; padding: 2rem;">No candidates currently shortlisted. Run match analyses to shortlist applicants.</td>
      </tr>
    `;
    return;
  }

  // Process and score candidates based on the selected filter
  let processedList = hrShortlist.map(c => {
    // Re-calculate scores for all roles based on their full profile
    const profile = c.fullProfile || {};
    const ruleMatches = calculateRuleBasedMatching(
      profile.skills || "",
      profile.education || "",
      profile.experience || "",
      profile.projects || "",
      profile.certificates || ""
    );

    if (filterRole === "All") {
      const bestMatch = ruleMatches[0] || { role: "N/A", score: 0, category: "Low Fit" };
      return {
        ...c,
        displayRole: bestMatch.role,
        displayScore: bestMatch.score,
        displayCategory: bestMatch.category
      };
    } else {
      const specificMatch = ruleMatches.find(r => r.role === filterRole) || { role: filterRole, score: 0, category: "Low Fit" };
      return {
        ...c,
        displayRole: specificMatch.role,
        displayScore: specificMatch.score,
        displayCategory: specificMatch.category
      };
    }
  });

  // ── New search / filter-by-match / sort controls ──
  const searchQ    = (document.getElementById("shortlist-search")?.value || "").toLowerCase().trim();
  const filterMatch = document.getElementById("shortlist-filter-match")?.value || "All";
  const sortMode    = document.getElementById("shortlist-sort")?.value || "score-desc";

  // Apply search
  if (searchQ) {
    processedList = processedList.filter(c => c.name.toLowerCase().includes(searchQ));
  }

  // Apply match-level filter (based on display score)
  if (filterMatch !== "All") {
    processedList = processedList.filter(c => {
      // compute quick display level for filtering
      const aiConfPct = c.aiConfidence > 0 ? Math.round(c.aiConfidence * 100) : 0;
      const ruleScore = c.displayScore || c.bestRuleScore || 0;
      const ruleRole  = c.displayRole  || c.bestRuleRole  || "N/A";
      const dec = computeDecisionEngine(c.aiPredicted || "Unknown", aiConfPct, ruleRole, ruleScore);
      return getDisplayMatchLevel(getDisplayScore(dec.overall)) === filterMatch;
    });
  }

  // Apply sort
  switch (sortMode) {
    case "score-asc":  processedList.sort((a, b) => a.displayScore - b.displayScore); break;
    case "name-asc":   processedList.sort((a, b) => a.name.localeCompare(b.name));    break;
    case "name-desc":  processedList.sort((a, b) => b.name.localeCompare(a.name));    break;
    case "role":       processedList.sort((a, b) => (a.displayRole||'').localeCompare(b.displayRole||'')); break;
    default:           processedList.sort((a, b) => b.displayScore - a.displayScore); // score-desc
  }

  // If a specific role is filtered, we only show candidates who have a matching suitability > 0%
  if (filterRole !== "All") {
    processedList = processedList.filter(c => c.displayScore > 0);
  }

  if (processedList.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; color:#64748b; padding: 2rem;">No candidates match the selected pathway "${filterRole}".</td>
      </tr>
    `;
    return;
  }

  // ── Build table rows with new display-score visualization ──
  tableBody.innerHTML = processedList
    .map((c, idx) => {
      // Compute Decision Engine result
      const aiConfPct = c.aiConfidence > 0 ? Math.round(c.aiConfidence * 100) : 0;
      const ruleScore = c.displayScore || c.bestRuleScore || 0;
      const ruleRole  = c.displayRole  || c.bestRuleRole  || "N/A";
      const decision  = computeDecisionEngine(c.aiPredicted || "Unknown", aiConfPct, ruleRole, ruleScore);

      // Attach for chart/summary use
      c._overallForChart  = decision.overall;
      c._finalRoleForChart = decision.finalRole;

      // Frontend display score (never sent to backend)
      const dispScore = getDisplayScore(decision.overall);
      const dispLevel = getDisplayMatchLevel(dispScore);
      const bdgClass  = getMatchBadgeClass(dispLevel);
      const icon      = getMatchIcon(dispLevel);
      const originalIndex = hrShortlist.findIndex(item => item.name === c.name);

      return `
        <tr class="row-animate" style="animation-delay:${idx * 0.04}s">
          <td><strong>${escapeHtml(c.name)}</strong></td>
          <td><strong style="font-size:0.88rem; color:#1e293b;">${escapeHtml(decision.finalRole)}</strong></td>
          <td class="score-display-cell">${buildScoreCell(decision.overall)}</td>
          <td><span class="match-badge ${bdgClass}">${icon} ${dispLevel}</span></td>
          <td>
            <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
              <button class="btn-table-action" onclick="loadShortlistCandidateByName('${escapeHtml(c.name)}')">Load Profiler</button>
              <button class="btn-table-action" style="color:#ef4444; border-color:#fca5a5; background-color:#fff5f5;" onclick="removeShortlistCandidate(${originalIndex})">
                <i data-lucide="trash-2" style="width:12px; height:12px; display:inline-block; vertical-align:middle;"></i> Remove
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  lucide.createIcons();
  // Animate score cells after DOM update
  setTimeout(() => {
    animateScoreCells();
    updateSummaryPanel(processedList);
    refreshDashboardCharts(processedList);
  }, 50);
}

window.loadShortlistCandidateByName = function(name) {
  const c = hrShortlist.find(item => item.name === name);
  if (!c || !c.fullProfile) return;

  // Switch to Analyzer Tab
  const analyzerTab = document.querySelector('[data-tab="analyzer"]');
  if (analyzerTab) {
    analyzerTab.click();
  }

  // Populate form
  const profile = c.fullProfile;
  document.getElementById("candidate-name").value = c.name;
  document.getElementById("education").value = profile.education || "";
  document.getElementById("experience").value = profile.experience || "";
  document.getElementById("skills").value = profile.skills || "";
  document.getElementById("projects").value = profile.projects || "";
  document.getElementById("certificates").value = profile.certificates || "";

  // Trigger Submit
  setTimeout(() => {
    form.dispatchEvent(new Event('submit'));
  }, 100);
};

window.loadShortlistCandidate = function(idx) {
  const c = hrShortlist[idx];
  if (!c || !c.fullProfile) return;

  // Switch to Analyzer Tab
  const analyzerTab = document.querySelector('[data-tab="analyzer"]');
  if (analyzerTab) {
    analyzerTab.click();
  }

  // Populate form
  const profile = c.fullProfile;
  document.getElementById("candidate-name").value = c.name;
  document.getElementById("education").value = profile.education || "";
  document.getElementById("experience").value = profile.experience || "";
  document.getElementById("skills").value = profile.skills || "";
  document.getElementById("projects").value = profile.projects || "";
  document.getElementById("certificates").value = profile.certificates || "";

  // Trigger Submit
  setTimeout(() => {
    form.dispatchEvent(new Event('submit'));
  }, 100);
};

window.removeShortlistCandidate = function(idx) {
  if (hrShortlist[idx]) {
    hrShortlist.splice(idx, 1);
    saveShortlist();
    renderShortlistTable();
  }
};

window.shortlistBatchCandidate = function(idx) {
  const c = batchCandidatesList[idx];
  if (!c) return;

  const alreadyExists = hrShortlist.some(item => item.name.toLowerCase() === c.name.toLowerCase());
  if (alreadyExists) {
    alert(`${c.name} is already in the shortlist!`);
    return;
  }

  hrShortlist.push({
    name: c.name,
    aiPredicted: c.aiPredicted,
    aiConfidence: c.aiConfidence,
    bestRuleRole: batchTargetRole.value, // Target pathway
    bestRuleScore: c.score,
    category: c.category,
    fullProfile: c.fullProfile
  });

  saveShortlist();
  renderShortlistTable();

  // Update button state visually
  const btn = document.getElementById(`batch-shortlist-btn-${idx}`);
  if (btn) {
    btn.innerHTML = `<i data-lucide="check" style="width:12px; height:12px;"></i> Shortlisted`;
    btn.disabled = true;
    btn.style.color = "#10b981";
    btn.style.borderColor = "#a7f3d0";
    btn.style.backgroundColor = "#ecfdf5";
    lucide.createIcons();
  }
};

// Event Listeners for shortlisting actions
const addToShortlistBtn = document.getElementById("add-to-shortlist-btn");
const clearShortlistBtn = document.getElementById("clear-shortlist-btn");
const shortlistFilterRole = document.getElementById("shortlist-filter-role");

if (addToShortlistBtn) {
  addToShortlistBtn.addEventListener("click", () => {
    if (!currentlyAnalyzedCandidate) return;
    
    // Check if already in shortlist
    const alreadyExists = hrShortlist.some(c => c.name.toLowerCase() === currentlyAnalyzedCandidate.name.toLowerCase());
    if (alreadyExists) {
      alert(`${currentlyAnalyzedCandidate.name} is already in the shortlist!`);
      return;
    }
    
    const bestRule = currentlyAnalyzedCandidate.ruleData[0] || { role: "N/A", score: 0, category: "Low Fit" };
    
    hrShortlist.push({
      name: currentlyAnalyzedCandidate.name,
      aiPredicted: currentlyAnalyzedCandidate.aiData.predicted_role,
      aiConfidence: currentlyAnalyzedCandidate.aiData.confidence,
      bestRuleRole: bestRule.role,
      bestRuleScore: bestRule.score,
      category: bestRule.category,
      fullProfile: {
        education: currentlyAnalyzedCandidate.education,
        experience: currentlyAnalyzedCandidate.experience,
        skills: currentlyAnalyzedCandidate.skills,
        projects: currentlyAnalyzedCandidate.projects,
        certificates: currentlyAnalyzedCandidate.certificates
      }
    });
    
    saveShortlist();
    renderShortlistTable();
    
    // Change state visually
    addToShortlistBtn.innerHTML = `<i data-lucide="check"></i> Shortlisted!`;
    addToShortlistBtn.disabled = true;
    lucide.createIcons();
  });
}

if (clearShortlistBtn) {
  clearShortlistBtn.addEventListener("click", () => {
    hrShortlist = [];
    saveShortlist();
    renderShortlistTable();
  });
}

if (shortlistFilterRole) {
  shortlistFilterRole.addEventListener("change", () => {
    renderShortlistTable();
  });
}

// Initialize HR Shortlist on startup
loadShortlist();
renderShortlistTable();

// ── New search / filter / sort event listeners ──
["shortlist-search", "shortlist-filter-match", "shortlist-sort"].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener("input", () => renderShortlistTable());
});

// ---------------------------------------------------------------------------
// Clear All Batch Results Button
// ---------------------------------------------------------------------------
const clearBatchResultsBtn = document.getElementById("clear-batch-results-btn");
if (clearBatchResultsBtn) {
  clearBatchResultsBtn.addEventListener("click", () => {
    batchCandidatesList = [];
    batchResultsBody.innerHTML = "";
    batchResults.style.display = "none";
    batchProgress.style.display = "none";
    batchProgressList.innerHTML = "";
    batchFileInput.value = "";
    lucide.createIcons();
  });
}


// ==========================================================================
// RESUME COMPARISON TOOL (UPLOAD-BASED)
// Frontend only — parses uploaded files and calls predict-role API.
// Never modifies dataset or backend.
// ==========================================================================

let compareCandidateDataA = null;
let compareCandidateDataB = null;

const compareZoneA = document.getElementById("compare-zone-a");
const compareFileA = document.getElementById("compare-file-a");
const compareStatusA = document.getElementById("compare-status-a");

const compareZoneB = document.getElementById("compare-zone-b");
const compareFileB = document.getElementById("compare-file-b");
const compareStatusB = document.getElementById("compare-status-b");

const compareUploadedBtn = document.getElementById("compare-uploaded-btn");
const compareUploadedResults = document.getElementById("compare-uploaded-results");
const compareTargetRole = document.getElementById("compare-target-role");

// Setup drag and drop + click upload events for Zone A
if (compareZoneA && compareFileA) {
  compareZoneA.addEventListener("click", () => compareFileA.click());
  compareZoneA.addEventListener("dragover", (e) => {
    e.preventDefault();
    compareZoneA.classList.add("dragover");
  });
  compareZoneA.addEventListener("dragleave", () => compareZoneA.classList.remove("dragover"));
  compareZoneA.addEventListener("drop", (e) => {
    e.preventDefault();
    compareZoneA.classList.remove("dragover");
    if (e.dataTransfer.files.length > 0) {
      handleCompareUpload(e.dataTransfer.files[0], 'A');
    }
  });
  compareFileA.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      handleCompareUpload(e.target.files[0], 'A');
    }
  });
}

// Setup drag and drop + click upload events for Zone B
if (compareZoneB && compareFileB) {
  compareZoneB.addEventListener("click", () => compareFileB.click());
  compareZoneB.addEventListener("dragover", (e) => {
    e.preventDefault();
    compareZoneB.classList.add("dragover");
  });
  compareZoneB.addEventListener("dragleave", () => compareZoneB.classList.remove("dragover"));
  compareZoneB.addEventListener("drop", (e) => {
    e.preventDefault();
    compareZoneB.classList.remove("dragover");
    if (e.dataTransfer.files.length > 0) {
      handleCompareUpload(e.dataTransfer.files[0], 'B');
    }
  });
  compareFileB.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      handleCompareUpload(e.target.files[0], 'B');
    }
  });
}

/** Handles parsing and API calling for one comparison upload file */
async function handleCompareUpload(file, side) {
  const zone = side === 'A' ? compareZoneA : compareZoneB;
  const statusEl = side === 'A' ? compareStatusA : compareStatusB;
  const fileExt = file.name.split('.').pop().toLowerCase();

  if (fileExt !== 'pdf' && fileExt !== 'txt') {
    zone.className = "compare-upload-box error";
    statusEl.innerHTML = `<span style="color:#ef4444;">Error: Only PDF/TXT allowed</span>`;
    return;
  }

  zone.className = "compare-upload-box parsing-active";
  statusEl.textContent = "Parsing resume...";

  try {
    const text = await readUploadedFileText(file, fileExt);
    if (!text || text.trim().length === 0) {
      zone.className = "compare-upload-box error";
      statusEl.innerHTML = `<span style="color:#ef4444;">Error: Empty file</span>`;
      return;
    }

    const parsed = parseResumeText(text);

    // Call ML prediction API for this candidate (Engine 1)
    let aiData = { predicted_role: "Offline/Unknown", confidence: 0 };
    try {
      const payload = {
        education: parsed.education,
        experience: parsed.experience,
        projects: parsed.projects,
        skills: parsed.skills,
        certificates: parsed.certificates
      };

      const res = await fetchWithTimeout(`${API_BASE_URL}/api/predict-role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        timeout: 5000
      });
      if (res.ok) {
        aiData = await res.json();
      }
    } catch (err) {
      console.warn(`Compare API prediction failed for side ${side}`, err);
    }

    const candidateData = {
      name: parsed.name || file.name.split('.')[0],
      fullProfile: parsed,
      aiConfidence: aiData.confidence || 0,
      aiPredicted: aiData.predicted_role || "Offline/Unknown"
    };

    if (side === 'A') {
      compareCandidateDataA = candidateData;
    } else {
      compareCandidateDataB = candidateData;
    }

    zone.className = "compare-upload-box success";
    statusEl.innerHTML = `
      <div style="margin-bottom: 0.6rem;">Loaded: <strong style="color:#10b981;">${escapeHtml(candidateData.name)}</strong></div>
      <div style="display:flex; justify-content:center; gap:0.5rem; flex-wrap:wrap; margin-top:0.5rem;">
        <button class="btn-table-action" style="padding:0.25rem 0.6rem; font-size:0.75rem; color:#ef4444; border-color:#fca5a5; background-color:#fff5f5;" onclick="event.stopPropagation(); removeComparisonCandidate('${side}');">
          <i data-lucide="trash-2" style="width:12px; height:12px; display:inline-block; vertical-align:middle; margin-right:2px;"></i> Remove
        </button>
      </div>
    `;
    lucide.createIcons();

  } catch (err) {
    console.error(`Error parsing compare file on side ${side}`, err);
    zone.className = "compare-upload-box error";
    statusEl.innerHTML = `<span style="color:#ef4444;">Error parsing file</span>`;
  }
}

/** Triggers side-by-side comparison logic */
function runUploadedComparison() {
  const role = compareTargetRole.value;

  if (!compareCandidateDataA || !compareCandidateDataB) {
    compareUploadedResults.style.display = "block";
    compareUploadedResults.innerHTML = `<div class="compare-error">⚠️ Please upload resumes for both Candidate A and Candidate B first.</div>`;
    return;
  }

  function scoreCandidate(cand) {
    const profile = cand.fullProfile || {};
    const ruleMatches = calculateRuleBasedMatching(
      profile.skills       || "",
      profile.education    || "",
      profile.experience   || "",
      profile.projects     || "",
      profile.certificates || ""
    );

    const roleMatch = ruleMatches.find(r => r.role === role)
                   || { role, score: 0, category: "Low Fit" };

    const aiConfPct = cand.aiConfidence > 0 ? Math.round(cand.aiConfidence * 100) : 0;
    const decision  = computeDecisionEngine(
      cand.aiPredicted || "Unknown",
      aiConfPct,
      roleMatch.role,
      roleMatch.score
    );

    const dispScore = getDisplayScore(decision.overall);
    const dispLevel = getDisplayMatchLevel(dispScore);

    const requiredSkills = (ROLE_SKILLS_MATRIX[role]?.skills || []);
    const candidateText  = (
      (profile.skills || "") + " " +
      (profile.projects || "") + " " +
      (profile.certificates || "")
    ).toLowerCase();

    const matchedSkills = requiredSkills.filter(s => candidateText.includes(s));
    const missingSkills = requiredSkills.filter(s => !candidateText.includes(s));

    const improvements = [];
    if (missingSkills.length > 0) {
      improvements.push(`Learn: ${missingSkills.slice(0, 3).map(s => s.toUpperCase()).join(", ")}`);
    }
    if (roleMatch.score < 50) {
      improvements.push("Build role-specific projects to strengthen the portfolio.");
    }
    if (!profile.certificates || profile.certificates.trim().length < 5) {
      improvements.push("Earn a certification relevant to " + role + ".");
    }
    if (matchedSkills.length < requiredSkills.length / 2) {
      improvements.push("Skill gap is significant — focus on core skills for this role.");
    }
    if (improvements.length === 0) {
      improvements.push("Strong profile. Prepare for technical interview questions.");
    }

    return {
      name: cand.name,
      ruleScore: roleMatch.score,
      aiConfPct,
      decision,
      dispScore,
      dispLevel,
      matchedSkills,
      missingSkills,
      improvements,
      gradient: getProgressGradient(dispLevel),
      badgeClass: getMatchBadgeClass(dispLevel),
      icon: getMatchIcon(dispLevel)
    };
  }

  const dataA = scoreCandidate(compareCandidateDataA);
  const dataB = scoreCandidate(compareCandidateDataB);

  let winnerClass, winnerText, winnerIcon;
  if (dataA.dispScore > dataB.dispScore) {
    winnerClass = "winner-a";
    winnerText  = `${dataA.name} is the Better Fit for ${role}`;
    winnerIcon  = "🏆";
  } else if (dataB.dispScore > dataA.dispScore) {
    winnerClass = "winner-b";
    winnerText  = `${dataB.name} is the Better Fit for ${role}`;
    winnerIcon  = "🏆";
  } else {
    winnerClass = "winner-tie";
    winnerText  = `Both candidates are equally matched for ${role}`;
    winnerIcon  = "🤝";
  }

  function buildCard(data, isWinner, side) {
    const winnerCls = isWinner ? "is-winner" : "";
    const matchedTags = data.matchedSkills
      .map(s => `<span class="skill-tag-matched">✓ ${s}</span>`).join("");
    const missingTags = data.missingSkills.slice(0, 5)
      .map(s => `<span class="skill-tag-missing">✗ ${s}</span>`).join("");
    const improvements = data.improvements
      .map(i => `<li>${escapeHtml(i)}</li>`).join("");

    return `
      <div class="compare-card ${winnerCls}">
        <div class="compare-card-name">${escapeHtml(data.name)}</div>
        <div class="compare-card-subtitle">Target: ${escapeHtml(role)}</div>

        <!-- Overall Display Score -->
        <div class="compare-score-row">
          <span class="compare-score-label">Overall</span>
          <div class="compare-score-bar-wrap">
            <div class="compare-score-bar-fill" data-fill="${data.dispScore}"
              style="background:${data.gradient};"></div>
          </div>
          <span class="compare-score-num" data-target="${data.dispScore}">0%</span>
        </div>

        <!-- Rule-Based Score -->
        <div class="compare-score-row">
          <span class="compare-score-label">Rule Match</span>
          <div class="compare-score-bar-wrap">
            <div class="compare-score-bar-fill" data-fill="${data.ruleScore}"
              style="background:linear-gradient(90deg,#0369a1,#38bdf8);"></div>
          </div>
          <span class="compare-score-num">${data.ruleScore}%</span>
        </div>

        <!-- AI Confidence -->
        <div class="compare-score-row">
          <span class="compare-score-label">AI Conf.</span>
          <div class="compare-score-bar-wrap">
            <div class="compare-score-bar-fill" data-fill="${data.aiConfPct}"
              style="background:linear-gradient(90deg,#7c3aed,#a78bfa);"></div>
          </div>
          <span class="compare-score-num">${data.aiConfPct}%</span>
        </div>

        <!-- Match Level & Shortlist Option -->
        <div style="margin-bottom:0.85rem; display:flex; justify-content:space-between; align-items:center; gap:0.5rem; flex-wrap:wrap;">
          <span class="match-badge ${data.badgeClass}">${data.icon} ${data.dispLevel}</span>
          <button class="btn-table-action" style="padding:0.3rem 0.75rem; font-size:0.75rem; color:#993445; border-color:#fecdd3; background-color:#fff1f2; display:inline-flex; align-items:center; gap:0.25rem; height:auto; line-height:1;" onclick="event.stopPropagation(); shortlistComparisonCandidate('${side}');">
            <i data-lucide="user-plus" style="width:12px; height:12px;"></i> Shortlist
          </button>
        </div>

        <!-- Matched Skills -->
        <div class="compare-skill-section">
          <h5>✅ Matched Skills (${data.matchedSkills.length}/${data.matchedSkills.length + data.missingSkills.length})</h5>
          <div class="compare-skill-tags">
            ${matchedTags || '<span style="font-size:0.72rem;color:#94a3b8;">None matched</span>'}
          </div>
          <h5>❌ Missing Skills</h5>
          <div class="compare-skill-tags">
            ${missingTags || '<span style="font-size:0.72rem;color:#00695C;">All required skills present!</span>'}
          </div>
        </div>

        <!-- Improvement List -->
        <div class="compare-improve-list">
          <h5>🔧 What to Improve</h5>
          <ul>${improvements}</ul>
        </div>
      </div>
    `;
  }

  compareUploadedResults.style.display = "block";
  compareUploadedResults.innerHTML = `
    <!-- Winner Banner -->
    <div class="compare-winner-banner ${winnerClass}">
      <span class="compare-winner-icon">${winnerIcon}</span>
      <span>${escapeHtml(winnerText)}</span>
    </div>

    <!-- Side-by-Side Cards -->
    <div class="compare-cards">
      ${buildCard(dataA, dataA.dispScore > dataB.dispScore, 'A')}
      ${buildCard(dataB, dataB.dispScore > dataA.dispScore, 'B')}
    </div>
  `;

  // Animate bars and score numbers
  setTimeout(() => {
    compareUploadedResults.querySelectorAll(".compare-score-bar-fill[data-fill]").forEach(el => {
      el.style.width = el.dataset.fill + "%";
    });
    compareUploadedResults.querySelectorAll(".compare-score-num[data-target]").forEach(el => {
      animateCountUp(el, parseInt(el.dataset.target), 1000);
    });
    lucide.createIcons();
  }, 80);

  // Scroll to results
  compareUploadedResults.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// Wire up the button handler
if (compareUploadedBtn) {
  compareUploadedBtn.addEventListener("click", runUploadedComparison);
}

// ---------------------------------------------------------------------------
// Resume Comparison Control Actions (Remove, Shortlist, Clear All)
// ---------------------------------------------------------------------------

window.removeComparisonCandidate = function(side) {
  const zone = side === 'A' ? compareZoneA : compareZoneB;
  const statusEl = side === 'A' ? compareStatusA : compareStatusB;
  const fileInput = side === 'A' ? compareFileA : compareFileB;
  
  if (side === 'A') {
    compareCandidateDataA = null;
  } else {
    compareCandidateDataB = null;
  }
  
  fileInput.value = "";
  zone.className = "compare-upload-box";
  statusEl.innerHTML = "Drag & drop or click to upload (PDF/TXT)";
  
  // Hide results if we clear any candidate
  compareUploadedResults.style.display = "none";
};

window.shortlistComparisonCandidate = function(side) {
  const cand = side === 'A' ? compareCandidateDataA : compareCandidateDataB;
  if (!cand) return;
  
  // Check if candidate already exists in shortlist to avoid duplicate entries
  const exists = hrShortlist.some(c => c.name.toLowerCase() === cand.name.toLowerCase());
  if (exists) {
    alert(`${cand.name} is already in the HR Shortlist.`);
    return;
  }

  // Calculate matching items based on their profile to populate shortlist properly
  const profile = cand.fullProfile || {};
  const ruleMatches = calculateRuleBasedMatching(
    profile.skills       || "",
    profile.education    || "",
    profile.experience   || "",
    profile.projects     || "",
    profile.certificates || ""
  );
  
  const bestRule = ruleMatches[0] || { role: "N/A", score: 0, category: "Low Fit" };

  hrShortlist.push({
    name: cand.name,
    aiPredicted: cand.aiPredicted,
    aiConfidence: cand.aiConfidence,
    bestRuleRole: bestRule.role,
    bestRuleScore: bestRule.score,
    category: bestRule.category,
    fullProfile: profile
  });
  
  saveShortlist();
  renderShortlistTable();
  
  alert(`${cand.name} successfully added to the HR Shortlist!`);
};

const compareClearAllBtn = document.getElementById("compare-clear-all-btn");
if (compareClearAllBtn) {
  compareClearAllBtn.addEventListener("click", () => {
    removeComparisonCandidate('A');
    removeComparisonCandidate('B');
    compareUploadedResults.innerHTML = "";
    compareUploadedResults.style.display = "none";
  });
}

