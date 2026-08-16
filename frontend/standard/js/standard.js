// Standard-path page logic. Relies on shared/js/monuments-data.js
// being loaded first (fetchMonuments, fetchMonumentById, escapeHtml, etc.)

document.addEventListener("DOMContentLoaded", () => {
  renderDestinationGrid();
  renderExploreSidebar();
  initExploreMap();
  renderMonumentDetail();
});

// --- index.html: featured destinations grid ---------------------------
async function renderDestinationGrid() {
  const grid = document.getElementById("destination-grid");
  if (!grid) return;

  try {
    const monuments = await fetchMonuments();
    grid.innerHTML = monuments.map(standardCardTemplate).join("");
  } catch (err) {
    grid.innerHTML = `<p style="color:var(--ink-soft);">Couldn't load destinations right now.</p>`;
    console.error(err);
  }
}

function standardCardTemplate(m) {
  return `
    <article class="card">
      <div class="card-arch"><span>${escapeHtml(m.region)}</span></div>
      <div class="card-body">
        <h3>${escapeHtml(m.name)}</h3>
        <p>${escapeHtml(m.tagline)}</p>
        <a class="card-link" href="monument.html?id=${encodeURIComponent(m.id)}">View details &rarr;</a>
      </div>
    </article>
  `;
}

// --- explore.html: sidebar list -----------------------------------------
async function renderExploreSidebar() {
  const list = document.getElementById("sidebar-list");
  if (!list) return;

  try {
    const monuments = await fetchMonuments();
    list.innerHTML = monuments.map(m => `
      <a class="sidebar-item" href="monument.html?id=${encodeURIComponent(m.id)}">
        <h3>${escapeHtml(m.name)}</h3>
        <p>${escapeHtml(m.region)}</p>
      </a>
    `).join("");
  } catch (err) {
    list.innerHTML = `<p style="color:var(--ink-soft);">Couldn't load destinations right now.</p>`;
    console.error(err);
  }
}

// --- explore.html: Leaflet map -------------------------------------------
async function initExploreMap() {
  const mapEl = document.getElementById("map");
  if (!mapEl || typeof L === "undefined") return;

  const map = L.map("map").setView([22.5, 80], 5);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 18
  }).addTo(map);

  try {
    const monuments = await fetchMonuments();
    monuments.forEach(m => {
      L.marker([m.lat, m.lng]).addTo(map)
        .bindPopup(`<strong>${escapeHtml(m.name)}</strong><br>${escapeHtml(m.region)}<br><a href="monument.html?id=${encodeURIComponent(m.id)}">View details</a>`);
    });
  } catch (err) {
    console.error(err);
  }
}

// --- monument.html: detail page -------------------------------------------
async function renderMonumentDetail() {
  const container = document.getElementById("monument-detail");
  if (!container) return;

  const id = getMonumentIdFromUrl();
  const monument = id ? await fetchMonumentById(id) : null;

  if (!monument) {
    container.innerHTML = `<p>We couldn't find that destination. <a href="explore.html">Back to explore</a></p>`;
    return;
  }

  document.title = `${monument.name} — Vistaara`;
  document.getElementById("monument-region").textContent = monument.region;
  document.getElementById("monument-name").textContent = monument.name;
  document.getElementById("monument-tagline").textContent = monument.tagline;
}