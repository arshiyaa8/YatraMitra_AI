/**
 * explore.js — search box + monument grid (GET /api/monuments).
 * State filter options are derived from real results, not invented —
 * the backend has no separate "list states" endpoint.
 */

const state = {
  page: 1,
  limit: 12,
  search: "",
  stateFilter: "",
  knownStates: new Set(),
};

document.addEventListener("DOMContentLoaded", () => {
  if (!YM.nationality.require()) return;

  YM.renderHeader("explore");
  YM.renderAlertBanner("alert-banner-host");
  YM.renderFestivalBanner("festival-banner-host");

  document.getElementById("search-form").addEventListener("submit", (e) => {
    e.preventDefault();
    state.search = document.getElementById("search-input").value.trim();
    state.page = 1;
    loadMonuments();
  });

  document.getElementById("search-input").addEventListener(
    "input",
    YM.util.debounce((e) => {
      state.search = e.target.value.trim();
      state.page = 1;
      loadMonuments();
    }, 400)
  );

  document.getElementById("state-filter").addEventListener("change", (e) => {
    state.stateFilter = e.target.value;
    state.page = 1;
    loadMonuments();
  });

  loadMonuments();
});

async function loadMonuments() {
  const grid = document.getElementById("destination-grid");
  const status = document.getElementById("results-status");
  status.textContent = "Loading…";

  try {
    const res = await YM.api.listMonuments({
      search: state.search || undefined,
      state: state.stateFilter || undefined,
      page: state.page,
      limit: state.limit,
    });

    const items = res.data || [];
    items.forEach((m) => state.knownStates.add(m.state));
    populateStateFilter();

    if (items.length === 0) {
      grid.innerHTML = `<p class="empty-state">No monuments matched that search. Try a different name or state.</p>`;
    } else {
      grid.innerHTML = items.map(monumentCard).join("");
    }

    status.textContent = `${res.total} destination${res.total === 1 ? "" : "s"} found`;
    renderPagination(res.total, res.page);
  } catch (err) {
    console.error(err);
    grid.innerHTML = `<p class="empty-state">Couldn't reach the server. Is the backend running at ${window.YM_CONFIG.API_BASE_URL}?</p>`;
    status.textContent = "";
  }
}

function monumentCard(m) {
  const nationality = YM.nationality.get();
  const fee =
    m.entryFee && (nationality === "indian" ? m.entryFee.indian : m.entryFee.foreigner);
  const feeLabel =
    fee === 0 ? "Free entry" : fee ? `${m.entryFee.currency || "INR"} ${fee} entry` : "";

  return `
    <article class="card">
      <div class="card-arch" aria-hidden="true">
        <span class="card-arch-label">${YM.util.escapeHtml(m.category || "monument")}</span>
      </div>
      <div class="card-body">
        <h3>${YM.util.escapeHtml(m.name)}</h3>
        <p class="card-meta">${YM.util.escapeHtml(m.state)}${m.district ? `, ${YM.util.escapeHtml(m.district)}` : ""}</p>
        <p class="card-desc">${YM.util.escapeHtml(m.shortDescription || "")}</p>
        <div class="card-footer">
          ${feeLabel ? `<span class="badge badge--fee">${YM.util.escapeHtml(feeLabel)}</span>` : ""}
          ${m.isUnderexplored ? `<span class="badge badge--underexplored">Underexplored gem</span>` : ""}
        </div>
        <a class="card-link" href="monument.html?slug=${encodeURIComponent(m.slug)}">View details &rarr;</a>
      </div>
    </article>
  `;
}

function populateStateFilter() {
  const select = document.getElementById("state-filter");
  const existing = new Set(Array.from(select.options).map((o) => o.value));
  Array.from(state.knownStates)
    .sort()
    .forEach((s) => {
      if (!existing.has(s)) {
        const opt = document.createElement("option");
        opt.value = s;
        opt.textContent = s;
        select.appendChild(opt);
      }
    });
  select.value = state.stateFilter;
}

function renderPagination(total, page) {
  const host = document.getElementById("pagination");
  const totalPages = Math.max(1, Math.ceil(total / state.limit));
  if (totalPages <= 1) {
    host.innerHTML = "";
    return;
  }
  host.innerHTML = `
    <button class="btn btn--ghost" id="prev-page" ${page <= 1 ? "disabled" : ""}>&larr; Previous</button>
    <span class="pagination-status">Page ${page} of ${totalPages}</span>
    <button class="btn btn--ghost" id="next-page" ${page >= totalPages ? "disabled" : ""}>Next &rarr;</button>
  `;
  const prev = document.getElementById("prev-page");
  const next = document.getElementById("next-page");
  if (prev) prev.addEventListener("click", () => { state.page -= 1; loadMonuments(); window.scrollTo(0, 0); });
  if (next) next.addEventListener("click", () => { state.page += 1; loadMonuments(); window.scrollTo(0, 0); });
}
