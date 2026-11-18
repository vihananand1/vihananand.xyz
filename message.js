// Easter egg: the intro paragraph doubles as cover text. Certain letters, in
// order, spell a hidden message. Revealing it dims the paragraph, lights up
// those letters, and draws a line from each one to the decoded word, which
// sits beside the paragraph on wide screens and below it on narrow ones.
// A small nod to WindTexter.

(() => {
  const MESSAGE = "hire me";
  const STEP_MS = 140;   // gap between letters
  const LINE_MS = 700;   // matches the line transition in CSS
  const FADE_MS = 450;   // matches the paragraph color transition

  const intro = document.querySelector(".intro");
  const lede = document.getElementById("lede");
  const word = document.getElementById("decoded-word");
  const note = document.getElementById("decoded");
  const svg = document.getElementById("decode-lines");
  const showButton = document.getElementById("show-message");
  const hideButton = document.getElementById("hide-message");
  const original = lede.textContent;
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const SVG_NS = "http://www.w3.org/2000/svg";

  // Choose where each message letter comes from. Letters must stay in
  // order; among the valid choices, pick ones spread across the paragraph.
  function letterPositions() {
    const text = original.toLowerCase();
    const letters = [...MESSAGE.replace(/[^a-z]/g, "")];
    const fits = (from, k) => {
      for (; k < letters.length; k++) {
        from = text.indexOf(letters[k], from);
        if (from < 0) return false;
        from++;
      }
      return true;
    };
    if (!fits(0, 0)) return null;
    const picks = [];
    let from = 0;
    letters.forEach((ch, k) => {
      const ideal = ((k + 0.5) / letters.length) * text.length;
      let best = -1;
      for (let j = text.indexOf(ch, from); j >= 0; j = text.indexOf(ch, j + 1)) {
        if (!fits(j + 1, k + 1)) break;
        if (best < 0 || Math.abs(j - ideal) < Math.abs(best - ideal)) best = j;
      }
      picks.push(best);
      from = best + 1;
    });
    return picks;
  }

  const picks = letterPositions();
  if (!picks) {
    showButton.hidden = true;
    return;
  }

  let state = "hidden";  // hidden, shown, hiding
  let timers = [];
  let hitSpans = [];
  let wordSpans = [];
  let paths = [];

  const later = (fn, ms) => timers.push(setTimeout(fn, still.matches ? 0 : ms));
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

  function build() {
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
    lede.replaceChildren(plain, letters);

    wordSpans = [];
    word.replaceChildren(...[...MESSAGE].map((ch) => {
      const span = document.createElement("span");
      span.textContent = ch;
      if (ch !== " ") wordSpans.push(span);
      return span;
    }));
    word.hidden = false;
    svg.hidden = false;
  }

  // Place the word and draw a curve from each paragraph letter to its twin
  function layout() {
    const side = intro.clientWidth - lede.offsetWidth >= 260;
    word.classList.toggle("side", side);
    word.classList.toggle("below", !side);
    intro.classList.toggle("decoding-side", side);
    // On wide screens the word sits level with the paragraph's last line
    word.style.top = side ? `${lede.offsetTop + lede.offsetHeight - word.offsetHeight}px` : "";

    const box = intro.getBoundingClientRect();
    svg.setAttribute("viewBox", `0 0 ${box.width} ${box.height}`);
    svg.replaceChildren();
    paths = hitSpans.map((from, k) => {
      const a = from.getBoundingClientRect();
      const b = wordSpans[k].getBoundingClientRect();
      let d;
      if (side) {
        // Wiring: down from the letter, right along its own track under the
        // paragraph, then up into the decoded letter. The first letter takes
        // the lowest track so the drops never cross another line's track.
        const r = 6;
        const sx = a.left + a.width / 2 - box.left, sy = a.bottom + 2 - box.top;
        const tx = b.left + b.width / 2 - box.left, ty = b.bottom + 8 - box.top;
        const lane = lede.offsetTop + lede.offsetHeight + 16 + (hitSpans.length - 1 - k) * 7;
        d = `M${sx},${sy} L${sx},${lane - r} Q${sx},${lane} ${sx + r},${lane} ` +
            `L${tx - r},${lane} Q${tx},${lane} ${tx},${lane - r} L${tx},${ty}`;
      } else {
        const sx = a.left + a.width / 2 - box.left, sy = a.bottom + 2 - box.top;
        const tx = b.left + b.width / 2 - box.left, ty = b.top - 6 - box.top;
        const bend = (ty - sy) / 2;
        d = `M${sx},${sy} C${sx},${sy + bend} ${tx},${ty - bend} ${tx},${ty}`;
      }
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", d);
      svg.append(path);
      const length = path.getTotalLength();
      path.style.strokeDasharray = length;
      path.dataset.length = length;
      return path;
    });
  }

  function setLines(drawn, order) {
    paths.forEach((path, k) => {
      path.style.transitionDelay = `${order(k) * STEP_MS}ms`;
      path.style.strokeDashoffset = drawn ? 0 : path.dataset.length;
    });
  }

  function reveal() {
    clearTimers();
    state = "shown";
    build();
    note.hidden = false;
    layout();
    // Start with the lines retracted, then draw them
    paths.forEach((p) => {
      p.style.transition = "none";
      p.style.strokeDashoffset = p.dataset.length;
    });
    svg.getBoundingClientRect();
    paths.forEach((p) => (p.style.transition = ""));
    showButton.textContent = "Hide the message";

    lede.scrollIntoView({ behavior: still.matches ? "auto" : "smooth", block: "center" });
    later(() => {
      lede.classList.add("revealing");
      note.classList.add("shown");
      setLines(true, (k) => k);
      wordSpans.forEach((span, k) => {
        span.style.transitionDelay = `${k * STEP_MS + LINE_MS - 150}ms`;
        span.classList.add("in");
      });
    }, 450);
  }

  function hide() {
    clearTimers();
    state = "hiding";
    const last = wordSpans.length - 1;
    // Letters leave in reverse order, then their lines pull back
    wordSpans.forEach((span, k) => {
      span.style.transitionDelay = `${(last - k) * (STEP_MS / 2)}ms`;
      span.classList.remove("in");
    });
    setLines(false, (k) => (last - k) / 2);
    note.classList.remove("shown");
    later(() => lede.classList.remove("revealing"), LINE_MS / 2);
    showButton.textContent = "This page has a hidden message";

    later(() => {
      lede.textContent = original;
      word.hidden = true;
      svg.hidden = true;
      note.hidden = true;
      svg.replaceChildren();
      state = "hidden";
    }, LINE_MS + last * (STEP_MS / 2) + FADE_MS);
  }

  showButton.addEventListener("click", () => (state === "shown" ? hide() : reveal()));
  hideButton.addEventListener("click", hide);

  let resizeTimer;
  window.addEventListener("resize", () => {
    if (state !== "shown") return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      layout();
      paths.forEach((p) => {
        p.style.transition = "none";
        p.style.strokeDashoffset = 0;
      });
    }, 120);
  });

  console.log(
    "%cHi, thanks for looking under the hood.%c\nThis site is plain HTML, CSS, and JavaScript: github.com/vihananand1/vihananand.xyz",
    "font-weight:bold;font-size:14px",
    ""
  );
})();
