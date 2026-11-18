// Background: a faint, still drawing of a neural network shaped like an
// autoencoder. Layers narrow to a small middle layer and widen back out, so
// it is symmetric both ways. It is drawn once (and again on resize) and
// never animates, so nothing moves at the edge of the reader's vision.

(() => {
  const canvas = document.querySelector(".field");
  const ctx = canvas.getContext("2d");

  const WIDE = [6, 9, 5, 3, 5, 9, 6];
  const NARROW = [5, 7, 3, 7, 5];

  function draw() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const tall = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(tall * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const sizes = width < 720 ? NARROW : WIDE;
    const padX = width * 0.06;
    const stepX = (width - padX * 2) / (sizes.length - 1);
    const rowGap = Math.min(tall * 0.085, 86);

    const layers = sizes.map((n, l) => {
      const x = padX + stepX * l;
      const top = tall / 2 - ((n - 1) * rowGap) / 2;
      return Array.from({ length: n }, (_, i) => ({ x, y: top + i * rowGap }));
    });

    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let l = 0; l < layers.length - 1; l++) {
      for (const a of layers[l]) {
        for (const b of layers[l + 1]) {
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
        }
      }
    }
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.fillStyle = "#000";
    for (const layer of layers) {
      for (const n of layer) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
  }

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(draw, 120);
  });

  draw();
})();
