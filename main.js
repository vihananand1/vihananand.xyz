// Opens a project's full write-up in a dialog. Each project has its own URL
// (for example /#crosscheck), so a link to it opens straight to that project
// and the browser's back button closes it.

const dialog = document.querySelector(".detail");
const body = dialog.querySelector(".detail-body");
const closeButton = dialog.querySelector(".close");
let opener = null;

function templateFor(id) {
  const el = id && document.getElementById(id);
  return el && el.tagName === "TEMPLATE" ? el : null;
}

function show(id) {
  const template = templateFor(id);
  if (!template) return false;
  body.replaceChildren(template.content.cloneNode(true));
  clearTimeout(closeTimer);
  dialog.classList.remove("closing");
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
  closeButton.focus();
  return true;
}

document.querySelectorAll("[data-project]").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    const id = link.dataset.project;
    opener = link;
    if (show(id)) history.pushState({ project: id }, "", "#" + id);
  });
});

// Closing plays a short exit animation first, then really closes
const still = matchMedia("(prefers-reduced-motion: reduce)");
let closeTimer = 0;
function closeDialog() {
  if (!dialog.open || dialog.classList.contains("closing")) return;
  dialog.classList.add("closing");
  closeTimer = setTimeout(() => {
    dialog.classList.remove("closing");
    dialog.close();
  }, still.matches ? 0 : 180);
}

closeButton.addEventListener("click", closeDialog);

// Esc would close it instantly; animate instead
dialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeDialog();
});

// A click on the dimmed area outside the panel closes it.
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) closeDialog();
});

dialog.addEventListener("close", () => {
  if (location.hash) {
    if (history.state && history.state.project) history.back();
    else history.replaceState(null, "", location.pathname + location.search);
  }
  opener?.focus();
  opener = null;
});

window.addEventListener("popstate", () => {
  const id = location.hash.slice(1);
  if (templateFor(id)) show(id);
  else closeDialog();
});

// Opening the site with a project in the URL goes straight to that project.
const initial = location.hash.slice(1);
if (templateFor(initial)) {
  opener = document.querySelector(`[data-project="${initial}"]`);
  show(initial);
}

// Phones: show the name in the top bar only after the big name scrolls away
const topbar = document.querySelector(".topbar");
const bigName = document.querySelector(".intro h1");
new IntersectionObserver(
  ([entry]) => topbar.classList.toggle("past-name", !entry.isIntersecting),
  { rootMargin: "-56px 0px 0px 0px" }
).observe(bigName);
