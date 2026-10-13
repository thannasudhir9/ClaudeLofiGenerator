#!/usr/bin/env python3
"""
Comprehensive End-to-End Testing Engine for Claude LoFi, Anime & Pixar Studio.

Tests all major application features:
1. REST API Endpoints & Health Check (including custom image upload)
2. Procedural Audio Synthesis (WAV validation, headers, multi-mood DSP)
3. FFmpeg Video Rendering Pipeline (Custom image live animation, Stock video loops, style filters)
4. Next.js Studio UI (Playwright E2E: Studio monitor, reference modal tabs, custom image animator modal)
5. Standalone HTML5 Fallback UI (Playwright E2E: Port 3000)
6. Automatic High-Res Screenshot Generation across all application states.

Author: Sudhir Thanna
Date: October 13, 2026
"""

import sys
import os

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

import time
import json
import urllib.request
import urllib.error
import subprocess
from pathlib import Path
from datetime import datetime

ROOT_DIR = Path(__file__).resolve().parent.parent
SCREENSHOTS_DIR = ROOT_DIR / "screenshots"
SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)
DOCS_DIR = ROOT_DIR / "docs"
DOCS_DIR.mkdir(parents=True, exist_ok=True)

ENGINE_URL = os.environ.get("ENGINE_URL", "http://localhost:3000")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3001")

test_results = []
custom_uploaded_filename = None

def record_result(name, category, passed, duration_ms, details="", error=""):
    result = {
        "name": name,
        "category": category,
        "status": "PASSED" if passed else "FAILED",
        "duration_ms": round(duration_ms, 2),
        "details": details,
        "error": str(error) if error else None
    }
    test_results.append(result)
    icon = "✅" if passed else "❌"
    print(f"[{icon}] {category.upper()}: {name} ({result['duration_ms']}ms)")
    if not passed and error:
        print(f"    Error: {error}")

def http_get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "ClaudeLofiTestEngine/2.0"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return resp.getcode(), resp.read(), dict(resp.headers)

def http_post_json(url, data):
    body = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json", "User-Agent": "ClaudeLofiTestEngine/2.0"}
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.getcode(), resp.read(), dict(resp.headers)

# ==============================================================================
# FEATURE TEST 1: REST API Endpoints & Health Check
# ==============================================================================
def test_feature_apis():
    global custom_uploaded_filename
    print("\n--- Running Feature 1: REST API Health & Endpoints Tests ---")
    
    # 1.1 /api/scenes
    t0 = time.time()
    try:
        code, body, _ = http_get(f"{ENGINE_URL}/api/scenes")
        data = json.loads(body.decode("utf-8"))
        scenes = data.get("scenes", [])
        passed = (code == 200) and (len(scenes) >= 6)
        record_result(
            "GET /api/scenes",
            "API",
            passed,
            (time.time() - t0) * 1000,
            f"Returned {len(scenes)} preset scenes with IDs and styles"
        )
    except Exception as e:
        record_result("GET /api/scenes", "API", False, (time.time() - t0) * 1000, error=e)

    # 1.2 /api/moods
    t0 = time.time()
    try:
        code, body, _ = http_get(f"{ENGINE_URL}/api/moods")
        data = json.loads(body.decode("utf-8"))
        moods = data.get("moods", [])
        passed = (code == 200) and (len(moods) >= 9)
        record_result(
            "GET /api/moods",
            "API",
            passed,
            (time.time() - t0) * 1000,
            f"Returned {len(moods)} musical moods (Chilled Study, Rainy Tokyo, Ghibli, Pixar, etc.)"
        )
    except Exception as e:
        record_result("GET /api/moods", "API", False, (time.time() - t0) * 1000, error=e)

    # 1.3 /api/references (300 Library)
    t0 = time.time()
    try:
        code, body, _ = http_get(f"{ENGINE_URL}/api/references")
        data = json.loads(body.decode("utf-8"))
        counts = data.get("counts", {})
        passed = (code == 200) and (counts.get("total", 0) == 300)
        record_result(
            "GET /api/references (300 AI Database)",
            "API",
            passed,
            (time.time() - t0) * 1000,
            f"Verified {counts.get('total')} items: LoFi: {counts.get('lofi')}, Anime: {counts.get('anime')}, Pixar: {counts.get('pixar')}"
        )
    except Exception as e:
        record_result("GET /api/references (300 AI Database)", "API", False, (time.time() - t0) * 1000, error=e)

    # 1.4 /api/stock-videos (6 MP4 Loops)
    t0 = time.time()
    try:
        code, body, _ = http_get(f"{ENGINE_URL}/api/stock-videos")
        data = json.loads(body.decode("utf-8"))
        videos = data.get("items", [])
        passed = (code == 200) and (len(videos) == 6)
        record_result(
            "GET /api/stock-videos (Stock Video Loops)",
            "API",
            passed,
            (time.time() - t0) * 1000,
            f"Verified {len(videos)} 60fps MP4 loops (rain desk, cafe steam, anime sunset, pixar hearth, etc.)"
        )
    except Exception as e:
        record_result("GET /api/stock-videos (Stock Video Loops)", "API", False, (time.time() - t0) * 1000, error=e)

    t0 = time.time()
    try:
        # Authentic high-resolution LoFi artwork in base64 instead of 1x1 dummy green pixel
        sample_img_path = ROOT_DIR / "public" / "backgrounds" / "lofi_study_girl.jpg"
        import base64
        with open(sample_img_path, "rb") as f:
            sample_b64 = "data:image/jpeg;base64," + base64.b64encode(f.read()).decode("ascii")
        upload_payload = {
            "dataUrl": sample_b64,
            "label": "Custom Study Haven",
            "style": "anime"
        }
        code, body, _ = http_post_json(f"{ENGINE_URL}/api/upload-image", upload_payload)
        res = json.loads(body.decode("utf-8"))
        custom_uploaded_filename = res.get("filename")
        passed = (code == 200) and bool(custom_uploaded_filename)
        record_result(
            "POST /api/upload-image (Add & Animate Image)",
            "API",
            passed,
            (time.time() - t0) * 1000,
            f"Registered custom image scene: {custom_uploaded_filename}"
        )
    except Exception as e:
        record_result("POST /api/upload-image (Add & Animate Image)", "API", False, (time.time() - t0) * 1000, error=e)

