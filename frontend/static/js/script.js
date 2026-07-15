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
