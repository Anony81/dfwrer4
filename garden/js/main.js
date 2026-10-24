/* ============================================================
   Scene controller + garden interactions
   Scenes: gate -> path -> letter -> clearing
   State survives refresh via location.hash (#path / #letter / #clearing)
   ============================================================ */
(function () {
  "use strict";

  var ORDER = ["gate", "path", "letter", "clearing"];
  var scenes = {};
  ORDER.forEach(function (id) { scenes[id] = document.getElementById("scene-" + id); });

  var current = "gate";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- scene switching ---------------- */
  function show(id, pushHash) {
    if (!scenes[id]) return;
    if (pushHash === undefined) pushHash = true;
    current = id;

    ORDER.forEach(function (s) {
      var el = scenes[s];
      if (!el) return;
      if (s === id) {
        el.hidden = false;
        // next frame so transition fires after unhide
        requestAnimationFrame(function () {
          requestAnimationFrame(function () { el.classList.add("is-active"); });
        });
      } else {
        el.classList.remove("is-active");
        // hide after fade to keep it out of a11y tree
        setTimeout(function () {
          if (current !== s) el.hidden = true;
        }, reduceMotion ? 250 : 1300);
      }
    });

    // atmosphere per scene
    document.body.classList.toggle("is-calmer", id === "clearing");
    if (window.Rain) {
      Rain.setLevel(id === "clearing" ? 0.45 : 1);
    }
    if (id === "path") initPathScene();

    if (pushHash) {
      var h = id === "gate" ? "#gate" : "#" + id;
      if (location.hash !== h) history.pushState({ scene: id }, "", h);
    }
  }

  function sceneFromHash() {
    var m = /^#(\w+)/.exec(location.hash || "");
    var id = m && m[1];
    return ORDER.indexOf(id) > -1 ? id : "gate";
  }

  window.addEventListener("popstate", function () { show(sceneFromHash(), false); });

  /* ---------------- Scene 1 : enter ---------------- */
  var btnEnter = document.getElementById("btn-enter");
  if (btnEnter) btnEnter.addEventListener("click", function () { show("path"); });

  /* ---------------- Scene 2 : flowers + pool ---------------- */
  var flowersHost = document.getElementById("flowers");
  var pathReady = false;

  var FLOWER_DEFS = [
    // x%, y% (bottom-anchored), scale, hue set
    { x: 8,  y: 74, s: 1.0, c: "blue" },
    { x: 17, y: 86, s: 1.2, c: "white" },
    { x: 28, y: 70, s: 0.85, c: "silver" },
    { x: 38, y: 90, s: 1.1, c: "blue" },
    { x: 72, y: 66, s: 0.8, c: "white" },
    { x: 88, y: 88, s: 1.15, c: "blue" },
    { x: 48, y: 62, s: 0.7, c: "silver" }
  ];

  function flowerSVG(c) {
    var petal = c === "blue" ? "#a9d3ea" : c === "white" ? "#eef4f9" : "#d5dbe1";
    var edge  = c === "blue" ? "#7fb2d9" : c === "white" ? "#c2d3e0" : "#aab4be";
    var core  = c === "blue" ? "#f4e3b6" : "#e6c98a";
    return '' +
      '<svg viewBox="0 0 64 96" aria-hidden="true">' +
        '<g class="stem-group">' +
          '<path d="M32 96 C 30 74 34 60 32 44" stroke="#4f7d63" stroke-width="3.4" fill="none" stroke-linecap="round"/>' +
          '<path d="M32 78 q-14 -3 -19 -14 q13 -2 19 14z" fill="#557f66"/>' +
          '<path d="M32 66 q13 -4 17 -15 q-12 -1 -17 15z" fill="#4c745d"/>' +
          '<circle class="glow" cx="32" cy="34" r="20" fill="#cfe6f4" opacity="0"/>' +
          '<g class="petals" transform="translate(32 34)">' +
            '<ellipse cx="0"  cy="-12" rx="6" ry="11" fill="' + petal + '" stroke="' + edge + '" stroke-width="1"/>' +
            '<ellipse cx="11" cy="-4" rx="6" ry="11" fill="' + petal + '" stroke="' + edge + '" stroke-width="1" transform="rotate(72 11 -4)"/>' +
            '<ellipse cx="7"  cy="10" rx="6" ry="11" fill="' + petal + '" stroke="' + edge + '" stroke-width="1" transform="rotate(144 7 10)"/>' +
            '<ellipse cx="-7" cy="10" rx="6" ry="11" fill="' + petal + '" stroke="' + edge + '" stroke-width="1" transform="rotate(-144 -7 10)"/>' +
            '<ellipse cx="-11" cy="-4" rx="6" ry="11" fill="' + petal + '" stroke="' + edge + '" stroke-width="1" transform="rotate(-72 -11 -4)"/>' +
            '<circle cx="0" cy="0" r="4.6" fill="' + core + '"/>' +
          '</g>' +
        '</g>' +
      '</svg>';
  }

  function buildFlowers() {
    if (!flowersHost || flowersHost.childElementCount) return;
    FLOWER_DEFS.forEach(function (f, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "flower";
      b.setAttribute("aria-label", "Touch this flower");
      b.style.left = f.x + "%";
      b.style.top = f.y + "%";
      b.style.transform = "translate(-50%,-100%) scale(" + f.s + ")";
      b.style.setProperty("--dur", (6 + Math.random() * 4) + "s");
      b.style.setProperty("--del", (-Math.random() * 6) + "s");
      b.innerHTML = flowerSVG(f.c);
      b.dataset.base = JSON.stringify([f.s]);
      b.addEventListener("click", function () { touchFlower(b); });
      flowersHost.appendChild(b);
    });
  }

  function touchFlower(b) {
    b.classList.add("is-touched");
    clearTimeout(b._t);
    b._t = setTimeout(function () { b.classList.remove("is-touched"); }, 1400);
    // pollen motes
    if (!reduceMotion) {
      for (var i = 0; i < 4; i++) {
        var p = document.createElement("span");
        p.className = "pollen";
        p.style.setProperty("--dx", (Math.random() * 40 - 20) + "px");
        p.style.setProperty("--dy", (Math.random() * 26) + "px");
        p.style.animationDelay = (i * 90) + "ms";
        b.appendChild(p);
        (function (el) { setTimeout(function () { el.remove(); }, 1800); })(p);
      }
    }
    maybeShowLetter();
  }

  /* ----- pool ripples ----- */
  var rippleCanvas = document.getElementById("ripples");
  var poolHit = document.getElementById("pool-hit");
  var rctx = rippleCanvas ? rippleCanvas.getContext("2d") : null;
  var rings = [];
  var rRunning = false;

  function sizeRipples() {
    if (!rippleCanvas) return;
    var sc = scenes.path;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    rippleCanvas.width = sc.clientWidth * dpr;
    rippleCanvas.height = sc.clientHeight * dpr;
    rctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // pool center in scene coords (matches SVG ellipse cx=880/1200, cy=600/700 slice)
  function poolPoint(clientX, clientY) {
    var rect = scenes.path.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  function addRing(x, y, strong) {
    rings.push({ x: x, y: y, r: 2, o: strong ? 0.8 : 0.55, wv: strong ? 1 : 0.7 });
    if (rings.length > 40) rings.shift();
    if (!rRunning) { rRunning = true; requestAnimationFrame(drawRipples); }
  }

  function drawRipples() {
    if (!rctx) return;
    var sc = scenes.path;
    rctx.clearRect(0, 0, sc.clientWidth, sc.clientHeight);
    var any = false;
    for (var i = rings.length - 1; i >= 0; i--) {
      var g = rings[i];
      g.r += 1.15 * g.wv;
      g.o -= 0.012;
      if (g.o <= 0) { rings.splice(i, 1); continue; }
      any = true;
      rctx.globalAlpha = g.o;
      rctx.strokeStyle = "#eaf4fb";
      rctx.lineWidth = 1.4;
      rctx.beginPath();
      rctx.ellipse(g.x, g.y, g.r, g.r * 0.34, 0, 0, Math.PI * 2);
      rctx.stroke();
      if (g.r > 14) {
        rctx.globalAlpha = g.o * 0.5;
        rctx.beginPath();
        rctx.ellipse(g.x, g.y, g.r * 0.55, g.r * 0.19, 0, 0, Math.PI * 2);
        rctx.stroke();
      }
    }
    rctx.globalAlpha = 1;
    if (any && !document.hidden) requestAnimationFrame(drawRipples);
    else rRunning = false;
  }

  if (poolHit) {
    poolHit.addEventListener("pointerdown", function (e) {
      var pt = poolPoint(e.clientX, e.clientY);
      addRing(pt.x, pt.y, true);
      setTimeout(function () { addRing(pt.x + 6, pt.y + 3, false); }, 180);
      setTimeout(function () { addRing(pt.x - 5, pt.y + 5, false); }, 380);
      maybeShowLetter();
    });
  }

  // ambient raindrop rings landing in the pool while on the path scene
  var ambientTimer = null;
  function startAmbientPool() {
    if (ambientTimer || reduceMotion || !poolHit) return;
    ambientTimer = setInterval(function () {
      if (current !== "path" || document.hidden) return;
      var rect = poolHit.getBoundingClientRect();
      var sx = rect.left + rect.width * (0.15 + Math.random() * 0.7);
      var sy = rect.top + rect.height * (0.2 + Math.random() * 0.6);
      var pt = poolPoint(sx, sy);
      addRing(pt.x, pt.y, false);
    }, 900);
  }

  /* ----- reveal letter button after some exploring ----- */
  var btnLetter = document.getElementById("btn-letter");
  var hint = document.getElementById("path-hint");
  var touched = 0, letterShown = false, dwellTimer = null;

  function maybeShowLetter() {
    touched++;
    if (!letterShown && touched >= 2) revealLetter(true);
  }
  function revealLetter(withHintAway) {
    if (letterShown) return;
    letterShown = true;
    if (btnLetter) {
      btnLetter.hidden = false;
      requestAnimationFrame(function () { btnLetter.classList.add("is-shown"); });
    }
    if (withHintAway && hint) hint.classList.add("is-away");
  }

  function initPathScene() {
    if (pathReady) return;
    pathReady = true;
    buildFlowers();
    sizeRipples();
    startAmbientPool();
    // gentle fallback: even without touching anything, the message appears
    dwellTimer = setTimeout(function () { revealLetter(false); }, 18000);
  }

  if (btnLetter) btnLetter.addEventListener("click", function () { show("letter"); });

  /* ---------------- Scene 3 : onward ---------------- */
  var btnOnward = document.getElementById("btn-onward");
  if (btnOnward) btnOnward.addEventListener("click", function () { show("clearing"); });

  /* ---------------- Scene 4 : ending actions ---------------- */
  var btnRevisit = document.getElementById("btn-revisit");
  var btnRest = document.getElementById("btn-rest");
  if (btnRevisit) btnRevisit.addEventListener("click", function () { show("gate"); });
  if (btnRest) btnRest.addEventListener("click", function () {
    document.body.classList.add("is-resting");
    if (window.Rain) Rain.setLevel(0.22);
    btnRest.textContent = "It\u2019s quiet here.";
    btnRest.disabled = false;
  });

  /* ---------------- resize ---------------- */
  var rt;
  window.addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(function () { if (pathReady) sizeRipples(); }, 150);
  });

  /* ---------------- boot with restored scene ---------------- */
  var start = sceneFromHash();
  if (start !== "gate") {
    // skip straight ahead; mark exploration state sensibly
    if (start === "letter" || start === "clearing") { touched = 2; letterShown = true; }
    show(start, false);
  } else {
    show("gate", false);
  }
})();
