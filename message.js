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
  const original = lede.textContent;
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const SVG_NS = "http://www.w3.org/2000/svg";

  const text = original.toLowerCase();
  const letters = [...MESSAGE.replace(/[^a-z]/g, "")];

  // Can letters k.. still be found, in order, starting at index `from`?
  function fits(from, k) {
    for (; k < letters.length; k++) {
      from = text.indexOf(letters[k], from);
      if (from < 0) return false;
      from++;
    }
    return true;
  }

  if (!fits(0, 0)) {
    showButton.hidden = true;
    return;
  }

  // Choose which paragraph letters carry the message, based on where they
  // sit on screen. Every valid set (letters in reading order) is scored:
  // first by how many lines would cross, then by how far apart the letters
  // are, so each line gets its own clear column.
  //   side: lines run right to the word, so letters later in the message
  //         should sit further left (the wiring then nests without crossing)
  //   below: lines drop to the word, so later letters should sit further right
  function pickLetters(spans, side) {
    const xs = spans.map((span) => {
      const r = span.getBoundingClientRect();
      return r.left + r.width / 2;
    });
    const n = letters.length;
    const picks = new Array(n);
    let best = null, bestScore = -Infinity, visited = 0;

    function score() {
      let crossings = 0, gap = Infinity;
      for (let k = 0; k < n; k++) {
        for (let j = k + 1; j < n; j++) {
          const dx = xs[picks[j]] - xs[picks[k]];
          if (side ? dx > 0 : dx < 0) crossings++;
          gap = Math.min(gap, Math.abs(dx));
        }
      }
      // Letters closer than 44px read as one clump, which looks worse than a crossing
      return -crossings * 30 + Math.min(gap, 90) - (gap < 44 ? 400 : 0);
    }

    function search(k, from) {
      if (++visited > 300000) return;
      if (k === n) {
        const value = score();
        if (value > bestScore) { bestScore = value; best = picks.slice(); }
        return;
      }
      for (let j = text.indexOf(letters[k], from); j >= 0; j = text.indexOf(letters[k], j + 1)) {
        if (!fits(j + 1, k + 1)) break;
        picks[k] = j;
        search(k + 1, j + 1);
      }
    }

    search(0, 0);
    return best;
  }

  let state = "hidden";  // hidden, shown, hiding
  let timers = [];
  let hitSpans = [];
  let wordSpans = [];
  let paths = [];

  const later = (fn, ms) => timers.push(setTimeout(fn, still.matches ? 0 : ms));
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

  let charSpans = [];

  function build() {
    // Screen readers get the plain paragraph; the split letters are visual only
    const plain = document.createElement("span");
    plain.className = "visually-hidden";
    plain.textContent = original;
    const holder = document.createElement("span");
    holder.setAttribute("aria-hidden", "true");
    charSpans = [...original].map((ch) => {
      const span = document.createElement("span");
      span.className = "ch";
      span.textContent = ch;
      return span;
    });
    holder.append(...charSpans);
    lede.replaceChildren(plain, holder);

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

    // Pick the message letters for the current layout
    hitSpans.forEach((span) => span.classList.remove("hit"));
    hitSpans = pickLetters(charSpans, side).map((i) => charSpans[i]);
    hitSpans.forEach((span) => span.classList.add("hit"));

    const box = intro.getBoundingClientRect();
    svg.setAttribute("viewBox", `0 0 ${box.width} ${box.height}`);
    svg.style.height = `${box.height}px`;
    svg.replaceChildren();
    // rank[k]: how many message letters sit left of letter k
    const lefts = hitSpans.map((span) => span.getBoundingClientRect().left);
    const rank = lefts.map((x) => lefts.filter((y) => y < x).length);
    paths = hitSpans.map((from, k) => {
      const a = from.getBoundingClientRect();
      const b = wordSpans[k].getBoundingClientRect();
      let d;
      if (side) {
        // Wiring: down from the letter, right along its own track under the
        // paragraph, then up into the decoded letter. The letter furthest
        // left takes the lowest track, so no drop crosses another track.
        const r = 8;
        const sx = a.left + a.width / 2 - box.left, sy = a.bottom + 2 - box.top;
        const tx = b.left + b.width / 2 - box.left, ty = b.bottom + 8 - box.top;
        const lane = lede.offsetTop + lede.offsetHeight + 18 + (hitSpans.length - 1 - rank[k]) * 12;
        d = `M${sx},${sy} L${sx},${lane - r} Q${sx},${lane} ${sx + r},${lane} ` +
            `L${tx - r},${lane} Q${tx},${lane} ${tx},${lane - r} L${tx},${ty}`;
      } else {
        // Straight down out of the paragraph, then a curve into the word
        const sx = a.left + a.width / 2 - box.left, sy = a.bottom + 2 - box.top;
        const tx = b.left + b.width / 2 - box.left, ty = b.top - 6 - box.top;
        const exit = lede.offsetTop + lede.offsetHeight + 4;
        const bend = (ty - exit) / 2;
        d = `M${sx},${sy} L${sx},${exit} C${sx},${exit + bend} ${tx},${ty - bend} ${tx},${ty}`;
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

  // Run a change that alters the intro's height, and ease the height from
  // its old value to the new one so everything below glides instead of jumping
  const RESIZE_MS = 450;
  let heightTimer = 0;
  function smoothHeight(change) {
    clearTimeout(heightTimer);
    const start = intro.getBoundingClientRect().height;
    const toggleBefore = showButton.getBoundingClientRect().top;
    intro.style.transition = "none";
    intro.style.height = "";
    change();
    const end = intro.getBoundingClientRect().height;
    if (still.matches || Math.abs(start - end) < 1) {
      intro.style.overflow = "";
      return;
    }
    // The toggle link moves when the note and word come and go; slide it
    // from where it was to where it now belongs instead of letting it jump
    const shift = toggleBefore - showButton.getBoundingClientRect().top;
    if (Math.abs(shift) > 0.5) {
      showButton.animate(
        [{ transform: `translateY(${shift}px)` }, { transform: "none" }],
        { duration: RESIZE_MS, easing: "ease" }
      );
    }
    intro.style.overflow = "clip";
    intro.style.height = `${start}px`;
    intro.getBoundingClientRect();
    intro.style.transition = `height ${RESIZE_MS}ms ease`;
    intro.style.height = `${end}px`;
    heightTimer = setTimeout(() => {
      intro.style.transition = "";
      intro.style.height = "";
      intro.style.overflow = "";
    }, RESIZE_MS + 30);
  }

  // Scroll to the top and resolve once we're there. The message waits for
  // this: if the intro grew while the page was still scrolling, the browser
  // would shift the scroll position to keep the content in view steady,
  // and the page would stop short of the top.
  function scrollToTop() {
    return new Promise((done) => {
      if (window.scrollY < 2) return done();
      window.scrollTo({ top: 0, behavior: still.matches ? "auto" : "smooth" });
      const started = performance.now();
      const check = () => {
        if (window.scrollY < 2) return done();
        // If the smooth scroll stalls or gets cut off, jump the rest of the way
        if (performance.now() - started > 1200) {
          window.scrollTo(0, 0);
          return done();
        }
        requestAnimationFrame(check);
      };
      requestAnimationFrame(check);
    });
  }

  async function reveal() {
    clearTimers();
    state = "shown";
    showButton.textContent = "Show the original";
    await scrollToTop();
    if (state !== "shown") return;  // hidden again while scrolling

    smoothHeight(() => {
      build();
      note.hidden = false;
      layout();
    });
    // Safety net: once the intro has finished growing, make sure we're
    // still at the top (some phones nudge the scroll while content changes)
    later(() => {
      if (state === "shown" && window.scrollY > 2) {
        window.scrollTo({ top: 0, behavior: still.matches ? "auto" : "smooth" });
      }
    }, RESIZE_MS + 60);
    // Start with the lines retracted, then draw them
    paths.forEach((p) => {
      p.style.transition = "none";
      p.style.strokeDashoffset = p.dataset.length;
    });
    svg.getBoundingClientRect();
    paths.forEach((p) => (p.style.transition = ""));

    later(() => {
      lede.classList.add("revealing");
      note.classList.add("shown");
      setLines(true, (k) => k);
      wordSpans.forEach((span, k) => {
        span.style.transitionDelay = `${k * STEP_MS + LINE_MS - 150}ms`;
        span.classList.add("in");
      });
    }, 150);
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
    showButton.textContent = "This paragraph has a hidden message";

    later(() => {
      smoothHeight(() => {
        lede.textContent = original;
        word.hidden = true;
        svg.hidden = true;
        note.hidden = true;
        svg.replaceChildren();
      });
      state = "hidden";
    }, LINE_MS + last * (STEP_MS / 2) + FADE_MS);
  }

  showButton.addEventListener("click", () => (state === "shown" ? hide() : reveal()));

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