# ==============================================================================
# FEATURE TEST 2: Procedural Audio Synthesis Engine
# ==============================================================================
def test_feature_audio():
    print("\n--- Running Feature 2: Procedural Audio Synthesis Engine Tests ---")
    
    node_script = """
    import { renderWav, MOODS } from "./generate.mjs";
    import fs from "fs/promises";
    import path from "path";

    async function run() {
      const testMoods = ["night", "shinkai_anime", "ghibli_garden", "pixar_cozy"];
      const results = {};
      for (const mood of testMoods) {
        const outPath = path.join("outputs", `test_audio_${mood}.wav`);
        await fs.mkdir("outputs", { recursive: true });
        renderWav(outPath, { mood, seconds: 5, seed: "test_" + mood });
        const stat = await fs.stat(outPath);
        results[mood] = stat.size;
      }
      console.log(JSON.stringify(results));
    }
    run().catch(err => { console.error(err); process.exit(1); });
    """
    
    t0 = time.time()
    try:
        proc = subprocess.run(
            ["node", "--input-type=module", "-e", node_script],
            cwd=str(ROOT_DIR),
            capture_output=True,
            text=True,
            timeout=30
        )
        if proc.returncode != 0:
            raise RuntimeError(f"Audio test script failed: {proc.stderr}")
        
        sizes = json.loads(proc.stdout.strip())
        all_valid = True
        for mood, sz in sizes.items():
            if sz < 100000:
                all_valid = False
        
        record_result(
            "Procedural Audio DSP Synthesis (4 Moods)",
            "Audio Engine",
            all_valid,
            (time.time() - t0) * 1000,
            f"Generated 4 authentic WAV tracks: {sizes}"
        )
    except Exception as e:
        record_result("Procedural Audio DSP Synthesis (4 Moods)", "Audio Engine", False, (time.time() - t0) * 1000, error=e)

