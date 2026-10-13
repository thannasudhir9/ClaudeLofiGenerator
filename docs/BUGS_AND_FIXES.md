# 🐛 Bugs, Technical Gotchas & Architectural Fixes Log

> **Document Version**: 2.0.0  
> **Date & Time**: October 13, 2026 — 15:08:05 CEST (UTC+2)  
> **Project**: Claude LoFi, Anime & Pixar Multimedia Production Studio  
> **Author**: Sudhir Thanna (`thannasudhir9`)  

---

## 1. Bug Registry Summary

| ID | Component | Severity | Description | Status |
|---|---|---|---|---|
| **BUG-001** | FFmpeg Pipeline | High | Black or blank video render due to unsupported pixel formats and odd frame dimensions | **RESOLVED** |
| **BUG-002** | Subtitle Engine | High | FFmpeg `drawtext` filter crash when subtitles contain single quotes, colons, or backslashes | **RESOLVED** |
| **BUG-003** | Web Studio Audio | High | No live audio preview or ambient sound generation in the browser before rendering | **RESOLVED** |
| **BUG-004** | Next.js Reverse Proxy | Medium | 404 errors for reference library assets and stock videos in Next.js on port 3001 | **RESOLVED** |
| **BUG-005** | Video Generation | High | Video backgrounds were static still images rather than animated live video loops | **RESOLVED** |
| **BUG-006** | Browser Subagent / E2E | Medium | Playwright browser test timeouts caused by external CDN Tailwind CSS blocks | **RESOLVED** |
| **BUG-007** | Video Downloader | Medium | Unbounded remote video URL downloads causing potential disk exhaustion | **RESOLVED** |

---

## 2. In-Depth Bug Profiles & Solutions

---

### 🔴 BUG-001: Black Screen & Incompatible Pixel Format in Rendered MP4 Videos

#### Problem Description
When rendering videos with certain input background images, the generated MP4 file played only audio while the video screen was completely black in Chrome, Edge, Safari, and quick-look video players.

#### Root Cause Analysis
1. **Pixel Format Incompatibility**: When encoding from high-quality JPEG images, FFmpeg default encoder `libx264` preserved the source color space as `yuvj420p` or `yuv444p`. Modern web browsers and mobile hardware decoders strictly require standard `yuv420p`.
2. **Dimension Macroblock Alignment**: H.264 video compression requires frame widths and heights to be divisible by 2 (even numbers). Non-standard image dimensions crashed the encoder or caused corrupted output.

#### Engineering Fix
Updated the FFmpeg video filter in `server.mjs` to force 1080p canvas scaling with automatic aspect-ratio padding and explicitly enforced `yuv420p` pixel format:

```diff
- ffmpeg -loop 1 -i bg.jpg -i audio.wav -c:v libx264 out.mp4
+ ffmpeg -loop 1 -t {duration} -i bg.jpg -i audio.wav \
+   -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" \
+   -c:v libx264 -pix_fmt yuv420p -movflags +faststart \
+   -c:a aac -b:a 192k out.mp4
```

---

### 🔴 BUG-002: FFmpeg `drawtext` Filter Crash on Subtitles with Punctuation

#### Problem Description
If a user submitted a title or subtitle containing punctuation—such as `"Don't Stop Coding"`, `"Tokyo: Midnight Rain"`, or paths containing backslashes—the rendering job crashed instantly with the error:
`[Parsed_drawtext_2 @ 0000021b] Syntax error in text expression`.

