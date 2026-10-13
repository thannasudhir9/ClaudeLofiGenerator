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
