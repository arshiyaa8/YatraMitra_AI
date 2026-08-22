/**
 * laws.js
 *
 * INTENTIONALLY NOT CONNECTED YET.
 * `tourism-ml/laws.py` has national + statewise laws/etiquette content, but it's a Python
 * console script with no HTTP endpoint — there is nothing for this page to call right now.
 *
 * When that content is exposed (e.g. a future `GET /api/laws?state=` on the Node backend,
 * or a small FastAPI service wrapping tourism-ml), replace loadLawsContent() below with a
 * real YM.api call, following the same pattern as every other page in this frontend:
 *
 *   const res = await YM.api.getLaws({ state });
 *   render res.data into #laws-content
 *
 * Nothing else on this page needs to change.
 */

document.addEventListener("DOMContentLoaded", () => {
  YM.renderHeader("laws");
  loadLawsContent();
});

function loadLawsContent() {
  const host = document.getElementById("laws-content");
  host.innerHTML = `
    <p class="empty-state">
      Laws and etiquette content will appear here once it's connected to the backend.
      For now, check monument-specific "Dos &amp; don'ts" on each individual monument page —
      that part already comes from live data.
    </p>
  `;
}
