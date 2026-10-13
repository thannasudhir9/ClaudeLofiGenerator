import json
import os
import subprocess
import sys
import time
import urllib.request

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

BASE_URL = "http://localhost:3000"

CATEGORIES_TEST_SUITE = [
    {
        "category": "devotional",
        "style": "devotional",
        "scene": "devotional_himalayan_temple.jpg",
        "mood": "devotional_temple",
        "prompt": "Ethereal Himalayan temple golden sunrise prayer",
        "seconds": 10,
    },
    {
        "category": "anime",
        "style": "anime",
        "scene": "anime_shinkai_sunset.jpg",
        "mood": "shinkai_anime",
        "prompt": "Makoto Shinkai anime twilight express train",
        "seconds": 10,
    },
    {
        "category": "lofi",
        "style": "lofi",
        "scene": "lofi_study_girl.jpg",
        "mood": "night",
        "prompt": "Rainy lofi midnight study session with cat",
        "seconds": 10,
    },
    {
        "category": "pixar",
        "style": "pixar",
        "scene": "pixar_cozy_cabin.jpg",
        "mood": "pixar_cozy",
        "prompt": "Pixar 3D animated cozy fireplace hearth",
        "seconds": 10,
    },
    {
        "category": "cyberpunk",
        "style": "cyberpunk",
        "scene": "cyberpunk_neon_rain.jpg",
        "mood": "cyber_synthwave",
        "prompt": "Night city cyberpunk neon rain and ramen stall",
        "seconds": 10,
    },
    {
        "category": "nature",
        "style": "nature",
        "scene": "nature_biophilic_waterfall.jpg",
        "mood": "nature_sanctuary",
        "prompt": "Biophilic greenhouse sanctuary waterfall tranquility",
        "seconds": 10,
    },
    {
        "category": "simple_ai",
        "style": "simple_ai",
        "scene": "simple_ai_minimal_lounge.jpg",
        "mood": "simple_minimal",
        "prompt": "Simple AI minimalist modern zen lounge",
        "seconds": 10,
    },
]

def ffprobe_inspect(file_path):
    cmd = [
        "ffprobe",
        "-v", "error",
        "-show_entries", "format=duration,size:stream=codec_type,codec_name,width,height,r_frame_rate",
        "-of", "json",
        file_path,
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        return None
    return json.loads(res.stdout)

def main():
    print(f"=== Category Animation & Video Generation Test Suite ===")
    print(f"Target Server: {BASE_URL}")
    print(f"Testing {len(CATEGORIES_TEST_SUITE)} Categories: devotional, anime, lofi, pixar, cyberpunk, nature, simple_ai\n")

    results = []
    overall_success = True

    for i, test in enumerate(CATEGORIES_TEST_SUITE, 1):
        cat = test["category"]
        print(f"[{i}/{len(CATEGORIES_TEST_SUITE)}] Testing Category: {cat.upper()} ...")
        payload = {
            "prompt": test["prompt"],
            "seconds": test["seconds"],
            "style": test["style"],
            "mood": test["mood"],
            "scene": test["scene"],
            "aspectRatio": "16:9",
        }

        t0 = time.time()
        req = urllib.request.Request(
            f"{BASE_URL}/api/generate",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )

        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            elapsed = time.time() - t0

            job_id = data.get("id")
            mp4_rel = data.get("url")
            wav_rel = data.get("audioUrl")
            mp4_path = os.path.normpath(os.path.join(".", mp4_rel.lstrip("/")))
            wav_path = os.path.normpath(os.path.join(".", wav_rel.lstrip("/")))

            if not os.path.exists(mp4_path):
                raise FileNotFoundError(f"Output MP4 missing: {mp4_path}")
            if not os.path.exists(wav_path):
                raise FileNotFoundError(f"Output WAV missing: {wav_path}")

            mp4_size = os.path.getsize(mp4_path)
            wav_size = os.path.getsize(wav_path)

            probe = ffprobe_inspect(mp4_path)
            streams = probe.get("streams", []) if probe else []
            has_video = any(s.get("codec_type") == "video" for s in streams)
            has_audio = any(s.get("codec_type") == "audio" for s in streams)
            duration = float(probe.get("format", {}).get("duration", 0)) if probe else 0

            status = "PASSED" if (has_video and has_audio and mp4_size > 50000) else "FAILED"
            if status == "FAILED":
                overall_success = False

            res_info = {
                "category": cat,
                "style": test["style"],
                "job_id": job_id,
                "status": status,
                "duration": duration,
                "mp4_size_kb": round(mp4_size / 1024, 1),
                "wav_size_kb": round(wav_size / 1024, 1),
                "has_video": has_video,
                "has_audio": has_audio,
                "render_time_sec": round(elapsed, 2),
                "mp4_path": mp4_path,
            }
            results.append(res_info)
            print(f"    -> Status: {status} | Render Time: {elapsed:.2f}s | Size: {res_info['mp4_size_kb']} KB | Duration: {duration:.1f}s | Has Audio: {has_audio} | Has Video: {has_video}")

        except Exception as e:
            overall_success = False
            print(f"    -> FAILED with error: {e}")
            results.append({
                "category": cat,
                "style": test["style"],
                "status": "FAILED",
                "error": str(e),
            })

    print("\n" + "=" * 70)
    print("CATEGORIES END-TO-END VALIDATION SUMMARY:")
    print("=" * 70)
    for r in results:
        stat_symbol = "[PASS]" if r["status"] == "PASSED" else "[FAIL]"
        if r["status"] == "PASSED":
            print(f"{stat_symbol} Category: {r['category']:<12} | Style: {r['style']:<12} | MP4: {r['mp4_size_kb']} KB | Audio: {r['has_audio']} | Video: {r['has_video']} | Time: {r['render_time_sec']}s")
        else:
            print(f"{stat_symbol} Category: {r['category']:<12} | Error: {r.get('error', 'Unknown')}")
    print("=" * 70)

    # Save summary report to JSON
    with open("tests/categories_test_report.json", "w", encoding="utf-8") as f:
        json.dump({"timestamp": time.strftime("%Y-%m-%dT%H:%M:%S%z"), "results": results}, f, indent=2)

    if not overall_success:
        sys.exit(1)
    print("ALL 7 CATEGORIES ANIMATED AND RENDERED TO LIVE VIDEOS SUCCESSFULLY!")

if __name__ == "__main__":
    main()
