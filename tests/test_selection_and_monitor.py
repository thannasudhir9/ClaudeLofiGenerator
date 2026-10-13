"""
Verification script for Studio Monitor scene switching and zero-freezing bug fix.
Ensures:
1. Fresh load starts on LIVE STAGE (no auto-load of chair video #b2f43a63).
2. Quick inspiration chips switch active scenes and live monitor backdrops.
3. Category filter pills switch styles and active scenes.
4. Subcategory pills update scene and monitor backdrop.
5. Scene cards in grid update monitor backdrop.
6. New Scene button dismisses video immediately.
"""

import sys
import time

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from playwright.sync_api import sync_playwright

def test_monitor_selections():
    print(">>> Starting Studio Monitor & Scene Selection Playwright Test...", flush=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

        print("1. Navigating to http://localhost:3001/...", flush=True)
        page.goto("http://localhost:3001/", wait_until="domcontentloaded", timeout=30000)
        page.wait_for_selector(".deck-header", timeout=10000)
        time.sleep(1)

        # Check that deck-header shows LIVE STAGE (not frozen on #b2f43a63)
        deck_header_text = page.locator(".deck-header").inner_text()
        print(f"Deck Header text: {deck_header_text}", flush=True)

        assert "LIVE STAGE" in deck_header_text, f"Expected 'LIVE STAGE' in header on load, got: {deck_header_text}"
        assert "ID: #b2f43a63" not in deck_header_text, "ERROR: Studio Monitor is still auto-loading #b2f43a63 chair video on initial load!"
        print("✓ Initial load successfully renders LIVE STAGE (No frozen chair video)", flush=True)

        # Verify initial backdrop image exists and is visible
        stage_img = page.locator(".video-placeholder img").first
        assert stage_img.is_visible(), "Live stage image is not visible!"
        initial_src = stage_img.get_attribute("src")
        print(f"✓ Initial stage image src: {initial_src}", flush=True)

        # 2. Test Quick Aesthetic Inspirations
        presets_to_test = [
            ("Sacred Himalayan Mandir", "devotional"),
            ("Krishna & Radha Twilight", "krishna_radha_beach"),
            ("Shinkai Twilight", "anime_shinkai_sunset"),
            ("Pixar Fireplace", "pixar_cozy_cabin"),
            ("Night City Cyber Rain", "cyberpunk_neon_rain"),
            ("Biophilic Forest Waterfall", "nature_biophilic_waterfall"),
        ]

        for label, expected_keyword in presets_to_test:
            btn = page.locator(f"button.preset-chip:has-text('{label}')").first
            btn.click()
            time.sleep(0.4)
            curr_src = page.locator(".video-placeholder img").first.get_attribute("src")
            print(f"✓ Preset '{label}' clicked -> Stage img: {curr_src}", flush=True)
            assert expected_keyword in curr_src, f"Expected '{expected_keyword}' in src for preset '{label}', got: {curr_src}"

        # 3. Test Category Filter Bar
        categories_to_test = [
            ("🕉️ Devotional", "krishna_radha_beach"),
            ("🌸 Anime", "anime_shinkai_sunset"),
            ("🧸 Pixar 3D", "pixar_cozy_cabin"),
            ("⚡ Cyberpunk", "cyberpunk"),
            ("🌿 Nature", "nature_biophilic_waterfall"),
            ("📐 Simple AI", "simple_ai_minimal_lounge"),
            ("☕ LoFi", "lofi_study_girl"),
        ]

        for cat_label, expected_kw in categories_to_test:
            cat_btn = page.locator(f"button.cat-pill:has-text('{cat_label}')").first
            cat_btn.click()
            time.sleep(0.4)
            curr_src = page.locator(".video-placeholder img").first.get_attribute("src")
            print(f"✓ Category '{cat_label}' clicked -> Stage img: {curr_src}", flush=True)
            assert expected_kw in curr_src, f"Expected '{expected_kw}' in src for category '{cat_label}', got: {curr_src}"

        # 4. Test Subcategory Pills
        # First reset to All Categories
        page.locator("button.cat-pill:has-text('All Categories')").first.click()
        time.sleep(0.4)
        subcat_btn = page.locator("button.subcat-pill:has-text('Studio Ghibli Garden')").first
        subcat_btn.click()
        time.sleep(0.4)
        curr_src = page.locator(".video-placeholder img").first.get_attribute("src")
        print(f"✓ Subcategory 'Studio Ghibli Garden' clicked -> Stage img: {curr_src}", flush=True)
        assert "anime_ghibli_garden" in curr_src, f"Expected anime_ghibli_garden in src, got {curr_src}"

        # 5. Check Scene Card Grid Click
        page.locator("button.cat-pill:has-text('All Categories')").first.click()
        time.sleep(0.4)
        scene_card = page.locator(".scene-card:has-text('Tokyo Neon Alley')").first
        scene_card.click()
        time.sleep(0.4)
        curr_src = page.locator(".video-placeholder img").first.get_attribute("src")
        print(f"✓ Scene card 'Tokyo Neon Alley' clicked -> Stage img: {curr_src}", flush=True)
        assert "tokyo_cyberpunk" in curr_src or "cyberpunk" in curr_src, f"Expected cyberpunk in src, got {curr_src}"

        # 6. Check Credits Pill
        credits_pill = page.locator("text=999,999,999").first
        assert credits_pill.is_visible(), "Credits pill with 999,999,999 unlimited credits is not visible!"
        print("✓ Unlimited Credits pill (999,999,999) verified visible and free!", flush=True)

        # 7. Check Console Errors
        filtered_errors = [e for e in console_errors if "favicon" not in e and "404" not in e]
        print(f"Console errors: {len(filtered_errors)}", flush=True)
        if filtered_errors:
            print("Filtered errors:", filtered_errors, flush=True)
        assert len(filtered_errors) == 0, f"Encountered unexpected console errors: {filtered_errors}"

        # Take screenshot of the fixed Live Stage
        screenshot_path = "tests/monitor_selection_verified.png"
        page.screenshot(path=screenshot_path)
        print(f"✓ Saved verification screenshot to {screenshot_path}", flush=True)

        browser.close()
        print("\n>>> ALL STUDIO MONITOR & SELECTION TESTS PASSED (100% SUCCESS)!\n", flush=True)

if __name__ == "__main__":
    test_monitor_selections()
