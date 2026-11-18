// Easter egg: the intro paragraph doubles as cover text. Picking out certain
// letters in order spells a hidden message, a small nod to WindTexter.

(() => {
  const MESSAGE = "hi, hire me";
  const STEP_MS = 110;   // gap between letters lighting up
  const FADE_MS = 450;   // matches the CSS transition

  const lede = document.getElementById("lede");
  const decoded = document.getElementById("decoded");
  const showButton = document.getElementById("show-message");
  const hideButton = document.getElementById("hide-message");
  const original = lede.textContent;
  const still = matchMedia("(prefers-reduced-motion: reduce)");

  // Find the message's letters in order inside the paragraph
  function letterPositions() {
    const text = original.toLowerCase();
    const picks = [];
    let from = 0;
    for (const ch of MESSAGE.replace(/[^a-z]/g, "")) {
      const at = text.indexOf(ch, from);
      if (at < 0) return null;
      picks.push(at);
      from = at + 1;
    }
    return picks;
  }

  const picks = letterPositions();
  if (!picks) {
    showButton.hidden = true;
    return;
  }

  let state = "hidden";   // hidden, showing, shown, hiding
  let timer = 0;
  let hitSpans = [];

  function reveal() {
    clearTimeout(timer);
    state = "showing";

    // Screen readers get the plain paragraph; the split letters are visual only
    const plain = document.createElement("span");
    plain.className = "visually-hidden";
    plain.textContent = original;
    const letters = document.createElement("span");
    letters.setAttribute("aria-hidden", "true");
    const hits = new Set(picks);
    hitSpans = [];
    [...original].forEach((ch, i) => {
      const span = document.createElement("span");
      span.className = hits.has(i) ? "ch hit" : "ch";
      span.textContent = ch;
      if (hits.has(i)) hitSpans.push(span);
      letters.append(span);
    });
    hitSpans.forEach((span, k) => (span.style.transitionDelay = `${k * STEP_MS}ms`));
    lede.replaceChildren(plain, letters);
    decoded.hidden = false;
    showButton.textContent = "Hide the message";

    lede.scrollIntoView({ behavior: still.matches ? "auto" : "smooth", block: "center" });
    // Let the scroll get going before the letters change
    timer = setTimeout(() => {
      lede.classList.add("revealing");
      decoded.classList.add("shown");
      state = "shown";
    }, still.matches ? 0 : 450);
  }

  function hide() {
    clearTimeout(timer);
    state = "hiding";
    // Letters let go in reverse order, then the plain text comes back
    const last = hitSpans.length - 1;
    hitSpans.forEach((span, k) => (span.style.transitionDelay = `${(last - k) * (STEP_MS / 2)}ms`));
    lede.classList.remove("revealing");
    decoded.classList.remove("shown");
    showButton.textContent = "This page has a hidden message";

    const total = still.matches ? 0 : FADE_MS + last * (STEP_MS / 2) + 50;
    timer = setTimeout(() => {
      lede.textContent = original;
      decoded.hidden = true;
      hitSpans = [];
      state = "hidden";
    }, total);
  }

  showButton.addEventListener("click", () => {
    if (state === "shown" || state === "showing") hide();
    else reveal();
  });
  hideButton.addEventListener("click", hide);

  console.log(
    "%cHi, thanks for looking under the hood.%c\nThis site is plain HTML, CSS, and JavaScript: github.com/vihananand1/vihananand.xyz",
    "font-weight:bold;font-size:14px",
    ""
  );
})();
