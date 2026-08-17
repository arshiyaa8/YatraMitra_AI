// Shared data-access layer for monument listings.
// /standard/*.html and /accessibility/*.html are both one folder deep
// from the project root, so this relative path resolves from either.

const MONUMENTS_JSON_PATH = "../shared/data/monuments.json";

async function fetchMonuments() {
  const res = await fetch(MONUMENTS_JSON_PATH);
  if (!res.ok) throw new Error("Failed to load monuments.json");
  return res.json();
}

async function fetchMonumentById(id) {
  const monuments = await fetchMonuments();
  return monuments.find((m) => m.id === id) || null;
}

function getMonumentIdFromUrl() {
  return new URLSearchParams(window.location.search).get("id");
}

// Minimal HTML-escaping so JSON content never breaks markup.
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
