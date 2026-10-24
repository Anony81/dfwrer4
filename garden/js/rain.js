/* ============================================================
   Gentle rain — lightweight canvas engine
   - two depth layers (far mist streaks + near drops)
   - occasional soft splash on the "ground" band
   - pauses when tab hidden, respects prefers-reduced-motion
   ============================================================ */
(function () {
  "use strict";

  var canvas = document.getElementById("rain");
  if (!canvas) return;
  var ctx = canvas.getContext("2d", { alpha: true });

  var reduceMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
  var W = 0, H = 0, DPR = 1;
  var drops = [], splashes = [];
  var intensity = 1;          // 0..1, scenes can ease this down
  var targetIntensity = 1;
  var running = false, rafId = null;

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    seed();
  }

  function makeDrop(layer) {
    // layer 0 = far/misty, layer 1 = near
    var near = layer === 1;
    return {
      x: Math.random() * (W + 160) - 80,
      y: Math.random() * -H,
      len: near ? 12 + Math.random() * 14 : 5 + Math.random() * 7,
      speed: near ? 7.5 + Math.random() * 3.5 : 3.8 + Math.random() * 2.2,
      drift: 0.9 + Math.random() * 0.5,     // slight wind
      o: near ? 0.28 + Math.random() * 0.2 : 0.10 + Math.random() * 0.12,
      w: near ? 1.4 : 1,
      layer: layer
    };
  }

  function seed() {
    drops.length = 0;
    var area = W * H;
    var nFar = Math.round(Math.min(90, area / 16000));
    var nNear = Math.round(Math.min(45, area / 34000));
    for (var i = 0; i < nFar; i++) drops.push(makeDrop(0));
    for (var j = 0; j < nNear; j++) drops.push(makeDrop(1));
  }

  function spawnSplash(x) {
    if (splashes.length > 26) return;
    splashes.push({
      x: x,
      y: H * (0.82 + Math.random() * 0.16),
      r: 0, max: 5 + Math.random() * 7,
      life: 1
    });
  }

  function step() {
    // ease intensity toward target
    intensity += (targetIntensity - intensity) * 0.015;

    ctx.clearRect(0, 0, W, H);

    var wind = 0.6;
    var alive = 0;
    for (var i = 0; i < drops.length; i++) {
      var d = drops[i];
      // gate density by intensity
      if (Math.random() > intensity * 0.92 + 0.08) {
        // skip drawing some drops as rain calms
        d.y += d.speed;
        if (d.y > H) { Object.assign(d, makeDrop(d.layer)); d.y = -20; }
        continue;
      }
      d.y += d.speed;
      d.x += d.drift * wind;
      if (d.y > H + 20) {
        if (d.layer === 1 && Math.random() < 0.5) spawnSplash(d.x);
        Object.assign(d, makeDrop(d.layer));
        d.y = -20;
        continue;
      }
      if (d.x > W + 40) d.x -= W + 80;
      ctx.globalAlpha = d.o * (0.35 + 0.65 * intensity);
      ctx.strokeStyle = "#cfe4f2";
      ctx.lineWidth = d.w;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - d.drift * wind * (d.len / d.speed) * 2.2, d.y - d.len);
      ctx.stroke();
      alive++;
    }

    // splashes — tiny expanding arcs
    for (var s = splashes.length - 1; s >= 0; s--) {
      var sp = splashes[s];
      sp.r += 0.5;
      sp.life -= 0.045;
      if (sp.life <= 0) { splashes.splice(s, 1); continue; }
      ctx.globalAlpha = sp.life * 0.35 * intensity;
      ctx.strokeStyle = "#e6f2fa";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(sp.x, sp.y, sp.r, sp.r * 0.32, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    if (running) rafId = requestAnimationFrame(step);
  }

  function start() {
    if (running || reduceMQ.matches) return;
    running = true;
    rafId = requestAnimationFrame(step);
  }
  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
  }

  /* public API used by scene controller */
  window.Rain = {
    setLevel: function (v) { targetIntensity = Math.max(0, Math.min(1, v)); },
    getLevel: function () { return targetIntensity; }
  };

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop(); else start();
  });

  var rt;
  window.addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(resize, 150);
  });

  reduceMQ.addEventListener
    ? reduceMQ.addEventListener("change", function (e) { e.matches ? (stop(), ctx.clearRect(0,0,W,H)) : start(); })
    : reduceMQ.addListener(function (e) { e.matches ? stop() : start(); });

  resize();
  if (!reduceMQ.matches) start();
})();