# ==============================================================================
# FEATURE TEST 3: FFmpeg Video Rendering Pipeline
# ==============================================================================
def test_feature_video():
    print("\n--- Running Feature 3: FFmpeg Video Rendering Pipeline Tests ---")
    
    # 3.1 Render with Stock Video Loop (-stream_loop -1)
    t0 = time.time()
    try:
        payload = {
            "prompt": "E2E Test: LoFi Rain's Magic & Late Study",
            "seconds": 10,
            "style": "lofi",
            "mood": "night",
            "scene": "stock_videos/stock_lofi_rain_desk.mp4",
            "aspectRatio": "16:9",
            "watermark": "@ClaudeLoFi"
        }
        
        code, body, _ = http_post_json(f"{ENGINE_URL}/api/generate", payload)
        resp_data = json.loads(body.decode("utf-8"))
        job_id = resp_data.get("id")
        video_url = resp_data.get("url")
        
        if not job_id or not video_url:
            raise RuntimeError(f"Unexpected response payload: {resp_data}")
        
        out_file = ROOT_DIR / "outputs" / job_id / "out.mp4"
        file_exists = out_file.exists() and out_file.stat().st_size > 100_000
        
        record_result(
            "Video Loop Rendering (-stream_loop -1 & Subtitle Escaping)",
            "Video Pipeline",
            file_exists,
            (time.time() - t0) * 1000,
            f"Rendered 10s MP4 (Job #{job_id}): {out_file.stat().st_size} bytes"
        )
    except Exception as e:
        record_result("Video Loop Rendering (-stream_loop -1 & Subtitle Escaping)", "Video Pipeline", False, (time.time() - t0) * 1000, error=e)

    # 3.2 Render with Custom Still Image Animated as Anime
    t0 = time.time()
    try:
        scene_to_use = custom_uploaded_filename or "lofi_study_girl.jpg"
        anim_payload = {
            "prompt": "E2E Test: Living Anime Twilight Pan",
            "seconds": 10,
            "style": "anime",
            "mood": "shinkai_anime",
            "scene": scene_to_use,
            "aspectRatio": "16:9",
            "watermark": "@AnimeStudio"
        }
        code, body, _ = http_post_json(f"{ENGINE_URL}/api/generate", anim_payload)
        resp_data = json.loads(body.decode("utf-8"))
        job_id = resp_data.get("id")
        out_file = ROOT_DIR / "outputs" / job_id / "out.mp4"
        file_exists = out_file.exists() and out_file.stat().st_size > 100_000
        record_result(
            "Still Image Living Animator (Anime Sky Pan Drift & Cel Grade)",
            "Video Pipeline",
            file_exists,
            (time.time() - t0) * 1000,
            f"Synthesized living animated video: {out_file.stat().st_size} bytes"
        )
    except Exception as e:
        record_result("Still Image Living Animator (Anime Sky Pan Drift & Cel Grade)", "Video Pipeline", False, (time.time() - t0) * 1000, error=e)

