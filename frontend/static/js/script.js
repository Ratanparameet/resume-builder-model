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
    recommendationText = `<strong>Low Matrix Match.</strong> Candidate does not meet the baseline skill matrix thresholds for Graphura's standard roles. `;
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
    const res = await fetch(`${API_BASE_URL}/api/predict-role`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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

uploadZone.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadZone.classList.remove("dragover");
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    handleUploadedFile(files[0]);
  }
});

fileInput.addEventListener("change", (e) => {
  const files = e.target.files;
  if (files.length > 0) {
    handleUploadedFile(files[0]);
  }
});

async function handleUploadedFile(file) {
  const fileExt = file.name.split('.').pop().toLowerCase();
  
  if (fileExt !== 'pdf' && fileExt !== 'txt') {
    alert("Please upload a valid PDF or TXT file.");
    return;
  }

  // Visual state change
  uploadZone.classList.add("parsing");
  const pTag = uploadZone.querySelector("p");
  const icon = uploadZone.querySelector(".upload-icon");
  pTag.innerHTML = `Extracting data from <strong style="color:var(--accent-gold);">${file.name}</strong>...`;
  icon.setAttribute("data-lucide", "loader-2");
  icon.classList.add("animate-spin");
  lucide.createIcons();

  const reader = new FileReader();

  if (fileExt === 'txt') {
    reader.onload = function(e) {
      const text = e.target.result;
      processExtractedText(text);
    };
    reader.readAsText(file);
  } else if (fileExt === 'pdf') {
    // Configure PDF.js worker Src
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
    
    reader.onload = async function(e) {
      const typedarray = new Uint8Array(e.target.result);
      try {
        // PDF.js parse
        const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
        let fullText = "";
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          
          // Reconstruct lines using item transform positioning
          const items = textContent.items;
          const tolerance = 4; // pixels for same visual line
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
          
          // Sort lines from top to bottom
          const sortedYKeys = Object.keys(linesMap).sort((a, b) => parseFloat(b) - parseFloat(a));
          
          sortedYKeys.forEach(yKey => {
            // Sort items on the same line from left to right
            const lineItems = linesMap[yKey].sort((a, b) => a.x - b.x);
            const lineStr = lineItems.map(item => item.text).join(" ").trim();
            if (lineStr.length > 0) {
              fullText += lineStr + "\n";
            }
          });
          fullText += "\n";
        }
        
        processExtractedText(fullText);
      } catch (err) {
        console.error("PDF extraction failed", err);
        alert("Failed to parse PDF file. Please ensure it is a text-based PDF (not scanned/image-based) or try a TXT file.");
        resetUploadZone();
      }
    };
    reader.readAsArrayBuffer(file);
  }
}

function processExtractedText(text) {
  if (!text || text.trim().length === 0) {
    alert("No text content could be extracted from the resume.");
    resetUploadZone();
    return;
  }

  const parsed = parseResumeText(text);
  
  // Fill form columns
  document.getElementById("candidate-name").value = parsed.name || "";
  document.getElementById("education").value = parsed.education || "";
  document.getElementById("experience").value = parsed.experience || "";
  document.getElementById("skills").value = parsed.skills || "";
  document.getElementById("projects").value = parsed.projects || "";
  document.getElementById("certificates").value = parsed.certificates || "";
  
  // Trigger form submit to run match analysis immediately
  setTimeout(() => {
    resetUploadZone();
    form.dispatchEvent(new Event('submit'));
  }, 800);
}

