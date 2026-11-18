// Background: a grid of faint dots. A slowly changing height map runs
// underneath, and dots that sit on its contour lines glow a little brighter,
// so the page reads like a topographic map drifting in the dark.

(() => {
  const canvas = document.querySelector(".field");
  const ctx = canvas.getContext("2d");
  const still = matchMedia("(prefers-reduced-motion: reduce)");

  const SPACING = 16;    // px between dots
  const SCALE = 0.0034;  // how zoomed-in the height map is
  const BANDS = 4;       // contour lines per unit of height
  const SPEED = 0.00005; // drift per millisecond
  const FRAME = 1000 / 30;

  // Height map: layered sine waves, each one bent by another, which gives
  // smooth, irregular hills. A random offset makes every visit different.
  const seed = Math.random() * 1000;
  const { sin } = Math;

  function height(x, y, t) {
    x += seed;
    y -= seed * 0.7;
    const a = sin(x * 1.3 + 1.8 * sin(y * 0.9 + t));
    const b = sin(y * 1.1 + 1.6 * sin(x * 0.7 - t * 0.8));
    const c = sin((x + y) * 0.6 + 1.2 * sin(x * 1.7 - y * 0.5 + t * 0.6));
    return 0.5 + (a + b + c) / 6;
  }

  let width = 0, tall = 0, dpr = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    tall = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(tall * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(t) {
    ctx.clearRect(0, 0, width, tall);
    ctx.fillStyle = "#fff";
    const offset = SPACING / 2;
    for (let y = offset; y < tall; y += SPACING) {
      for (let x = offset; x < width; x += SPACING) {
        const h = height(x * SCALE, y * SCALE, t) * BANDS;
        const f = h - Math.floor(h);
        const nearLine = Math.max(0, 1 - Math.min(f, 1 - f) / 0.16);
        const alpha = 0.04 + nearLine * nearLine * 0.32;
        const r = 0.6 + nearLine * 0.45;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  let last = 0, start = performance.now(), raf = 0;

  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (now - last < FRAME) return;
    last = now;
    draw((now - start) * SPEED);
  }

  function run() {
    cancelAnimationFrame(raf);
    resize();
    if (still.matches) draw(0);
    else raf = requestAnimationFrame(loop);
  }

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resize();
      if (still.matches) draw(0);
    }, 100);
  });
  still.addEventListener("change", run);

  run();
})();