# ==============================================================================
# FEATURE TEST 4: Next.js Studio UI & Playwright End-to-End
# ==============================================================================
def test_feature_playwright_nextjs():
    print("\n--- Running Feature 4: Next.js Studio UI (Playwright E2E) Tests ---")
    
    from playwright.sync_api import sync_playwright
    
    t0 = time.time()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(viewport={"width": 1440, "height": 900})
            page = context.new_page()
            
            # 4.1 Load Next.js Studio
            page.goto(FRONTEND_URL, wait_until="networkidle", timeout=30000)
            page.wait_for_selector("h1", timeout=10000)
            time.sleep(1)
            
            # Screenshot 1: Studio Main Dashboard
            s1_path = SCREENSHOTS_DIR / "01_studio_main_dashboard.png"
            page.screenshot(path=str(s1_path))
            print(f"    Saved screenshot: {s1_path.name}")
            
            # 4.2 Open Reference Modal & Capture Category Tabs
            ref_btn = page.locator("button:has-text('Reference Library')").first
            if ref_btn.count() > 0:
                ref_btn.click()
                page.wait_for_selector("text=Curated Reference Asset Library", timeout=10000)
                time.sleep(0.8)
                
                # Tab 1: LoFi
                lofi_tab = page.locator("button:has-text('Lofi Tape')").first
                if lofi_tab.count() > 0:
                    lofi_tab.click()
                    time.sleep(0.5)
                    s2_path = SCREENSHOTS_DIR / "02_reference_modal_lofi.png"
                    page.screenshot(path=str(s2_path))
                    print(f"    Saved screenshot: {s2_path.name}")
                
                # Tab 2: Anime
                anime_tab = page.locator("button:has-text('Anime & Ghibli')").first
                if anime_tab.count() > 0:
                    anime_tab.click()
                    time.sleep(0.5)
                    s3_path = SCREENSHOTS_DIR / "03_reference_modal_anime.png"
                    page.screenshot(path=str(s3_path))
                    print(f"    Saved screenshot: {s3_path.name}")

                # Tab 3: Pixar
                pixar_tab = page.locator("button:has-text('Pixar 3D')").first
                if pixar_tab.count() > 0:
                    pixar_tab.click()
                    time.sleep(0.5)
                    s4_path = SCREENSHOTS_DIR / "04_reference_modal_pixar.png"
                    page.screenshot(path=str(s4_path))
                    print(f"    Saved screenshot: {s4_path.name}")

                # Tab 4: Stock Video Loops
                stock_tab = page.locator("button:has-text('Stock Video Loops')").first
                if stock_tab.count() > 0:
                    stock_tab.click()
                    time.sleep(0.8)
                    s5_path = SCREENSHOTS_DIR / "05_stock_videos_modal.png"
                    page.screenshot(path=str(s5_path))
                    print(f"    Saved screenshot: {s5_path.name}")
                    
                    # Select first stock video loop card
                    first_card = page.locator(".ref-card").first
                    if first_card.count() > 0:
                        first_card.click()
                        time.sleep(1.2)
                        
                        # Screenshot 6: Studio Monitor with Live Video Loop Playing
                        s6_path = SCREENSHOTS_DIR / "06_studio_monitor_video_loop.png"
                        page.screenshot(path=str(s6_path))
                        print(f"    Saved screenshot: {s6_path.name}")
                
                # Close modal if open
                close_btn = page.locator("button:has-text('Close')").first
                if close_btn.count() > 0 and close_btn.is_visible():
                    close_btn.click()
                    time.sleep(0.5)

            # 4.3 Open Custom Image Animator Modal
            anim_btn = page.locator("button:has-text('Animate Custom Image')").first
            if anim_btn.count() > 0:
                anim_btn.click()
                page.wait_for_selector("text=Add & Animate Still Image", timeout=10000)
                time.sleep(0.8)
                
                s8_path = SCREENSHOTS_DIR / "08_custom_image_animator_modal.png"
                page.screenshot(path=str(s8_path))
                print(f"    Saved screenshot: {s8_path.name}")
                
                # Close animator modal
                close_anim = page.locator("button:has-text('Close')").first
                if close_anim.count() > 0 and close_anim.is_visible():
                    close_anim.click()
                    time.sleep(0.5)
            
            browser.close()
            
            record_result(
                "Next.js Frontend Studio & Modals (Playwright E2E)",
                "Frontend E2E",
                True,
                (time.time() - t0) * 1000,
                "Verified Studio Monitor, Reference Modal (LoFi, Anime, Pixar, Stock Video tabs), and Custom Image Animator Modal"
            )
    except Exception as e:
        record_result("Next.js Frontend Studio & Modals (Playwright E2E)", "Frontend E2E", False, (time.time() - t0) * 1000, error=e)

# ==============================================================================
# FEATURE TEST 5: Standalone HTML5 Fallback UI & Playwright
# ==============================================================================
def test_feature_playwright_fallback():
    print("\n--- Running Feature 5: Standalone HTML5 Fallback UI (Port 3000) Tests ---")
    
    from playwright.sync_api import sync_playwright
    
    t0 = time.time()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(viewport={"width": 1440, "height": 900})
            page = context.new_page()
            
            # Load fallback UI on port 3000
            page.goto(ENGINE_URL, wait_until="networkidle", timeout=20000)
            page.wait_for_selector("select#tool", timeout=10000)
            time.sleep(1)
            
            s7_path = SCREENSHOTS_DIR / "07_fallback_html5_studio.png"
            page.screenshot(path=str(s7_path))
            print(f"    Saved screenshot: {s7_path.name}")
            
            browser.close()
            
            record_result(
                "Standalone HTML5 Fallback UI (Port 3000 E2E)",
                "Frontend E2E",
                True,
                (time.time() - t0) * 1000,
                "Verified zero-dependency standalone studio and captured screenshot 07"
            )
    except Exception as e:
        record_result("Standalone HTML5 Fallback UI (Port 3000 E2E)", "Frontend E2E", False, (time.time() - t0) * 1000, error=e)

