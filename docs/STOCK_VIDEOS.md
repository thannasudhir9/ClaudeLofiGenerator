# 🎬 Stock Video Loops & AI Video Generation Pipeline

> **Document Version**: 2.0.0  
> **Date & Time**: October 13, 2026 — 15:08:05 CEST (UTC+2)  
> **Project**: Claude LoFi, Anime & Pixar Multimedia Production Studio  
> **Author**: Sudhir Thanna (`thannasudhir9`)  

---

## 1. Overview

While static image backgrounds combined with dynamic zoom-and-pan effects produce compelling visuals, true high-engagement social media content demands **living, continuous motion video loops**.

The Claude LoFi Studio integrates an advanced **Stock Video & AI Video Loop Pipeline** that supports:
1. Built-in seamless 60fps MP4 video loops.
2. FFmpeg infinite looping (`-stream_loop -1`) to match any arbitrary musical duration.
3. Live video streaming from external stock providers (Pexels, Pixabay, Mixkit) or generative AI video tools (Runway Gen-3, Luma Dream Machine, Kling AI, Sora).
4. Direct drag-and-drop video upload supporting MP4 and animated GIF formats.

---

## 2. Built-in Stock Video Loops (`public/stock_videos/`)

The repository includes 6 high-definition, 60 frames-per-second, 10-second seamless MP4 loops:

| Video File | Style | Resolution | FPS | Size | Visual Description & Motion Elements |
|---|---|---|---|---|---|
| `stock_lofi_rain_desk.mp4` | LoFi | 1920x1080 | 60 | 11.5 MB | Continuous rain streaks streaming down a window pane with warm amber desk lamp reflections and subtle raindrops hitting the sill. |
| `stock_lofi_cafe.mp4` | LoFi | 1920x1080 | 60 | 11.8 MB | Atmospheric Parisian cafe with swirling steam rising continuously from a warm coffee cup, soft rain blurred in the background. |
| `stock_anime_sunset.mp4` | Anime | 1920x1080 | 60 | 0.57 MB | Makoto Shinkai style twilight with shifting cumulus clouds, shimmering evening stars, and glowing golden horizon light. |
| `stock_anime_ghibli.mp4` | Anime | 1920x1080 | 60 | 0.97 MB | Studio Ghibli inspired country meadow with gentle wind swaying through tall green grass and glowing fireflies floating in the breeze. |
| `stock_pixar_fireplace.mp4` | Pixar | 1920x1080 | 60 | 0.57 MB | Stylized 3D cozy hearth with crackling fire flames, soft rising embers, and warm golden lighting illuminating a rustic cabin. |
| `stock_pixar_stars.mp4` | Pixar | 1920x1080 | 60 | 0.52 MB | 3D rooftop observatory with a brass telescope overlooking a softly swirling deep space galaxy and twinkling starlight. |

---

## 3. Seamless Looping Architecture (`-stream_loop -1`)

A primary technical challenge in video generation is taking a short 10-second animation loop and cleanly stretching it to a 60-second, 120-second, or 240-second procedural music track without audio desync or visible video seams.

### 3.1 FFmpeg Pipeline Implementation
In `server.mjs`, when `resolveScenePath()` determines that the input asset is a video (`bg.kind === "video"`), FFmpeg is executed with the `-stream_loop -1` input flag:

```javascript
if (bg.kind === "video") {
  // -stream_loop -1: Repeat the video stream indefinitely
  // -i bg.filePath: Input video loop
  // -i audioPath: Procedural audio WAV
  // -t duration: Output trimmed to exact audio duration
  args.push("-stream_loop", "-1", "-i", bg.filePath);
} else {
  // Static image fallback
  args.push("-loop", "1", "-t", String(duration), "-i", bg.filePath);
}
```

### 3.2 Benefits of `-stream_loop -1`
- **Zero Transcoding Overhead on Input**: FFmpeg loops the packet stream directly without decoding and re-encoding repetitive frames until the output muxer.
- **Microsecond Precision**: Video playback duration matches the generated WAV audio track down to the exact millisecond.
- **Seamless Loop Points**: The stock video loops have matching start and end boundary frames, resulting in an imperceptible transition at every loop iteration.

---

## 4. External Stock Videos & AI Generation Workflows

Users are not limited to the built-in library. The engine supports two additional video acquisition pathways:

### 4.1 Remote Video URLs (Free Stock Providers)
Users can provide direct links to MP4 video loops from royalty-free platforms:
- **Pexels Video**: Search terms like `"lofi rain"`, `"neon tokyo"`, `"cafe steam"`.
- **Pixabay Video**: High-quality CC0 animated video backgrounds.
- **Mixkit**: Free LoFi art loops.

When a URL is supplied in `POST /api/generate` under `videoUrl`:
1. The server invokes `downloadVideo(url, targetDir)`.
2. Validates HTTP status and streams the file to `targetDir/input_stream.mp4`.
3. Enforces a **50 MB size cap** to prevent memory leaks or disk exhaustion.
4. Feeds the downloaded video directly into the FFmpeg `-stream_loop` renderer.

### 4.2 Generative AI Video Loops (Sora, Runway, Luma, Kling)
To generate completely novel video loops using modern AI:
1. Use prompts from [`docs/REFERENCE_REPO.md`](file:///c:/Users/thann/Downloads/AntiGravity/ClaudeLoFiGenerator/docs/REFERENCE_REPO.md) in tools like **Runway Gen-3 Alpha Turbo**, **Luma Dream Machine**, or **Kling AI**.
2. Specify camera motions: `"Subtle stationary camera, infinite looping animation, slow breathing motion"`.
3. Download the generated MP4 output and either:
   - Drop the file into `public/stock_videos/` and append its entry in `public/stock_videos/catalog.json`.
   - Or upload the file directly through the UI file upload input (`POST /api/upload`).

---

## 5. REST API & UI Integration

### 5.1 Stock Videos Endpoint (`GET /api/stock-videos`)
Returns the indexed stock video catalog:
```json
{
  "total": 6,
  "items": [
    {
      "id": "stock_lofi_rain_desk",
      "filename": "stock_lofi_rain_desk.mp4",
      "title": "Rain on Window Study Desk",
      "category": "lofi",
      "duration": 10,
      "fps": 60,
      "tags": ["rain", "window", "desk", "lamp", "cozy"],
      "url": "/stock_videos/stock_lofi_rain_desk.mp4"
    }
    /* ... 5 additional items ... */
  ]
}
```

### 5.2 Next.js Studio Monitor Integration
In `web/app/page.tsx`:
- When a user selects a stock video, the **Studio Monitor** switches from an `<img>` tag to an `<video>` element with `autoPlay`, `loop`, `muted`, and `playsInline` attributes.
- The user can see the animated loop playing live in real time behind the 60fps canvas audio spectrum visualizer.
- Clicking the **"🎬 Stock Video Loops"** button opens a dedicated modal displaying live autoplaying previews for all available loops.
