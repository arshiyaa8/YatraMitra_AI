/**
 * laws.js
 *
 * INTENTIONALLY NOT CONNECTED.
 * `tourism-ml/laws.py` has national + statewise laws/etiquette content, but it's a Python
 * console script with no HTTP endpoint — there is nothing for this page to call right now.
 *
 * When that content is exposed (e.g. a future `GET /api/laws?state=` on the Node backend,
 * or a small Flask/FastAPI service wrapping tourism-ml the way ai_api.py already does for
 * the crowd model), replace loadLawsContent() below with a real YM.api call:
 *
 *   const res = await YM.api.getLaws({ state });
 *   render res.data into #laws-content
 *
 * Nothing else on this page needs to change.
 */

document.addEventListener("DOMContentLoaded", () => {
  if (!YM.nationality.require()) return;
  YM.renderHeader("laws");
  loadLawsContent();
});

function loadLawsContent() {
  const host = document.getElementById("laws-content");
  host.innerHTML = `
    <p class="empty-state">
      General laws and etiquette content will appear here once it's connected to the backend.
      In the meantime, every monument page already shows a live, real "Dos &amp; don'ts at this
      site" section pulled straight from that monument's own database record.
    </p>
    <a class="btn btn--primary" href="explore.html">Browse monuments &rarr;</a>
  `;
}