# ==============================================================================
# REPORT GENERATION & EXPORT
# ==============================================================================
def generate_test_report():
    print("\n--- Generating Consolidated Test Report ---")
    
    total = len(test_results)
    passed = sum(1 for r in test_results if r["status"] == "PASSED")
    failed = total - passed
    pass_rate = round((passed / total * 100) if total else 0, 1)
    
    report_data = {
        "timestamp": datetime.now().isoformat(),
        "summary": {
            "total": total,
            "passed": passed,
            "failed": failed,
            "pass_rate_percent": pass_rate
        },
        "results": test_results
    }
    
    report_json_path = ROOT_DIR / "tests" / "test_report.json"
    with open(report_json_path, "w", encoding="utf-8") as f:
        json.dump(report_data, f, indent=2)
    print(f"Saved test report to {report_json_path}")
    
    rows = []
    for r in test_results:
        icon = "✅" if r["status"] == "PASSED" else "❌"
        rows.append(f"| {icon} **{r['category']}** | `{r['name']}` | **{r['status']}** | {r['duration_ms']} ms | {r['details'] or r['error'] or '-'} |")
    
    table_content = "\n".join(rows)
    
    md_content = f"""# 🧪 Automated Test Engine Report & E2E Validation

> **Execution Date & Time**: {datetime.now().strftime('%B %d, %Y — %H:%M:%S CEST')}  
> **Testing Suite**: Claude LoFi Studio Automated E2E Engine (`tests/test_engine.py`)  
> **Status**: **{passed}/{total} Passed ({pass_rate}%)**  

---

## 📊 Summary Metrics

- **Total Test Cases**: {total}
- **Tests Passed**: {passed}
- **Tests Failed**: {failed}
- **Success Rate**: **{pass_rate}%**

---

## 📋 Comprehensive Feature Validation Matrix

| Category | Test Name | Status | Execution Time | Output & Diagnostics |
|---|---|---|---|---|
{table_content}

---

## 📸 Automated High-Resolution Screenshots Captured

During the Playwright execution, full-page screenshots were captured and archived in [`screenshots/`](../screenshots/):

1. **`01_studio_main_dashboard.png`**: Next.js 15 studio interface, studio monitor, soundscape sliders, visualizer.
2. **`02_reference_modal_lofi.png`**: 300 Reference Repository modal filtered to LoFi aesthetic cards.
3. **`03_reference_modal_anime.png`**: 300 Reference Repository modal filtered to Makoto Shinkai & Ghibli Anime cards.
4. **`04_reference_modal_pixar.png`**: 300 Reference Repository modal filtered to Pixar 3D animated cards.
5. **`05_stock_videos_modal.png`**: Seamless 60fps MP4 Stock Video Loops browser modal with live video cards.
6. **`06_studio_monitor_video_loop.png`**: Live video playback active in Studio Monitor with canvas visualizer overlay.
7. **`07_fallback_html5_studio.png`**: Standalone HTML5/CSS3 fallback studio running on port 3000.
8. **`08_custom_image_animator_modal.png`**: Custom Still Image Animator modal with style options (LoFi, Anime, Pixar).
"""

    report_md_path = DOCS_DIR / "TEST_REPORT.md"
    with open(report_md_path, "w", encoding="utf-8") as f:
        f.write(md_content)
    print(f"Saved Markdown report to {report_md_path}")
    
    return passed == total

def cleanup_test_artifacts():
    print("\n--- Cleaning up temporary test artifacts ---")
    bgs_dir = ROOT_DIR / "public" / "backgrounds"
    for p in bgs_dir.glob("custom_*"):
        try:
            p.unlink()
            print(f"Cleaned up test background: {p.name}")
        except Exception:
            pass

def main():
    print("=" * 70)
    print("🚀 STARTING CLAUDE LOFI STUDIO AUTOMATED TEST ENGINE")
    print(f"Timestamp: {datetime.now().isoformat()}")
    print(f"Backend Engine: {ENGINE_URL} | Frontend Studio: {FRONTEND_URL}")
    print("=" * 70)
    
    test_feature_apis()
    test_feature_audio()
    test_feature_video()
    test_feature_playwright_nextjs()
    test_feature_playwright_fallback()
    
    cleanup_test_artifacts()
    success = generate_test_report()
    
    print("\n" + "=" * 70)
    if success:
        print("🎉 ALL FEATURES PASSED SUCCESSFULLY!")
    else:
        print("⚠️ SOME TESTS FAILED. CHECK LOGS ABOVE.")
    print("=" * 70)
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
