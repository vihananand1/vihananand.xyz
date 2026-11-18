// Background: a faint neural network shaped like an autoencoder. Layers
// narrow to a small middle layer and widen back out, so the drawing is
// symmetric left to right. Now and then a mirrored pair of signals crosses
// it, and nodes near the mouse light up along with their connections.

(() => {
  const canvas = document.querySelector(".field");
  const ctx = canvas.getContext("2d");
  const still = matchMedia("(prefers-reduced-motion: reduce)");

  const WIDE = [6, 9, 5, 3, 5, 9, 6];
  const NARROW = [5, 7, 3, 7, 5];
  const HOP_MS = 2200;      // time for a signal to cross one connection
  const SPAWN_MS = 7000;    // a new pair of signals starts this often
  const GLOW_MS = 2200;     // how long a node stays lit after a signal passes
  const TAIL = 0.3;         // length of a signal's streak, as a share of the connection
  const REACH = 170;        // px around the mouse that nodes respond to

  let width = 0, tall = 0, dpr = 1;
  let layers = [];          // layers[l][i] = { x, y, lit }
  let base = null;          // pre-drawn connections and nodes
  let signals = [];
  let lastSpawn = 0;
  let raf = 0;

  // The drawn pointer eases toward the real one so the glow glides
  const pointer = { x: 0, y: 0, tx: 0, ty: 0, on: 0, target: 0 };

  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    tall = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(tall * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const sizes = width < 720 ? NARROW : WIDE;
    const padX = width * 0.06;
    const stepX = (width - padX * 2) / (sizes.length - 1);
    const rowGap = Math.min(tall * 0.085, 86);

    layers = sizes.map((n, l) => {
      const x = padX + stepX * l;
      const top = tall / 2 - ((n - 1) * rowGap) / 2;
      return Array.from({ length: n }, (_, i) => ({ x, y: top + i * rowGap, lit: -Infinity }));
    });

    // Draw the still parts once, then reuse them every frame
    base = document.createElement("canvas");
    base.width = canvas.width;
    base.height = canvas.height;
    const b = base.getContext("2d");
    b.setTransform(dpr, 0, 0, dpr, 0, 0);

    b.strokeStyle = "rgba(255,255,255,0.045)";
    b.lineWidth = 1;
    b.beginPath();
    for (let l = 0; l < layers.length - 1; l++) {
      for (const a of layers[l]) {
        for (const c of layers[l + 1]) {
          b.moveTo(a.x, a.y);
          b.lineTo(c.x, c.y);
        }
      }
    }
    b.stroke();

    b.strokeStyle = "rgba(255,255,255,0.2)";
    b.fillStyle = "#000";
    for (const layer of layers) {
      for (const n of layer) {
        b.beginPath();
        b.arc(n.x, n.y, 3, 0, Math.PI * 2);
        b.fill();
        b.stroke();
      }
    }
  }

  // A signal walks one random path from the first layer to the last.
  // Its twin takes the mirror-image path across the horizontal center.
  function spawn(now) {
    const path = layers.map((layer) => Math.floor(Math.random() * layer.length));
    const mirror = path.map((i, l) => layers[l].length - 1 - i);
    signals.push({ path, start: now });
    if (mirror.some((i, l) => i !== path[l])) signals.push({ path: mirror, start: now });
  }

  function dot(n, radius, alpha) {
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawSignals(now) {
    if (now - lastSpawn > SPAWN_MS) {
      spawn(now);
      lastSpawn = now;
    }

    ctx.lineWidth = 1;
    signals = signals.filter((s) => {
      const progress = (now - s.start) / HOP_MS;
      const hop = Math.floor(progress);
      const last = s.path.length - 1;
      if (hop >= last) {
        layers[last][s.path[last]].lit = s.start + last * HOP_MS;
        return false;
      }
      const from = layers[hop][s.path[hop]];
      const to = layers[hop + 1][s.path[hop + 1]];
      const reached = s.start + hop * HOP_MS;
      if (from.lit < reached) from.lit = reached;

      const t = progress - hop;
      const tail = Math.max(t - TAIL, 0);
      const hx = from.x + (to.x - from.x) * t, hy = from.y + (to.y - from.y) * t;
      const tx = from.x + (to.x - from.x) * tail, ty = from.y + (to.y - from.y) * tail;
      const g = ctx.createLinearGradient(tx, ty, hx, hy);
      g.addColorStop(0, "rgba(255,255,255,0)");
      g.addColorStop(1, "rgba(255,255,255,0.3)");
      ctx.strokeStyle = g;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(hx, hy);
      ctx.stroke();
      return true;
    });

    ctx.fillStyle = "#fff";
    for (const layer of layers) {
      for (const n of layer) {
        const age = now - n.lit;
        if (age < 0 || age > GLOW_MS) continue;
        const k = 1 - age / GLOW_MS;
        dot(n, 3, k * k * 0.6);
      }
    }
    ctx.globalAlpha = 1;
  }

  // Nodes near the mouse brighten, and the closest one shows its connections
  function drawPointer() {
    pointer.x += (pointer.tx - pointer.x) * 0.12;
    pointer.y += (pointer.ty - pointer.y) * 0.12;
    pointer.on += (pointer.target - pointer.on) * 0.08;
    if (pointer.on < 0.01) return;

    let nearest = null, nearestK = 0, nearestLayer = -1;
    ctx.fillStyle = "#fff";
    layers.forEach((layer, l) => {
      for (const n of layer) {
        const d = Math.hypot(n.x - pointer.x, n.y - pointer.y);
        const k = Math.max(0, 1 - d / REACH) * pointer.on;
        if (k <= 0) continue;
        dot(n, 3, k * 0.85);
        if (k > nearestK) { nearest = n; nearestK = k; nearestLayer = l; }
      }
    });

    if (nearest) {
      ctx.globalAlpha = nearestK * 0.28;
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const l of [nearestLayer - 1, nearestLayer + 1]) {
        if (!layers[l]) continue;
        for (const m of layers[l]) {
          ctx.moveTo(nearest.x, nearest.y);
          ctx.lineTo(m.x, m.y);
        }
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function frame(now) {
    ctx.clearRect(0, 0, width, tall);
    ctx.drawImage(base, 0, 0, width, tall);
    if (!still.matches) drawSignals(now);
    drawPointer();
  }

  function loop(now) {
    frame(now);
    // With reduced motion, keep drawing only while the hover glow settles
    if (!still.matches || Math.abs(pointer.target - pointer.on) > 0.01 ||
        Math.hypot(pointer.tx - pointer.x, pointer.ty - pointer.y) > 0.5) {
      raf = requestAnimationFrame(loop);
    } else {
      raf = 0;
    }
  }

  function wake() {
    if (!raf) raf = requestAnimationFrame(loop);
  }

  function run() {
    cancelAnimationFrame(raf);
    raf = 0;
    signals = [];
    lastSpawn = performance.now() - SPAWN_MS + 1500;
    layout();
    frame(performance.now());
    wake();
  }

  window.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    if (pointer.on < 0.01) { pointer.x = e.clientX; pointer.y = e.clientY; }
    pointer.tx = e.clientX;
    pointer.ty = e.clientY;
    pointer.target = 1;
    wake();
  });
  document.documentElement.addEventListener("pointerleave", () => {
    pointer.target = 0;
    wake();
  });

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(run, 120);
  });
  still.addEventListener("change", run);

  run();
})();
