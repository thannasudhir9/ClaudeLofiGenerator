# 💻 Code Explanation & Module-by-Module Technical Reference

> **Document Version**: 2.0.0  
> **Date & Time**: October 13, 2026 — 15:08:05 CEST (UTC+2)  
> **Project**: Claude LoFi, Anime & Pixar Multimedia Production Studio  
> **Author**: Sudhir Thanna (`thannasudhir9`)  

---

## 1. Introduction

This document provides a comprehensive, function-by-function, and algorithm-by-algorithm walkthrough of the entire Claude LoFi Generator codebase. Every critical script, module, and component is analyzed in terms of its parameters, data flow, error handling, and design choices.

---

## 2. Backend Orchestration Server (`server.mjs`)

`server.mjs` is the core HTTP engine and video compositor. It is written in pure ECMAScript Modules (`.mjs`) without heavy runtime frameworks, ensuring minimal overhead and zero dependency vulnerabilities.

### 2.1 Configuration & Constants
- `PORT` (Lines 19): Defaults to `3000` (or `process.env.PORT`).
- `FFMPEG` (Line 20): Path to the FFmpeg binary. Defaults to `ffmpeg` in system PATH.
- `FONT_SRC` (Line 22): Default font file for subtitle rendering (falls back to `C:/Windows/Fonts/arial.ttf` on Windows).
- `STYLE_FILTERS` (Lines 29-32): Custom FFmpeg filter chains for `anime` (noise reduction, boosted saturation, sharpening, RGB curves) and `pixar` (split-blur screen blend bloom effect).
- `SCENES` (Lines 34-42): Default scene presets with IDs, descriptions, and URLs.
- `STOCK_VIDEOS` & `STOCK_VIDEOS_CATALOG` (Lines 17-18): Points to `public/stock_videos/` and its `catalog.json`.

### 2.2 Helper Functions

#### `serveStaticFile(req, res, filePath)`
- Resolves the requested file on the filesystem.
- Determines MIME types (`.html`, `.js`, `.css`, `.mp4`, `.wav`, `.jpg`, `.png`, `.gif`, `.json`).
- Supports HTTP `Range` requests for streaming video playback (`206 Partial Content`), allowing smooth seeking in browser video players.
- Gracefully handles missing files with standard 404 responses.

#### `resolveScenePath(sceneId)`
- Resolves relative or absolute scene paths to physical files on disk:
  1. Checks if the ID begins with `stock_videos/` or `/stock_videos/` and resolves into `public/stock_videos/`.
  2. Checks if the ID begins with `reference_repo/` or `/reference_repo/` and resolves into `public/reference_repo/`.
  3. Checks `public/backgrounds/`.
  4. Checks if it is a pre-existing job output.
  5. Returns a structured object: `{ filePath, kind: "image" | "video" }`.

#### `downloadVideo(url, targetDir)`
- Validates external video URLs (e.g., Pexels, Pixabay, AI video outputs).
- Downloads the remote media stream with an enforced size limit of **50 MB** to prevent resource exhaustion attacks.
- Writes to `targetDir/input_stream.mp4` and returns `{ filePath, kind: "video" }`.