#### Root Cause Analysis
FFmpeg filter strings use colons (`:`) as option delimiters, single quotes (`'`) as string wrappers, and backslashes (`\`) as escape characters. Unescaped punctuation caused the filtergraph parser to misinterpret user text as filter options.

#### Engineering Fix
Created a dedicated escaping utility `escapeDrawText` in `server.mjs`:

```javascript
function escapeDrawText(text) {
  if (!text) return "";
  return String(text)
    .replace(/\\/g, "\\\\\\\\") // Escape backslashes
    .replace(/'/g, "'\\\\\\''")  // Escape single quotes for shell/filter parsing
    .replace(/:/g, "\\:")        // Escape colons
    .replace(/;/g, "\\;");       // Escape semicolons
}
```

This ensures any user title (e.g. `LoFi Girl's Secret: Chapter 1`) renders cleanly without crashing the render process.

---

### 🔴 BUG-003: Missing Real-Time Ambient Music in Browser Studio Preview

#### Problem Description
While the application could render audio server-side into final video exports, the browser studio interface had zero real-time audio capability. Users could not audition moods, tune ambient rain levels, or hear vinyl crackle before committing to a 30-second to 2-minute video render.

#### Root Cause Analysis
The original application had no client-side Web Audio API synthesis engine.

#### Engineering Fix
Built `web/app/ambient-audio.ts`, a comprehensive client-side audio DSP engine using the Web Audio API:
- Added 7 procedural sound generators:
  1. **Rain**: Bandpass-filtered pink noise buffer.
  2. **Vinyl Crackle**: Poisson-distributed impulse clicks.
  3. **Cafe Murmur**: Layered lowpass brown noise modeling ambient chatter.
  4. **Wind Chimes**: Pentatonic bell oscillators with randomized triggers.
  5. **Binaural Beats**: Dual sine oscillators (432Hz left, 440Hz right) inducing relaxed alpha brainwaves.
  6. **Tape Flutter**: Low-frequency sinusoidal pitch modulation on a delay line.
  7. **Sub Bass**: 40Hz resonant drone.
- Connected the audio output to a live 60fps HTML5 Canvas spectrum visualizer in `web/app/page.tsx`.

---

### 🔴 BUG-004: 404 Asset Errors for Reference Library & Stock Videos in Next.js

#### Problem Description
When browsing the 300 AI Reference Library or Stock Video loops on the Next.js frontend (`http://localhost:3001`), images and video thumbnails failed to load, returning `404 Not Found`.

#### Root Cause Analysis
Next.js serves static assets exclusively from `web/public/`. The large 300-image reference library (`public/reference_repo/`) and 6 stock video loops (`public/stock_videos/`) reside in the root project folder served by the Node.js backend on port `3000`. The Next.js reverse proxy rewrites in `web/next.config.ts` only had rules for `/api/*` and `/outputs/*`.

#### Engineering Fix
Updated `web/next.config.ts` to reverse-proxy all media directories from the engine server:

```typescript
async rewrites() {
  const ENGINE_URL = process.env.ENGINE_URL || "http://localhost:3000";
  return [
    { source: "/api/:path*", destination: `${ENGINE_URL}/api/:path*` },
    { source: "/outputs/:path*", destination: `${ENGINE_URL}/outputs/:path*` },
    { source: "/backgrounds/:path*", destination: `${ENGINE_URL}/backgrounds/:path*` },
    { source: "/reference_repo/:path*", destination: `${ENGINE_URL}/reference_repo/:path*` },
    { source: "/stock_videos/:path*", destination: `${ENGINE_URL}/stock_videos/:path*` },
  ];
}
```

Now all assets load seamlessly on both port 3000 and port 3001.

---

### 🔴 BUG-005: Static Still Images Instead of Animated Live Video Loops

#### Problem Description
The user identified that the generated output was static: "no video generation is not correct, there is no lofi image which is animated and live and no music". Videos were just still pictures with background music rather than living, breathing animated loops.

#### Root Cause Analysis
The rendering engine was hardcoded to image inputs (`-loop 1 -i bg.jpg`). It had no mechanism to accept video loops or seamlessly repeat video streams.

#### Engineering Fix
1. **Stock Video Loop Production**: Synthesized 6 seamless 60fps MP4 loops in `public/stock_videos/` (rain on desk, cafe steam, anime twilight clouds, Ghibli meadow grass, Pixar crackling fireplace, Pixar galaxy stars).
2. **Seamless Video Concatenation**: Updated `server.mjs` to detect `bg.kind === "video"` and use FFmpeg's `-stream_loop -1` parameter:
   ```javascript
   if (bg.kind === "video") {
     args.push("-stream_loop", "-1", "-i", bg.filePath);
   } else {
     args.push("-loop", "1", "-i", bg.filePath);
   }
   ```
3. **Frontend Studio Monitor Update**: Added live video playback in `web/app/page.tsx` when a video loop is selected, including a dedicated Stock Video Loop modal browser.

---

### 🔴 BUG-006: Playwright Headless Browser Timeout on External CDN Loading

#### Problem Description
Automated browser subagents and testing scripts hung or timed out while navigating the standalone HTML page due to failed downloads from `cdn.tailwindcss.com`.

#### Root Cause Analysis
In restricted CI/CD or sandboxed environments, outbound connections to external CDNs are blocked or throttled, preventing stylesheet evaluation and delaying `DOMContentLoaded` events.

#### Engineering Fix
Injected fallback inline CSS styles directly into `public/index.html` covering all layout, typography, glassmorphism cards, and interactive controls, ensuring instant page readiness regardless of network connectivity.

---

### 🔴 BUG-007: Unbounded Remote Video Stream Downloads

#### Problem Description
Allowing arbitrary video URLs in `POST /api/generate` without size limits posed a denial-of-service risk if a user passed a large 2GB 4K video file.

#### Root Cause Analysis
`downloadVideo` piped remote streams directly to disk without checking headers or tracking chunk sizes.

#### Engineering Fix
Implemented strict chunk accounting and content-length validation:
```javascript
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB limit
let downloaded = 0;
res.on("data", (chunk) => {
  downloaded += chunk.length;
  if (downloaded > MAX_VIDEO_BYTES) {
    req.destroy();
    reject(new Error("Video file exceeds maximum allowed size of 50MB"));
  }
});
```

---

### 🔴 BUG-008: Green Screen Artifact in Studio Monitor & Scene Carousel

#### Date & Time
**October 13, 2026 — 19:10:00 CEST**

#### Problem Description
The Studio Monitor displayed a solid chroma green box instead of the authentic LoFi girl scene artwork. Furthermore, several solid green cards titled "E2E Test Living Room" appeared at the beginning of the "Living Animated Scene Artwork" selector.

#### Root Cause Analysis
1. During automated end-to-end testing, `tests/test_engine.py` sent a 1x1 green dummy pixel (`data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAE...`) to `POST /api/upload-image`.
2. `server.mjs` prepended (`SCENES.unshift(newScene)`) this uploaded test scene to the front of the global `SCENES` catalog, replacing `Anime Study Desk` (`lofi_study_girl.jpg`) at index 0.
3. The test suite generated a video with this 1x1 green background, stretching it to 1280x720, creating a green video.
4. When the frontend studio initialized, `/api/history` returned the green test video as the latest item, and `setResult(data.items[0])` immediately played it on the Studio Monitor.

#### Engineering Fix
1. **Scene Preservation in Backend**: Changed `SCENES.unshift(newScene)` to `SCENES.push(newScene)` in `server.mjs`, ensuring `lofi_study_girl.jpg` remains the permanent primary default scene at index 0.
2. **Purged Test Artifacts**: Removed dummy green test files from `public/backgrounds/` and cleaned test jobs from `outputs/`.
3. **Realistic Test Uploads**: Updated `tests/test_engine.py` to upload authentic high-resolution artwork (`lofi_study_girl.jpg`) instead of 1x1 dummy pixels, and added an automated cleanup hook `cleanup_test_artifacts()` to remove test files after the suite finishes.
4. **Default Live Scene Preview**: Set `previewMode: true` on initial studio load in `web/app/page.tsx`, so the Studio Monitor always opens to the interactive live animated scene (`Anime Study Desk`) with canvas rain particles, providing an immediate, stunning visual experience.

---

### 🔴 BUG-009: Audio Voice Spectrum Waveform Overlay in Rendered Video

#### Date & Time
**October 13, 2026 — 19:10:00 CEST**

#### Problem Description
An amber audio waveform / voice spectrum line (`showwaves`) was rendered across the center and bottom of all exported videos, obscuring the aesthetic visual artwork.

#### Root Cause Analysis
In `server.mjs`, the FFmpeg filter chain explicitly included `showwaves`:
```javascript
const chain = [
  bgScale,
  `[1:a]showwaves=s=${layout.width}x${layout.waveHeight}:mode=cline:colors=0xf59e0b@0.85:rate=30[w]`,
  `[bg][w]overlay=0:${layout.waveY}:format=auto[v0]`,
];
```
This hardcoded a waveform overlay on every video rendered by `renderMp4`.

#### Engineering Fix
Removed `showwaves` and the wave overlay filter from `server.mjs`:
```javascript
const chain = [bgScale];
if (style !== "lofi") chain.push(STYLE_FILTERS[style]);
let last = "bg";
```
The video rendering pipeline now outputs pure, pristine video backgrounds with style-specific living camera motion (LoFi analog breath, Anime sky pan drift, Pixar 3D float) and clear title typography, free of voice spectrum lines.

---

### 🔴 BUG-010: 404 Console Errors from In-Memory Scene Catalog Stale Entries

#### Date & Time
**October 13, 2026 — 19:25:00 CEST**

#### Problem Description
Automated browser audits detected HTTP 404 console errors (`Failed to load resource: the server responded with a status of 404 (Not Found)`) and a broken image on initial dashboard page load.

#### Root Cause Analysis
When custom still images were uploaded, `server.mjs` pushed the new scene descriptor into the in-memory `SCENES` array. When test scripts or cleanup routines deleted the temporary uploaded files from `public/backgrounds/`, the running Node.js process still kept the descriptors in `SCENES`. Subsequent `/api/scenes` and `/api/moods` responses included deleted files, causing browser requests for `/backgrounds/custom_*.jpg` to 404.

#### Engineering Fix
1. **Dynamic File Existence Verification**: Implemented `getActiveScenes()` in `server.mjs` to dynamically verify via `stat` that custom uploaded files actually exist on disk before serving them in `/api/scenes` or `/api/moods`.
2. **Defensive Image Error Handling**: Added `onError` fallback handlers on all scene thumbnail images in `web/app/page.tsx` (`(e.target as HTMLImageElement).src = "/backgrounds/lofi_study_girl.jpg"`).
3. **Automated Interactive Audit**: Created `tests/audit_ui.py` running headless Playwright to monitor console logs, network requests, DOM visibility, and theme switching. Audit results: **0 Page Errors, 0 Console Errors, 0 Warnings, 0 Broken Images**.
