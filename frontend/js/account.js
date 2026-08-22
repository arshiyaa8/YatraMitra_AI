/**
 * account.js — login, register, and account summary (GET /api/auth/me).
 */

document.addEventListener("DOMContentLoaded", () => {
  YM.renderHeader("account");

  if (YM.auth.isLoggedIn()) {
    showLoggedIn();
  } else {
    setupTabs();
    setupLoginForm();
    setupRegisterForm();
  }
});

function setupTabs() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("tab-btn--active"));
      btn.classList.add("tab-btn--active");
      const tab = btn.getAttribute("data-tab");
      document.getElementById("login-form").hidden = tab !== "login";
      document.getElementById("register-form").hidden = tab !== "register";
    });
  });
}

function setupLoginForm() {
  const form = document.getElementById("login-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const status = document.getElementById("login-status");
    status.textContent = "Logging in…";
    try {
      const res = await YM.api.login({
        email: document.getElementById("login-email").value,
        password: document.getElementById("login-password").value,
      });
      YM.auth.save(res.token, res.user);
      window.location.href = "explore.html";
    } catch (err) {
      status.textContent = err.message;
    }
  });
}

function setupRegisterForm() {
  const form = document.getElementById("register-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const status = document.getElementById("register-status");
    status.textContent = "Creating account…";
    try {
      const res = await YM.api.register({
        name: document.getElementById("register-name").value,
        email: document.getElementById("register-email").value,
        password: document.getElementById("register-password").value,
        preferredLanguage: YM.lang.get(),
      });
      YM.auth.save(res.token, res.user);
      window.location.href = "explore.html";
    } catch (err) {
      status.textContent = err.message;
    }
  });
}

async function showLoggedIn() {
  document.getElementById("auth-forms").hidden = true;
  const view = document.getElementById("logged-in-view");
  view.hidden = false;

  const user = YM.auth.getUser();
  const details = document.getElementById("account-details");
  details.innerHTML = `
    <div><dt>Name</dt><dd>${YM.util.escapeHtml(user.name)}</dd></div>
    <div><dt>Email</dt><dd>${YM.util.escapeHtml(user.email)}</dd></div>
    <div><dt>Preferred language</dt><dd>${YM.util.escapeHtml(user.preferredLanguage || "en")}</dd></div>
    <div><dt>Visitor type</dt><dd>${YM.util.escapeHtml(YM.nationality.label() || "Not set")}</dd></div>
  `;

  document.getElementById("logout-btn").addEventListener("click", () => YM.auth.logout());
}
