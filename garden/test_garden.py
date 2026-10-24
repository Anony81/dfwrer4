#!/usr/bin/env python3
"""Automated test for the garden experience."""
import sys, time
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8099/"
errors = []

def run():
    with sync_playwright() as p:
        import os
        exe = "/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome"
        browser = p.chromium.launch(executable_path=exe if os.path.exists(exe) else None)
        # --- Desktop pass ---
        pg = browser.new_page(viewport={"width": 1280, "height": 800})
        pg.on("console", lambda m: errors.append(f"console:{m.text}") if m.type == "error" else None)
        pg.on("pageerror", lambda e: errors.append(f"pageerror:{e}"))
        pg.goto(BASE, wait_until="networkidle")
        assert pg.is_visible("#scene-gate"), "gate not visible"
        assert "Hey, Noura." in pg.inner_text(".gate-line"), "opening line missing"
        pg.screenshot(path="/tmp/shot_gate.png")

        pg.click("#btn-enter")
        pg.wait_for_timeout(1600)
        assert pg.is_visible("#scene-path"), "path not visible after enter"
        nf = pg.eval_on_selector_all(".flower", "els=>els.length")
        assert nf == 7, f"expected 7 flowers got {nf}"
        # touch two flowers -> letter button should appear
        pg.click(".flower:nth-child(1)")
        pg.wait_for_timeout(300)
        pg.click("#pool-hit", position={"x": 60, "y": 20})
        pg.wait_for_selector("#btn-letter.is-shown", timeout=4000)
        pg.screenshot(path="/tmp/shot_path.png")

        pg.click("#btn-letter")
        pg.wait_for_timeout(1600)
        assert pg.is_visible("#scene-letter"), "letter not visible"
        txt = pg.inner_text(".letter-panel")
        assert "نوره" in txt and "إنترنت" in txt and "فويساتج" in txt, "arabic text mismatch"
        dirv = pg.get_attribute(".letter-panel", "dir")
        assert dirv == "rtl", "panel not rtl"
        pg.wait_for_timeout(4500)  # let staged reveal finish
        op = pg.eval_on_selector(".ar-body", "el=>getComputedStyle(el).opacity")
        assert float(op) > 0.9, f"arabic paragraph not revealed (opacity {op})"
        pg.screenshot(path="/tmp/shot_letter.png")

        pg.click("#btn-onward")
        pg.wait_for_timeout(1600)
        assert pg.is_visible("#scene-clearing"), "clearing not visible"
        assert "still on my mind" in pg.inner_text(".final-line"), "final line missing"
        pg.screenshot(path="/tmp/shot_clearing.png")

        pg.click("#btn-rest")
        pg.wait_for_timeout(600)
        assert pg.evaluate("document.body.classList.contains('is-resting')"), "rest state missing"

        # refresh persistence: reload at #clearing
        pg.reload(wait_until="networkidle")
        assert pg.is_visible("#scene-clearing"), "refresh did not restore clearing scene"

        # horizontal overflow check
        ov = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        assert ov <= 0, f"horizontal overflow: {ov}px"
        pg.close()

        # --- Mobile pass (touch) ---
        ctx = browser.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True)
        mp = ctx.new_page()
        mp.on("pageerror", lambda e: errors.append(f"mobile-pageerror:{e}"))
        mp.goto(BASE, wait_until="networkidle")
        mp.tap("#btn-enter")
        mp.wait_for_timeout(1500)
        assert mp.is_visible("#scene-path"), "mobile path not visible"
        mp.tap(".flower:nth-child(2)")
        mp.wait_for_timeout(300)
        mp.tap(".flower:nth-child(4)")
        mp.wait_for_selector("#btn-letter.is-shown", timeout=4000)
        mp.wait_for_timeout(1200)  # let the entrance transition settle before tapping
        mp.tap("#btn-letter")
        mp.wait_for_timeout(1500)
        assert mp.is_visible("#scene-letter"), "mobile letter not visible"
        ov = mp.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        assert ov <= 0, f"mobile horizontal overflow: {ov}px"
        mp.screenshot(path="/tmp/shot_mobile_letter.png")
        ctx.close()
        browser.close()

run()
if errors:
    print("FAILURES:\n" + "\n".join(errors)); sys.exit(1)
print("ALL TESTS PASSED")