function resetUploadZone() {
  uploadZone.classList.remove("parsing");
  const pTag = uploadZone.querySelector("p");
  const icon = uploadZone.querySelector(".upload-icon");
  pTag.innerHTML = `Drag & drop candidate resume (PDF or TXT) or <span class="browse-link">browse</span>`;
  icon.setAttribute("data-lucide", "upload-cloud");
  icon.classList.remove("animate-spin");
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

        const res = await fetch(`${API_BASE_URL}/api/predict-role`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
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
        const aiConfStr = c.aiConfidence > 0 ? `${Math.round(c.aiConfidence * 100)}%` : "N/A";
        
        return `
          <tr>
            <td><strong>#${idx + 1}</strong></td>
            <td><strong>${escapeHtml(c.name)}</strong></td>
            <td><span class="badge-score font-mono">${scorePercent}</span></td>
            <td><span class="fit-tag ${catClass}">${c.category}</span></td>
            <td>
              <span class="badge-conf" style="background-color:#f1f5f9; color:#475569; padding:0.15rem 0.4rem; border-radius:4px; font-size:0.75rem;">
                ${escapeHtml(c.aiPredicted)}
              </span>
              <span style="font-size:0.75rem; color:#64748b; font-family:var(--font-mono); margin-left:0.25rem;">(${aiConfStr})</span>
            </td>
            <td style="max-width:220px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${escapeHtml(c.skills)}">
              ${escapeHtml(c.skills || "None")}
            </td>
            <td>
              <div style="display:flex; gap:0.35rem;">
                <button class="btn-table-action" onclick="loadBatchCandidate(${idx})">Load Profiler</button>
                <button class="btn-table-action" id="batch-shortlist-btn-${idx}" style="color:#0284c7; border-color:#93c5fd; background-color:#f0f9ff;" onclick="shortlistBatchCandidate(${idx})">
                  <i data-lucide="user-plus" style="width:12px; height:12px; display:inline-block;"></i> Shortlist
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
    
    // Scroll results table into view
    batchResults.scrollIntoView({ behavior: 'smooth' });
  }, 500);
}

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
  const stored = localStorage.getItem("graphura_hr_shortlist");
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
  localStorage.setItem("graphura_hr_shortlist", JSON.stringify(hrShortlist));
}

function renderShortlistTable() {
  const tableBody = document.getElementById("shortlist-table-body");
  if (!tableBody) return;

  if (hrShortlist.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; color:#64748b; padding: 2rem;">No candidates currently shortlisted. Run match analyses to shortlist applicants.</td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = hrShortlist
    .map((c, idx) => {
      let catClass = "low-fit";
      if (c.category === "Strong Fit") catClass = "strong-fit";
      if (c.category === "Moderate Fit") catClass = "moderate-fit";

      const scorePercent = `${c.bestRuleScore}%`;
      const aiConfStr = c.aiConfidence > 0 ? `${Math.round(c.aiConfidence * 100)}%` : "N/A";

      return `
        <tr>
          <td><strong>${escapeHtml(c.name)}</strong></td>
          <td>
            <span class="badge-conf" style="background-color:#f1f5f9; color:#475569; padding:0.15rem 0.4rem; border-radius:4px; font-size:0.75rem;">
              ${escapeHtml(c.aiPredicted)}
            </span>
          </td>
          <td><span class="badge-conf">${aiConfStr}</span></td>
          <td>${escapeHtml(c.bestRuleRole)}</td>
          <td><span class="badge-score font-mono">${scorePercent}</span></td>
          <td><span class="fit-tag ${catClass}">${c.category}</span></td>
          <td>
            <div style="display:flex; gap:0.5rem;">
              <button class="btn-table-action" onclick="loadShortlistCandidate(${idx})">Load Profiler</button>
              <button class="btn-table-action" style="color:#ef4444; border-color:#fca5a5; background-color:#fff5f5;" onclick="removeShortlistCandidate(${idx})">
                <i data-lucide="trash-2" style="width:12px; height:12px; display:inline-block; vertical-align:middle;"></i> Remove
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  lucide.createIcons();
}

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
  if (confirm(`Are you sure you want to remove ${hrShortlist[idx].name} from the shortlist?`)) {
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
    if (confirm("Are you sure you want to clear the entire shortlist?")) {
      hrShortlist = [];
      saveShortlist();
      renderShortlistTable();
    }
  });
}

// Initialize HR Shortlist on startup
loadShortlist();
renderShortlistTable();



