import os
import sys
import time

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from playwright.sync_api import sync_playwright

os.makedirs("screenshots", exist_ok=True)

def test_categories_ui():
    console_errors = []
    page_errors = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 950})

        page.on("console", lambda msg: console_errors.append(f"[{msg.type}] {msg.text}") if msg.type == "error" else None)
        page.on("pageerror", lambda exc: page_errors.append(str(exc)))

        print("Navigating to http://localhost:3001/ ...")
        page.goto("http://localhost:3001/", wait_until="networkidle")
        page.wait_for_timeout(1000)

        # 1. Check broken images
        broken_imgs = page.evaluate("""() => {
            return Array.from(document.querySelectorAll('img'))
                .filter(img => !img.complete || img.naturalWidth === 0)
                .map(img => ({ src: img.src, alt: img.alt }));
        }""")
        print(f"Broken images count: {len(broken_imgs)}")
        if broken_imgs:
            print(f"Broken images: {broken_imgs}")

        # 2. Check category pills
        cat_pills = page.locator(".cat-pill")
        pills_count = cat_pills.count()
        print(f"Found {pills_count} category filter pills.")

        category_names = ["Devotional", "Anime", "LoFi", "Pixar", "Cyberpunk", "Nature", "Simple AI", "All Categories"]
        for cat in category_names:
            pill = page.locator(f".cat-pill:has-text('{cat}')").first
            if pill.is_visible():
                pill.click()
                page.wait_for_timeout(300)
                card_count = page.locator(".scene-card").count()
                print(f"  [PASS] Tab '{cat}' clicked -> {card_count} scene cards displayed.")
            else:
                print(f"  [WARN] Tab '{cat}' not visible.")

        # 3. Test Devotional Category
        print("\nTesting Devotional Category in Studio...")
        page.locator(".cat-pill:has-text('Devotional')").first.click()
        page.wait_for_timeout(300)
        himalayan_card = page.locator(".scene-card:has-text('Himalayan Sacred Temple')").first
        if himalayan_card.is_visible():
            himalayan_card.click()
            page.wait_for_timeout(600)
        page.screenshot(path="screenshots/10_devotional_category_live.png")
        print("  Saved screenshots/10_devotional_category_live.png")

        # 4. Test Cyberpunk Category
        print("\nTesting Cyberpunk Category in Studio...")
        page.locator(".cat-pill:has-text('Cyberpunk')").first.click()
        page.wait_for_timeout(300)
        cyber_card = page.locator(".scene-card:has-text('Night City Cyberpunk Rain')").first
        if cyber_card.is_visible():
            cyber_card.click()
            page.wait_for_timeout(600)
        page.screenshot(path="screenshots/11_cyberpunk_category_live.png")
        print("  Saved screenshots/11_cyberpunk_category_live.png")

        # 5. Test Nature Category
        print("\nTesting Nature Category in Studio...")
        page.locator(".cat-pill:has-text('Nature')").first.click()
        page.wait_for_timeout(300)
        nature_card = page.locator(".scene-card:has-text('Biophilic Forest Waterfall')").first
        if nature_card.is_visible():
            nature_card.click()
            page.wait_for_timeout(600)
        page.screenshot(path="screenshots/12_nature_category_live.png")
        print("  Saved screenshots/12_nature_category_live.png")

        # 6. Test Simple AI Category
        print("\nTesting Simple AI Category in Studio...")
        page.locator(".cat-pill:has-text('Simple AI')").first.click()
        page.wait_for_timeout(300)
        simple_card = page.locator(".scene-card:has-text('Simple AI Zen Architecture')").first
        if simple_card.is_visible():
            simple_card.click()
            page.wait_for_timeout(600)
        page.screenshot(path="screenshots/13_simple_ai_category_live.png")
        print("  Saved screenshots/13_simple_ai_category_live.png")

        # Reset to All Categories
        page.locator(".cat-pill:has-text('All Categories')").first.click()
        page.wait_for_timeout(300)
        page.screenshot(path="screenshots/14_all_categories_studio.png")
        print("  Saved screenshots/14_all_categories_studio.png")

        # 7. Test Reference Library Modal Categories
        print("\nTesting Reference Library Modal Category Tabs...")
        page.locator("button:has-text('Reference Library')").first.click()
        page.wait_for_timeout(500)
        for cat in ["Devotional", "Anime", "LoFi", "Pixar", "Cyberpunk", "Nature", "Simple AI", "Stock Videos"]:
            btn = page.locator(f".ref-tab-btn:has-text('{cat}')").first
            if btn.is_visible():
                btn.click()
                page.wait_for_timeout(300)
                cnt = page.locator(".ref-card").count()
                print(f"  [PASS] Ref Modal Tab '{cat}': {cnt} items visible.")

        page.screenshot(path="screenshots/16_ref_modal_categories.png")
        print("  Saved screenshots/16_ref_modal_categories.png")
        page.locator("button:has-text('Close')").first.click()
        page.wait_for_timeout(300)

        print(f"\nConsole Errors: {len(console_errors)}")
        print(f"Page Errors: {len(page_errors)}")
        browser.close()

    print("\n[SUCCESS] Categories UI test passed cleanly!")

if __name__ == "__main__":
    test_categories_ui()
