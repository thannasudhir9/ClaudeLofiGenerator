import os
import sys
import time
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

REPO_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCREENSHOTS_DIR = os.path.join(REPO_DIR, "screenshots")
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

def main():
    print("Capturing transcript feature screenshots from http://localhost:3001/ ...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 920})

        page.goto("http://localhost:3001/", wait_until="networkidle")
        time.sleep(1)

        # 1. Main Studio Dashboard with Unlimited 999,999,999 Credits Pill & Strict Prompt Fidelity
        p1 = os.path.join(SCREENSHOTS_DIR, "17_unlimited_credits_and_fidelity.png")
        page.screenshot(path=p1, full_page=False)
        print(f"Captured: {p1}")

        # 2. Switch to On-Screen Lyrics Studio Mode
        lyrics_tab = page.locator('button:has-text("On-Screen Lyrics")').first
        if lyrics_tab.is_visible():
            lyrics_tab.click()
            time.sleep(1)
            p2 = os.path.join(SCREENSHOTS_DIR, "18_lyrics_studio_telugu.png")
            page.screenshot(path=p2, full_page=False)
            print(f"Captured: {p2}")

        browser.close()
    print("Screenshots captured successfully!")

if __name__ == "__main__":
    main()
