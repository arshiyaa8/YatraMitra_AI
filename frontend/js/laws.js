/**
 * laws.js — Interactive Laws, Culture & Regional Dining Guide.
 * Fetches real data from GET /api/laws (powered by lawController.js).
 */

let allLawsData = null;

document.addEventListener("DOMContentLoaded", () => {
  if (!YM.nationality.require()) return;
  YM.renderHeader("laws");

  const stateSelect = document.getElementById("state-select");
  const urlState = YM.util.qs("state");

  stateSelect.addEventListener("change", (e) => {
    const selectedState = e.target.value;
    renderStateHighlights(selectedState);
  });

  loadLaws(urlState);
});

async function loadLaws(initialState = "") {
  const loadingEl = document.getElementById("laws-loading");
  const errorEl = document.getElementById("laws-error");
  const mainContent = document.getElementById("laws-main-content");

  loadingEl.hidden = false;
  errorEl.hidden = true;
  mainContent.hidden = true;

  try {
    const res = await YM.api.getLaws();
    allLawsData = res;

    // 1. Populate State Dropdown
    populateStateDropdown(res.availableStates || [], initialState);

    // 2. Render National Guidelines
    renderNationalGuidelines(res);

    // 3. Render State Card if initial state was specified
    if (initialState) {
      document.getElementById("state-select").value = initialState;
      renderStateHighlights(initialState);
    }

    loadingEl.hidden = true;
    mainContent.hidden = false;
  } catch (err) {
    console.error("Failed to load laws & culture data:", err);
    loadingEl.hidden = true;
    errorEl.textContent = "Unable to load travel guidelines. Please ensure the backend is running.";
    errorEl.hidden = false;
  }
}

function populateStateDropdown(states, activeState = "") {
  const select = document.getElementById("state-select");
  const existingValues = new Set(Array.from(select.options).map((o) => o.value));

  states.forEach((state) => {
    if (!existingValues.has(state)) {
      const opt = document.createElement("option");
      opt.value = state;
      opt.textContent = `${state} (State Specifics)`;
      select.appendChild(opt);
    }
  });

  if (activeState && states.includes(activeState)) {
    select.value = activeState;
  }
}

function renderNationalGuidelines(data) {
  // National Laws
  const lawsContainer = document.getElementById("national-laws-list");
  lawsContainer.innerHTML = (data.nationalLaws || [])
    .map(
      (item) => `
        <article class="law-item">
          <h3>📌 ${YM.util.escapeHtml(item.title)}</h3>
          <p>${YM.util.escapeHtml(item.description)}</p>
        </article>
      `
    )
    .join("");

  // General Culture
  const cultureContainer = document.getElementById("general-culture-list");
  cultureContainer.innerHTML = (data.generalCulture || [])
    .map(
      (item) => `
        <article class="law-item">
          <h3>✨ ${YM.util.escapeHtml(item.title)}</h3>
          <p>${YM.util.escapeHtml(item.description)}</p>
        </article>
      `
    )
    .join("");

  // General Food
  const foodContainer = document.getElementById("general-food-list");
  foodContainer.innerHTML = (data.generalFood || [])
    .map(
      (item) => `
        <article class="law-item">
          <h3>🍽️ ${YM.util.escapeHtml(item.title)}</h3>
          <p>${YM.util.escapeHtml(item.description)}</p>
        </article>
      `
    )
    .join("");

  // Disclaimer
  const disclaimerEl = document.getElementById("laws-disclaimer");
  disclaimerEl.textContent =
    data.disclaimer ||
    "This is general public information for travelers, NOT legal advice. Laws change over time; verify with official sources.";
}

async function renderStateHighlights(stateName) {
  const container = document.getElementById("state-highlight-container");
  const titleEl = document.getElementById("state-title");
  const contentEl = document.getElementById("state-content");

  if (!stateName) {
    container.hidden = true;
    return;
  }

  contentEl.innerHTML = `<p style="color:var(--ink-soft);">Loading specific rules for ${YM.util.escapeHtml(stateName)}…</p>`;
  container.hidden = false;

  try {
    const res = await YM.api.getLaws({ state: stateName });
    titleEl.textContent = `📍 ${res.state} Local Guidelines & Culture`;

    if (!res.hasSpecificData) {
      contentEl.innerHTML = `
        <p style="color:var(--ink-soft); font-style:italic;">
          ${YM.util.escapeHtml(res.message || "Showing general national guidelines.")}
        </p>
      `;
      return;
    }

    let html = "";

    // State Laws
    if (res.laws && res.laws.length > 0) {
      html += `
        <div>
          <h4 style="margin:0 0 0.4rem; color:var(--maroon-dark); font-size:0.98rem;">⚖️ State Laws &amp; Regulations:</h4>
          <ul style="margin:0; padding-left:1.25rem; font-size:0.9rem; line-height:1.5;">
            ${res.laws.map((law) => `<li>${YM.util.escapeHtml(law)}</li>`).join("")}
          </ul>
        </div>
      `;
    }

    // State Culture
    if (res.culture) {
      html += `
        <div>
          <h4 style="margin:0 0 0.4rem; color:var(--maroon-dark); font-size:0.98rem;">🎭 Cultural Heritage &amp; Traditions:</h4>
          <p style="margin:0; font-size:0.9rem; line-height:1.5; color:var(--ink);">${YM.util.escapeHtml(res.culture)}</p>
        </div>
      `;
    }

    // State Food
    if (res.food) {
      html += `
        <div>
          <h4 style="margin:0 0 0.4rem; color:var(--maroon-dark); font-size:0.98rem;">🍲 Regional Flavors &amp; Specialties:</h4>
          <p style="margin:0; font-size:0.9rem; line-height:1.5; color:var(--ink);">${YM.util.escapeHtml(res.food)}</p>
        </div>
      `;
    }

    contentEl.innerHTML = html;
  } catch (err) {
    console.error("Error fetching state specifics:", err);
    contentEl.innerHTML = `<p style="color:var(--danger);">Unable to load specific data for this state.</p>`;
  }
}
