// Easter egg: the intro paragraph doubles as cover text. Picking out certain
// letters in order spells a hidden message, a small nod to WindTexter.

(() => {
  const MESSAGE = "hi, hire me";

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

  function reveal() {
    // Screen readers get the plain paragraph; the split letters are visual only
    const plain = document.createElement("span");
    plain.className = "visually-hidden";
    plain.textContent = original;
    const letters = document.createElement("span");
    letters.setAttribute("aria-hidden", "true");
    const hits = new Set(picks);
    [...original].forEach((ch, i) => {
      const span = document.createElement("span");
      span.className = hits.has(i) ? "ch hit" : "ch";
      span.textContent = ch;
      if (hits.has(i)) span.style.transitionDelay = `${picks.indexOf(i) * 110}ms`;
      letters.append(span);
    });
    lede.replaceChildren(plain, letters);

    lede.scrollIntoView({ behavior: still.matches ? "auto" : "smooth", block: "center" });
    // Let the scroll start before the letters change
    setTimeout(() => {
      lede.classList.add("revealing");
      decoded.hidden = false;
      showButton.textContent = "Hide the message";
    }, still.matches ? 0 : 450);
  }

  function hide() {
    lede.classList.remove("revealing");
    lede.textContent = original;
    decoded.hidden = true;
    showButton.textContent = "This page has a hidden message";
  }

  showButton.addEventListener("click", () => {
    if (lede.classList.contains("revealing")) hide();
    else reveal();
  });
  hideButton.addEventListener("click", hide);

  console.log(
    "%cHi, thanks for looking under the hood.%c\nThis site is plain HTML, CSS, and JavaScript: github.com/vihananand1/vihananand.xyz",
    "font-weight:bold;font-size:14px",
    ""
  );
})();
