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
function renderReport(candidateName, aiData, ruleData) {
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
          const pageText = textContent.items.map(item => item.str).join(" ");
          fullText += pageText + "\n";
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
  
  // 1. Extract Candidate Name (heuristics: look at first 5 lines)
  let candidateName = "";
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];
    // Ignore lines that look like contact info, links, or sections
    if (line.includes('@') || line.includes('/') || line.includes('+') || /\b(resume|cv|portfolio|email|phone|address|education|skills|experience)\b/i.test(line)) {
      continue;
    }
    // Check if it looks like a name (capitalized words)
    if (/^[A-Z][a-zA-Z\s\.]{2,30}$/.test(line)) {
      candidateName = line;
      break;
    }
  }
  if (!candidateName && lines.length > 0) {
    candidateName = lines[0]; // fallback to first line
  }

  // 2. Extract Sections by identifying keywords
  // We can group lines under common section titles
  let currentSection = "general";
  const sections = {
    education: [],
    experience: [],
    skills: [],
    projects: [],
    certificates: []
  };

  const sectionKeywords = {
    education: /\b(education|academic|qualification|studies|university|college|degree)\b/i,
    experience: /\b(experience|employment|work|history|career|job|internship|intern)\b/i,
    skills: /\b(skills|technical skills|technologies|proficiencies|tools|languages)\b/i,
    projects: /\b(projects|key projects|academic projects|personal projects|development projects)\b/i,
    certificates: /\b(certifications|certificates|courses|credentials|achievements|training)\b/i
  };

  lines.forEach(line => {
    // Check if line matches a new section header
    let matchedNewSection = false;
    for (const [secName, regex] of Object.entries(sectionKeywords)) {
      // Typically section headers are short lines
      if (line.length < 35 && regex.test(line)) {
        currentSection = secName;
        matchedNewSection = true;
        break;
      }
    }

    if (!matchedNewSection) {
      if (currentSection !== "general") {
        sections[currentSection].push(line);
      }
    }
  });

  // If a section is empty, let's fall back to scans or heuristics
  // Let's also build a wide dictionary scan for skills to ensure they are parsed accurately even if the document has custom formatting
  const dictionarySkills = [
    "python", "sql", "power bi", "tableau", "excel", "pandas", "numpy", "statistics", "data analysis", "r",
    "html", "css", "javascript", "react", "node.js", "git", "flask", "django", "seo", "sem", "social media",
    "google analytics", "content writing", "canva", "meta ads", "email marketing", "figma", "photoshop",
    "illustrator", "ui/ux", "typography", "premiere pro", "after effects", "recruiting", "communication",
    "ms office", "management", "scheduling", "operations", "hris", "java", "c++", "c#", "aws", "docker",
    "kubernetes", "linux", "cloud", "machine learning", "deep learning", "nlp"
  ];

  let skillsList = [];
  // Scan the entire text for skills in our dictionary
  const lowerText = text.toLowerCase();
  dictionarySkills.forEach(skill => {
    const escaped = skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(lowerText)) {
      // capitalize nicely
      const matchedSkill = skill.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      skillsList.push(formattedSkill(matchedSkill));
    }
  });

  // If we found skills in the dedicated section, merge/use them
  if (sections.skills.length > 0) {
    const sectionSkillsText = sections.skills.join(', ');
    // Extract comma-separated words or bullet points
    const customSkills = sectionSkillsText.split(/[,;\n•|]/).map(s => s.trim()).filter(s => s.length > 1 && s.length < 25);
    customSkills.forEach(cs => {
      const formatted = cs.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      if (!skillsList.includes(formatted)) {
        skillsList.push(formatted);
      }
    });
  }

  // Format parsed components
  const parsedData = {
    name: candidateName.trim(),
    education: sections.education.slice(0, 4).join(" ").trim(),
    experience: sections.experience.slice(0, 4).join(" ").trim() || "Fresher",
    skills: skillsList.slice(0, 15).join(", "),
    projects: sections.projects.slice(0, 5).join(" ").trim(),
    certificates: sections.certificates.slice(0, 4).join(", ").trim()
  };

  // Fallback checks if any main section is empty:
  if (!parsedData.education) {
    // Search the text for lines mentioning degree or B.Tech/MBA etc
    const eduMatches = lines.filter(l => /\b(b\.?tech|b\.?e|bca|mca|mba|degree|bachelor|master|university|college|school)\b/i.test(l));
    parsedData.education = eduMatches.slice(0, 2).join(" ");
  }

  if (!parsedData.experience || parsedData.experience === "Fresher") {
    // Search for lines mentioning work experience or months/years
    const expMatches = lines.filter(l => /\b(internship|months|years|worked|experience|position|role|fresher)\b/i.test(l));
    if (expMatches.length > 0) {
      parsedData.experience = expMatches.slice(0, 2).join(" ");
    }
  }

  return parsedData;
}

function formattedSkill(skillName) {
  // Normalize custom names
  if (skillName.toLowerCase() === "sql") return "SQL";
  if (skillName.toLowerCase() === "seo") return "SEO";
  if (skillName.toLowerCase() === "sem") return "SEM";
  if (skillName.toLowerCase() === "hris") return "HRIS";
  if (skillName.toLowerCase() === "nlp") return "NLP";
  return skillName;
}