#### `escapeDrawText(text)`
- FFmpeg's `drawtext` filter requires strict escaping for special characters.
- Escapes backslashes (`\`), single quotes (`'`), colons (`:`), and semicolons (`;`) to prevent filter syntax injection and render crashes.

### 2.3 Video Rendering Engine (`renderMp4(job)`)
This function orchestrates the FFmpeg video generation pipeline:
1. **Background Assessment**: Determines if the input background is a static image or an animated video loop (`bg.kind === "video"`).
2. **Video Looping Command**:
   - If static image: Passes `-loop 1 -t {duration} -i bg.jpg`.
   - If video loop: Passes `-stream_loop -1 -i bg.mp4 -t {duration}`. FFmpeg seamlessly repeats the video frames without re-encoding until the exact audio duration is matched.
3. **Filtergraph Construction**:
   - Scales the input video/image to standard 1920x1080 resolution while preserving aspect ratio (`scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2`).
   - Applies the selected style filter (`anime` or `pixar`).
   - Adds subtitle text overlay at the bottom center if enabled.
   - Overlays the real-time dynamic animated progress bar (`drawbox` formula `w='iw*(t/{duration})'`).
4. **Encoding & Muxing**:
   - Audio is encoded as `aac` at 192 kbps.
   - Video is encoded as `libx264` with `pix_fmt yuv420p` (essential for universal HTML5 browser compatibility).
   - Flags `-movflags +faststart` place the MP4 index at the start of the file for instant progressive web playback.
5. **Child Process Execution**:
   - Spawns FFmpeg using Node's `spawn()`.
   - Captures stderr to track rendering frame rates and progress percentages.
   - On completion, updates the job record to `completed` and sets `progress = 100`.

### 2.4 HTTP Routes & Endpoints
- `GET /api/scenes`: Returns preset scenes and style descriptors.
- `GET /api/moods`: Returns all 9 musical mood profiles.
- `GET /api/references`: Serves the 300-item AI reference database from `public/reference_repo/catalog.json`.
- `GET /api/stock-videos`: Serves the 6 seamless 60fps MP4 loops catalog.
- `POST /api/generate`: Parses JSON payload (`title`, `mood`, `style`, `durationSeconds`, `scene`, `videoUrl`), provisions a new job ID, generates procedural WAV audio, and triggers `renderMp4`.
- `GET /api/jobs/:id`: Returns job status, percentage, logs, and media links.
- `POST /api/upload`: Handles multipart or raw binary uploads for custom background images and GIFs.
- `POST /api/publish`: Forwards rendered videos to social media publisher endpoints.

---

## 3. Procedural Audio Synthesis Engine (`generate.mjs`)

`generate.mjs` generates studio-grade 16-bit 44.1kHz stereo WAV audio using algorithmic DSP without any external audio files.

### 3.1 Mood & Harmony Architecture (`MOODS`)
Defines 9 distinct emotional profiles with chord frequencies:
```javascript
export const MOODS = {
  chilled_study: {
    name: "Chilled Study",
    bpm: 74,
    scale: "C Major / A Minor Pentatonic",
    chords: [
      [261.63, 329.63, 392.00, 493.88], // Cmaj7
      [220.00, 261.63, 329.63, 392.00], // Am7
      [174.61, 220.00, 261.63, 329.63], // Fmaj7
      [196.00, 246.94, 293.66, 349.23], // G7
    ]
  },
  rainy_tokyo: {
    name: "Rainy Tokyo",
    bpm: 68,
    scale: "D Minor Melancholic",
    chords: [
      [146.83, 174.61, 220.00, 261.63], // Dm7
      [116.54, 146.83, 174.61, 220.00], // Bbmaj7
      [130.81, 164.81, 196.00, 246.94], // C7
      [110.00, 130.81, 164.81, 196.00], // Am7
    ]
  },
  // Additional moods: cyberpunk_drift, midnight_jazz, sunset_haze, coffee_shop, sleepy_rain, ghibli_meadow, pixar_wonder
};
```

### 3.2 Audio Synthesis Pipeline

#### Tone Synthesis & Envelopes
- Combines fundamental sine waves with warm triangle and bandlimited pulse waveforms.
- Applies an ADSR envelope (Attack: 40ms, Decay: 120ms, Sustain: 0.70, Release: 150ms) to ensure smooth transitions without transient clipping.

#### Resonant Lowpass Filter (Analog Cassette Emulation)
- Implements a digital 2-pole Infinite Impulse Response (IIR) lowpass filter.
- Attenuates harsh frequencies above 3,200 Hz with a subtle resonance bump at 800 Hz to simulate warm analog cassette tape playback.

#### Vinyl Crackle & Ambient Noise Shaping
- Generates stochastic Poisson-distributed dust impulses mixed with soft pink noise.
- Provides that authentic vintage record player atmosphere.

#### Tape Wow & Flutter
- Modulates playback sample frequency using a slow (0.4 Hz) low-frequency oscillator (LFO), mimicking mechanical capstan and belt imperfections.

#### Binary RIFF / WAV Serialization (`writeWavHeader`)
- Constructs the 44-byte canonical RIFF/WAVE header directly into a Node.js `Buffer`.
- Encodes 2 channels (Stereo), 44,100 Hz sample rate, 16 bits per sample, and little-endian PCM sample data.

---

## 4. Frontend Application (`web/app/page.tsx`)

The modern studio frontend is built using Next.js 15 and React 19.

### 4.1 State Management & Architecture
- **Preset Selection**: Manages active `scene`, `mood`, `style`, and `durationSeconds`.
- **Live Studio Monitor**: Displays the currently active background (image or video loop) with a real-time responsive 60fps HTML5 Canvas audio spectrum visualizer.
- **Job Orchestration**: Handles form submission, generation state (`generating`), and polling loop (`pollJob`).
- **Interactive Modals**:
  - `showRefModal`: Browses the 300 AI reference artworks with style filter tabs and search keywords.
  - `showStockModal`: Browses the 6 seamless 60fps MP4 loops with autoplaying video previews.
  - `showPublishModal`: One-click distribution to YouTube, Instagram, TikTok, and X.

### 4.2 Web Audio API Live Ambient Sound Engine (`ambient-audio.ts`)
`ambient-audio.ts` contains the client-side `AmbientSoundEngine` class, providing zero-latency audio generation directly in the user's browser before server rendering:
- **Rain Simulator**: Generates White/Pink noise in an `AudioBufferSourceNode` passed through a `BiquadFilterNode` bandpass filter (center frequency 1,200 Hz).
- **Vinyl Crackle**: Randomly schedules discrete impulse bursts with subtle distortion.
- **Cafe Murmur**: Layered filtered brown noise modeling coffee shop acoustics.
- **Wind Chimes**: Metallic bell sine oscillators triggered with Poisson timing intervals.
- **Binaural Beats**: Dual oscillators with an 8Hz frequency offset (Left: 432Hz, Right: 440Hz) inducing relaxed alpha brainwaves.
- **Sub Bass**: 40Hz pure sine wave with subtle tube overdrive.
- **Tape Flutter**: Sine wave LFO modulating an audio delay line.

---

## 5. Next.js Reverse Proxy Configuration (`web/next.config.ts`)

To avoid CORS restrictions and allow the frontend on port `3001` to seamlessly communicate with the backend on port `3000`, `next.config.ts` defines reverse proxy rewrites:

```typescript
const nextConfig: NextConfig = {
  async rewrites() {
    const ENGINE_URL = process.env.ENGINE_URL || "http://localhost:3000";
    return [
      { source: "/api/:path*", destination: `${ENGINE_URL}/api/:path*` },
      { source: "/outputs/:path*", destination: `${ENGINE_URL}/outputs/:path*` },
      { source: "/backgrounds/:path*", destination: `${ENGINE_URL}/backgrounds/:path*` },
      { source: "/reference_repo/:path*", destination: `${ENGINE_URL}/reference_repo/:path*` },
      { source: "/stock_videos/:path*", destination: `${ENGINE_URL}/stock_videos/:path*` },
    ];
  },
};
```

This configuration ensures:
- All `/api/*` calls from the Next.js frontend route directly to the backend.
- Video downloads and previews from `/outputs/*` stream smoothly.
- Reference assets and stock video loops load cleanly without cross-origin issues.

---

## 6. Social Publishing Subsystem (`publish.mjs`)

`publish.mjs` provides production integrations for automated multi-platform distribution:

### 6.1 `publishToYouTube(videoPath, title, description, tags, privacy)`
- Authenticates using Google OAuth2 credentials or API keys.
- Initiates a resumable upload session with `https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable`.
- Sends the video binary stream in 5MB chunks.
- Returns the published video URL (`https://youtu.be/{videoId}`).

### 6.2 `publishToInstagram(videoUrl, caption)`
- Uses the Meta / Instagram Graph API for Instagram Reels.
- Calls `POST /{ig_user_id}/media` with `media_type=REELS` and `video_url`.
- Polls the media container status until `status_code === 'FINISHED'`.
- Calls `POST /{ig_user_id}/media_publish` to make the Reel live.

---

## 7. Standalone HTML5 Fallback UI (`public/index.html`)

For environments without Node/Next build tooling, `public/index.html` offers a complete zero-dependency single-page studio application directly served by `server.mjs` on port `3000`. It includes:
- Pure CSS glassmorphism theme and CSS Grid responsive layout.
- JavaScript client-side Web Audio API synthesizer.
- Dynamic dropdown selectors for scenes, moods, and the 300 reference items.
- Live progress polling bar and video player embed.
