// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
// Same-origin by default (Flask serves this page + /api/* from one app).
// If the frontend is ever hosted separately from the backend, set the full
// backend URL here instead, e.g. "https://your-api.example.com"
const API_BASE_URL = "";

// ---------------------------------------------------------------------------
// Elements
// ---------------------------------------------------------------------------
const form = document.getElementById("resume-form");
const submitBtn = document.getElementById("submit-btn");
const formHint = document.getElementById("form-hint");

const resultSection = document.getElementById("result-section");
const resultRole = document.getElementById("result-role");
const resultConfidence = document.getElementById("result-confidence");
const rankList = document.getElementById("rank-list");

const statusLine = document.getElementById("status-line");
const footerStatus = document.getElementById("footer-status");

// ---------------------------------------------------------------------------
// Health check on load
// ---------------------------------------------------------------------------
async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`);
    const data = await res.json();
    if (data.status === "ok") {
      const roleCount = data.roles ? data.roles.length : 0;
      footerStatus.textContent = `Backend ready — ${roleCount} roles known`;
    } else {
      footerStatus.textContent = `Backend reported an error: ${data.detail || "unknown"}`;
    }
  } catch (err) {
    footerStatus.textContent = "Can't reach the backend right now.";
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

function setStatus(message, isError = false) {
  statusLine.textContent = message;
  statusLine.classList.toggle("is-error", isError);
}

// ---------------------------------------------------------------------------
// Render result
// ---------------------------------------------------------------------------
function renderResult(data) {
  resultRole.textContent = data.predicted_role || "—";

  if (typeof data.confidence === "number") {
    resultConfidence.textContent = `${Math.round(data.confidence * 100)}% confidence`;
  } else {
    resultConfidence.textContent = "";
  }

  if (data.top_roles && data.top_roles.length) {
    rankList.innerHTML = data.top_roles
      .map(
        (r) => `
          <div class="rank-row">
            <span class="rank-name">${escapeHtml(r.role)}</span>
            <span class="rank-score">${Math.round(r.score * 100)}%</span>
            <div class="rank-track"><div class="rank-fill" style="width:${Math.round(r.score * 100)}%"></div></div>
          </div>`
      )
      .join("");
  } else {
    rankList.innerHTML = "";
  }

  resultSection.hidden = false;
}

// ---------------------------------------------------------------------------
// Submit
// ---------------------------------------------------------------------------
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {
    education: document.getElementById("education").value.trim(),
    experience: document.getElementById("experience").value.trim(),
    projects: document.getElementById("projects").value.trim(),
    skills: document.getElementById("skills").value.trim(),
    certificates: document.getElementById("certificates").value.trim(),
  };

  const hasContent = Object.values(payload).some((v) => v.length > 0);
  if (!hasContent) {
    formHint.textContent = "Fill in at least one field first.";
    formHint.classList.add("is-error");
    return;
  }

  formHint.classList.remove("is-error");
  formHint.textContent = "Matching…";
  submitBtn.disabled = true;
  resultSection.hidden = true;
  setStatus("");

  try {
    const res = await fetch(`${API_BASE_URL}/api/predict-role`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) {
      formHint.textContent = "";
      setStatus(data.error || "Something went wrong.", true);
      return;
    }

    formHint.textContent = "";
    renderResult(data);
  } catch (err) {
    formHint.textContent = "";
    setStatus("Couldn't reach the backend. Is it running?", true);
  } finally {
    submitBtn.disabled = false;
  }
});
