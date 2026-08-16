// Accessibility-path page logic. Relies on shared/js/monuments-data.js
// being loaded first (fetchMonuments, fetchMonumentById, escapeHtml, etc.)

document.addEventListener("DOMContentLoaded", () => {
  applyStoredTextSize();
  initTextSizeControls();
  renderDestinationList();
  renderMonumentDetail();
});

// --- Text size control (persists across pages via localStorage) --------
const TEXT_SIZE_STEPS = ["100%", "112%", "128%"];
const TEXT_SIZE_KEY = "vistaara-text-size";

function applyStoredTextSize() {
  const stored = localStorage.getItem(TEXT_SIZE_KEY);
  if (stored) document.documentElement.style.fontSize = stored;
}

function initTextSizeControls() {
  const controls = document.getElementById("text-size-controls");
  if (!controls) return;

  controls.addEventListener("click", (e) => {
    const step = e.target.getAttribute("data-size");
    if (!step) return;
    document.documentElement.style.fontSize = step;
    localStorage.setItem(TEXT_SIZE_KEY, step);
  });
}

// --- index.html: destination list (plain, no decorative art) -----------
async function renderDestinationList() {
  const list = document.getElementById("destination-list");
  if (!list) return;

  try {
    const monuments = await fetchMonuments();
    list.innerHTML = monuments.map(m => `
      <a class="destination-item" href="monument.html?id=${encodeURIComponent(m.id)}">
        <span class="region-tag">${escapeHtml(m.region)}</span>
        <h3>${escapeHtml(m.name)}</h3>
        <p>${escapeHtml(m.tagline)}</p>
      </a>
    `).join("");
  } catch (err) {
    list.innerHTML = `<p>We couldn't load destinations right now. Please try again shortly.</p>`;
    console.error(err);
  }
}

// --- monument.html: detail page ------------------------------------------
async function renderMonumentDetail() {
  const container = document.getElementById("monument-detail");
  if (!container) return;

  const id = getMonumentIdFromUrl();
  const monument = id ? await fetchMonumentById(id) : null;

  if (!monument) {
    container.innerHTML = `<p>We couldn't find that destination. <a href="index.html">Back to destinations</a></p>`;
    return;
  }

  document.title = `${monument.name} — Vistaara`;
  document.getElementById("monument-region").textContent = monument.region;
  document.getElementById("monument-name").textContent = monument.name;
  document.getElementById("monument-tagline").textContent = monument.tagline;
}