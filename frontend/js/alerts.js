/**
 * alerts.js — National Safety & Disaster Early Warnings Controller
 *
 * Integrates live disaster alerts sourced from the NDMA SACHET network,
 * supporting geographical area search, disaster severity badges, and safety instructions.
 */

document.addEventListener("DOMContentLoaded", () => {
  YM.renderHeader("alerts");

  document.getElementById("alert-area-filter").addEventListener(
    "input",
    YM.util.debounce(() => loadAlerts(), 400)
  );
  document.getElementById("alert-type-filter").addEventListener("change", () => loadAlerts());

  loadAlerts();
});

async function loadAlerts() {
  const host = document.getElementById("alerts-list");
  host.innerHTML = `<p class="loading-state">Loading…</p>`;

  const area = document.getElementById("alert-area-filter").value.trim();
  const type = document.getElementById("alert-type-filter").value;

  try {
    const res = await YM.api.getAlerts({ area: area || undefined, type: type || undefined });
    const alerts = res.data || [];
    if (!alerts.length) {
      host.innerHTML = `<p class="empty-state">No active alerts match this filter right now — that's good news.</p>`;
      return;
    }
    host.innerHTML = alerts.map(alertItem).join("");
  } catch (err) {
    console.error(err);
    host.innerHTML = `<p class="empty-state">Couldn't reach the server. Is the backend running at ${window.YM_CONFIG.API_BASE_URL}?</p>`;
  }
}

function alertItem(a) {
  const effective = a.effective ? new Date(a.effective).toLocaleString() : null;
  const expires = a.expires ? new Date(a.expires).toLocaleString() : null;

  return `
    <div class="list-item">
      <div class="list-item-head">
        <span class="list-item-title">${YM.util.escapeHtml(a.headline || a.type)}</span>
        <span class="severity-tag severity-tag--${YM.util.escapeHtml(a.severity || "unknown")}">${YM.util.escapeHtml(a.severity || "unknown")}</span>
      </div>
      <p class="list-item-meta">${YM.util.escapeHtml(a.areaDescription || "")} · ${YM.util.escapeHtml((a.type || "other").replaceAll("_", " "))}</p>
      ${a.description ? `<p>${YM.util.escapeHtml(a.description)}</p>` : ""}
      ${a.instruction ? `<p><strong>Instruction:</strong> ${YM.util.escapeHtml(a.instruction)}</p>` : ""}
      <p class="list-item-meta">
        ${effective ? `Effective: ${effective}` : ""}${effective && expires ? " · " : ""}${expires ? `Expires: ${expires}` : ""}
      </p>
      ${a.sourceUrl ? `<a href="${a.sourceUrl}" target="_blank" rel="noopener">Official source &rarr;</a>` : ""}
    </div>
  `;
}
