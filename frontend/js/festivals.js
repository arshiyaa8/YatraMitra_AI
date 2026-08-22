/**
 * festivals.js — GET /api/festivals/active and GET /api/festivals/upcoming.
 * These endpoints existed in the backend already but weren't used by any
 * page before — this is the first UI surface for them.
 */

document.addEventListener("DOMContentLoaded", () => {
  if (!YM.nationality.require()) return;
  YM.renderHeader("festivals");

  document.getElementById("festival-state-filter").addEventListener("change", (e) => {
    loadFestivals(e.target.value);
  });

  loadFestivals("");
});

async function loadFestivals(state) {
  const activeHost = document.getElementById("active-festivals");
  const upcomingHost = document.getElementById("upcoming-festivals");
  activeHost.innerHTML = `<p class="loading-state">Loading…</p>`;
  upcomingHost.innerHTML = "";

  try {
    const [activeRes, upcomingRes] = await Promise.all([
      YM.api.getActiveFestivals({ state: state || undefined }),
      YM.api.getUpcomingFestivals({ state: state || undefined, days: 60 }),
    ]);

    renderFestivalList(activeHost, activeRes.data || [], "Nothing is currently underway.");
    renderFestivalList(upcomingHost, upcomingRes.data || [], "Nothing in the next 60 days.");
  } catch (err) {
    console.error(err);
    activeHost.innerHTML = `<p class="empty-state">Couldn't reach the server. Is the backend running at ${window.YM_CONFIG.API_BASE_URL}?</p>`;
  }
}

function renderFestivalList(host, festivals, emptyMessage) {
  if (!festivals.length) {
    host.innerHTML = `<p class="empty-state">${emptyMessage}</p>`;
    return;
  }
  host.innerHTML = festivals.map(festivalItem).join("");
}

function festivalItem(f) {
  const start = new Date(f.date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  const end = f.endDate ? new Date(f.endDate).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : null;
  const states = (f.states || []).includes("ALL") ? "Nationwide" : (f.states || []).join(", ") || "—";

  return `
    <div class="list-item">
      <div class="list-item-head">
        <span class="list-item-title">${YM.util.escapeHtml(f.name)}</span>
        <span class="badge badge--fee">${YM.util.escapeHtml(f.type || "festival")}</span>
      </div>
      <p class="list-item-meta">${start}${end ? ` – ${end}` : ""} · ${YM.util.escapeHtml(states)} · Tourist impact: ${YM.util.escapeHtml(f.touristImpact || "medium")}</p>
      ${f.notes ? `<p>${YM.util.escapeHtml(f.notes)}</p>` : ""}
    </div>
  `;
}
