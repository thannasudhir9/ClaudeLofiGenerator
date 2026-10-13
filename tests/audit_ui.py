import sys
import time

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from playwright.sync_api import sync_playwright

def audit():
    errors = []
    logs = []
    issues = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        
        page.on('console', lambda msg: logs.append(f"[{msg.type}] {msg.text}"))
        page.on('pageerror', lambda exc: errors.append(f"Page Error: {exc}"))
        
        t0 = time.time()
        page.goto('http://localhost:3001/', wait_until='networkidle')
        print(f"1. Page loaded in {(time.time() - t0):.2f}s")
        
        # Check broken images on page load
        broken_imgs = page.evaluate('''() => {
            return Array.from(document.querySelectorAll('img'))
                .filter(img => !img.complete || img.naturalWidth === 0)
                .map(img => ({ src: img.src, alt: img.alt }));
        }''')
        if broken_imgs:
            issues.append(f"Broken images detected on page load: {broken_imgs}")
        
        # Test Theme Toggle
        theme_btn = page.locator('button:has-text("Dark"), button:has-text("Light")').first
        if theme_btn.is_visible():
            init_theme = page.evaluate('document.documentElement.dataset.theme')
            theme_btn.click()
            new_theme = page.evaluate('document.documentElement.dataset.theme')
            if init_theme == new_theme:
                issues.append("Dark/Light theme toggle did not change dataset.theme")
            theme_btn.click()
            print("2. Theme toggle tested")
        else:
            issues.append("Dark/Light theme toggle button not found")

        # Test Ambience drawer toggle
        ambience_btn = page.locator('button:has-text("Ambience")').first
        if ambience_btn.is_visible():
            ambience_btn.click()
            page.wait_for_timeout(300)
            drawer = page.locator('.ambient-mixer, div:has-text("Procedural Analog Ambience Mixer")').first
            if not drawer.is_visible():
                issues.append("Ambience drawer failed to display when clicking Ambience button")
            ambience_btn.click()
            print("3. Ambience drawer tested")
        else:
            issues.append("Ambience toggle button not found")

        # Test Tool tabs
        for tool_name in ['YouTube Remix', 'Lyric Slides', 'Trim Pauses', 'AI Lofi Maker']:
            tab = page.locator(f'button:has-text("{tool_name}")').first
            if tab.is_visible():
                tab.click()
                page.wait_for_timeout(200)
                print(f"4. Tool tab clicked: {tool_name}")
            else:
                issues.append(f"Tool tab '{tool_name}' not visible")

        # Test Harmonic Mood cards
        mood_cards = page.locator('.mood-card')
        count_moods = mood_cards.count()
        print(f"5. Found {count_moods} mood cards")
        if count_moods < 9:
            issues.append(f"Expected at least 9 mood cards, found {count_moods}")
        if count_moods > 0:
            mood_cards.nth(1).click()
            page.wait_for_timeout(200)

        # Test Scene cards
        scene_cards = page.locator('.scene-card')
        count_scenes = scene_cards.count()
        print(f"6. Found {count_scenes} scene cards")
        if count_scenes < 8:
            issues.append(f"Expected at least 8 scene cards, found {count_scenes}")

        # Test Reference Library Modal
        ref_btn = page.locator('button:has-text("Reference Repo"), button:has-text("Reference Library")').first
        if ref_btn.is_visible():
            ref_btn.click()
            page.wait_for_timeout(400)
            modal = page.locator('div:has-text("Curated Reference Asset Library")').first
            if not modal.is_visible():
                issues.append("Reference modal not visible after click")
            else:
                # Check category buttons
                for cat in ['Anime', 'Pixar', 'Stock Videos', 'All']:
                    cat_btn = page.locator(f'.ref-toolbar button:has-text("{cat}")').first
                    if cat_btn.is_visible():
                        cat_btn.click()
                        page.wait_for_timeout(150)
                # Test close button
                close_btn = page.locator('button:has-text("✕ Close")').first
                if close_btn.is_visible():
                    close_btn.click()
                    page.wait_for_timeout(300)
                else:
                    issues.append("Reference modal close button not found")
            print("7. Reference modal tested")
        else:
            issues.append("Reference modal open button not found")

        # Test Custom Image Animator Modal
        anim_btn = page.locator('button:has-text("Animate Custom Image")').first
        if anim_btn.is_visible():
            anim_btn.click()
            page.wait_for_timeout(400)
            anim_modal = page.locator('div:has-text("Add & Animate Still Image")').first
            if not anim_modal.is_visible():
                issues.append("Custom Image Animator modal not visible after click")
            close_btn = page.locator('.modal-content button:has-text("✕ Close")').first
            if close_btn.is_visible():
                close_btn.click()
                page.wait_for_timeout(300)
            print("8. Custom image animator modal tested")
        else:
            issues.append("Custom Image Animator button not found")

        # Test Vault Modal
        vault_btn = page.locator('button:has-text("Vault")').first
        if vault_btn.is_visible():
            vault_btn.click()
            page.wait_for_timeout(400)
            vault_modal = page.locator('div:has-text("Studio Vault")').first
            if not vault_modal.is_visible():
                issues.append("Vault modal not visible after click")
            close_btn = page.locator('.modal-content button:has-text("✕ Close")').first
            if close_btn.is_visible():
                close_btn.click()
                page.wait_for_timeout(300)
            print("9. Vault modal tested")
        else:
            issues.append("Vault button not found")

        # Test Export & Publish Hub Inputs
        title_input = page.locator('input[placeholder*="Title"], input[value*="Lofi Study Mix"]').first
        if not title_input.is_visible():
            issues.append("Publish title input not visible")

        # Check console errors and page errors
        print("\n--- AUDIT SUMMARY ---")
        print(f"Total Page Errors: {len(errors)}")
        for e in errors:
            print("  PAGE ERROR:", e)

        console_errors = [l for l in logs if "[error]" in l]
        print(f"Total Console Errors: {len(console_errors)}")
        for ce in console_errors:
            print("  CONSOLE ERROR:", ce)

        console_warnings = [l for l in logs if "[warning]" in l]
        print(f"Total Console Warnings: {len(console_warnings)}")
        for cw in console_warnings:
            print("  CONSOLE WARNING:", cw)

        print(f"\nTotal Functional Issues Detected: {len(issues)}")
        for issue in issues:
            print("  ⚠️ ISSUE:", issue)

        browser.close()

if __name__ == "__main__":
    audit()
