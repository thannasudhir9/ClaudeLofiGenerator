# 🎧 Claude LoFi, Anime & Pixar Generator Studio

> **An AI-Powered Multimedia Production Studio for Procedural LoFi Beats, Makoto Shinkai Anime Landscapes, and Pixar 3D Animated Video Loops.**
>
> **Project Date & Time**: October 13, 2026 — 15:08:05 CEST (UTC+2)  
> **Author & Maintainer**: Sudhir Thanna (`thannasudhir9`)  
> **Status**: Production Ready & Fully Documented  

---

## 🌟 Overview

**Claude LoFi Generator** is a next-generation automated audio-visual generation studio. It synthesizes nostalgic, relaxing, and aesthetically stunning video loops combined with procedurally generated lo-fi chord progressions, warm analog basslines, and rich ambient soundscapes (rain, vinyl crackle, cafe murmur, tape flutter, wind chimes, binaural beats).

The system seamlessly combines a **Node.js FFmpeg Rendering & Audio Synthesis Engine** on port `3000` with a modern **Next.js 15 App Router Frontend** on port `3001` (with a zero-dependency HTML5 fallback UI directly served on port `3000`).

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                         CLAUDE LOFI STUDIO ARCHITECTURE                         │
└──────────────────────────────────────────────────────────────────────────────────┘
                                   │
                   ┌───────────────┴───────────────┐
                   ▼                               ▼
       [ Next.js 15 Web Studio ]       [ Legacy HTML5 UI Fallback ]
        (http://localhost:3001)           (http://localhost:3000)
                   │                               │
                   └───────────────┬───────────────┘
                                   ▼ Rewrites / Direct Calls
                      [ Engine Backend (server.mjs) ]
                          (http://localhost:3000)
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        ▼                          ▼                          ▼
 [ Audio DSP Engine ]     [ FFmpeg Video Pipeline ]    [ Media Catalog ]
   - generate.mjs           - Dynamic Filtergraphs       - 300 AI References
   - 9 Musical Moods        - 60fps Stock Video Loops    - 6 Stock Video Loops
   - Procedural WAV         - Subtitle Burner            - Custom URL / Uploads
        │                          │                          │
        └──────────────────────────┼──────────────────────────┘
                                   ▼
                       [ outputs/{job_id}/out.mp4 ]
                                   │
                                   ▼
                 [ Multi-Platform Social Publisher ]
                    (YouTube, Instagram, TikTok, X)
```

---

## 🚀 Key Features

### 1. 🎨 Multi-Style Aesthetics
- **Classic LoFi**: Muted pastel palettes, rainy study rooms, warm desk lamps, coffee mugs, and cozy sleeping pets.
- **Makoto Shinkai Anime**: Hyper-vibrant golden hour skies, cinematic twilight trains, cumulus clouds, high-contrast unsharp masking, and Ghibli watercolor gardens.
- **Pixar 3D Cozy Cinema**: Soft ambient occlusion, warm fireplace cabins, rooftop starlight, whimsical lighting bloom, and depth-of-field effects.

### 2. 🎹 Procedural Music & Soundscape Engine (`generate.mjs` & Web Audio API)
- **9 Specialized Moods**:
  - `Chilled Study` (C major / A minor pentatonic, warm electric piano chords)
  - `Rainy Tokyo` (D minor melancholic progression with vinyl crackle and thunder)
  - `Cyberpunk Drift` (F minor synthwave / neo-Tokyo bassline)
  - `Midnight Jazz` (ii-V-I jazz seventh chords with mellow Rhodes warmth)
  - `Sunset Haze` (G major nostalgic progression with gentle tape flutter)
  - `Coffee Shop` (Warm cafe ambience with acoustic rhythm)
  - `Sleepy Rain` (Deep relaxation, delta-frequency binaural drones)
  - `Ghibli Meadow` (Pentatonic harp-like arpeggios and birdsong)
  - `Pixar Wonder` (Lydian mode dreamy orchestral strings and chime swells)
- **Full Synthesizer DSP**: Multi-oscillator synthesis (sine, triangle, bandlimited pulse), ADSR envelopes, resonant lowpass filters, vinyl noise generator, and tape wow & flutter simulation.
- **Client-Side Live Ambient Studio**: 7 interactive real-time sound generators in `ambient-audio.ts` (Rain, Vinyl, Cafe Murmur, Wind Chimes, Binaural Beats, Tape Flutter, Sub Bass).

### 3. 🎬 Seamless Stock Video Loops & Custom Video Streaming
- **6 Pre-rendered 10-Second 60fps MP4 Loops** (`public/stock_videos/`):
  - `stock_lofi_rain_desk.mp4`: Rain streaming on window glass with study desk lamp.
  - `stock_lofi_cafe.mp4`: Steam curling from hot latte mug in a rainy Parisian cafe.
  - `stock_anime_sunset.mp4`: Shinkai twilight sky with moving clouds and shimmering stars.
  - `stock_anime_ghibli.mp4`: Ghibli country meadow with swaying grass and fireflies.
  - `stock_pixar_fireplace.mp4`: 3D stylized crackling fireplace with warm ember glow.
  - `stock_pixar_stars.mp4`: 3D rooftop telescope with swirling galaxy nebula.
- **FFmpeg Seamless Looping**: Uses `-stream_loop -1` to effortlessly extend any 10-second loop to any target duration (10s to 240s) without jarring cuts.
- **Direct Video Streaming & Upload**: Supports arbitrary external video loop URLs (e.g., Pexels, Pixabay, Runway/Sora) and local MP4/GIF file uploads.

### 4. 📚 300-Item Curated AI Reference Database (`public/reference_repo/`)
- **100 LoFi Scenes** (`lofi_001.png` - `lofi_100.png`)
- **100 Anime Scenes** (`anime_001.png` - `anime_100.png`)
- **100 Pixar Scenes** (`pixar_001.png` - `pixar_100.png`)
- Fully indexed JSON catalog with tags, descriptions, prompt ideas, and style attributes.
- Interactive modal browser in Next.js with style tabs, search filter, and instant "Use as Background" action.

### 5. 📤 Multi-Platform Social Media Auto-Publisher (`publish.mjs`)
- Automatic video upload integration for:
  - **YouTube Studio API** (Video title, tags, description, privacy status)
  - **Instagram Graph API** (Reels container upload & publishing)
  - **TikTok & Twitter/X** (Webhook integration points)

---

## 📂 Project Structure

```
ClaudeLoFiGenerator/
├── .gitignore                      # Git exclusion rules (node_modules, .next, temp outputs)
├── package.json                    # Root project scripts and metadata
├── server.mjs                      # Core Node.js HTTP server, FFmpeg runner & API routes
├── generate.mjs                    # Procedural audio generator & DSP synthesis algorithm
├── publish.mjs                     # Social media publishing integrations
├── outputs/                        # Rendered MP4 videos & WAV audio outputs
│   └── .gitkeep
├── public/                         # Public assets & static server root
│   ├── index.html                  # Zero-dependency HTML5 studio interface
│   ├── backgrounds/                # High-res base backdrop images
│   ├── stock_videos/               # 6 60fps seamless MP4 video loops & catalog.json
│   │   ├── catalog.json
│   │   ├── stock_lofi_rain_desk.mp4
│   │   ├── stock_lofi_cafe.mp4
│   │   ├── stock_anime_sunset.mp4
│   │   ├── stock_anime_ghibli.mp4
│   │   ├── stock_pixar_fireplace.mp4
│   │   └── stock_pixar_stars.mp4
│   └── reference_repo/             # 300 Curated AI artwork reference library
│       ├── catalog.json
│       ├── lofi/                   # 100 LoFi scenes (lofi_001.png .. lofi_100.png)
│       ├── anime/                  # 100 Anime scenes (anime_001.png .. anime_100.png)
│       └── pixar/                  # 100 Pixar scenes (pixar_001.png .. pixar_100.png)
├── web/                            # Next.js 15 App Router Frontend
│   ├── app/
│   │   ├── page.tsx                # Main Studio UI component (Studio Monitor, Modals, Forms)
│   │   ├── ambient-audio.ts        # Web Audio API real-time procedural sound generator
│   │   ├── layout.tsx              # Root HTML & metadata layout
│   │   └── globals.css             # Tailwind CSS tokens & custom styling
│   ├── next.config.ts              # Reverse proxy rewrites to Backend Engine (3000)
│   ├── package.json                # Frontend dependencies (React 19, Lucide, Tailwind)
│   └── tsconfig.json
└── docs/                           # Comprehensive Project Documentation
    ├── ARCHITECTURE.md             # Deep dive into system architecture & pipeline
    ├── CODE_EXPLANATION.md         # Line-by-line file & function breakdowns
    ├── BUGS_AND_FIXES.md           # Bug records, root causes, and resolutions
    ├── SESSION_HISTORY.md          # Chronological log of user requests & milestones
    ├── REFERENCE_REPO.md           # Reference database documentation & catalog schema
    ├── STOCK_VIDEOS.md             # Stock video loops & AI video generation pipeline
    └── brain_archive/              # Preserved session state, scratchpads, and AI media
```

---

## 🛠️ Quick Start Guide

### Prerequisites
1. **Node.js** (v18.0.0 or higher recommended)
2. **FFmpeg** installed and accessible in your system `PATH` (e.g. `ffmpeg -version`)
3. **Python 3** (optional, for custom ML pipeline extensions)

### Installation & Launch

1. **Install Frontend Dependencies:**
   ```bash
   cd web
   npm install
   cd ..
   ```

2. **Start the Backend Engine (Port 3000):**
   ```bash
   npm run dev:engine
   # or: node server.mjs
   ```
   *The backend will boot up at `http://localhost:3000`.*

3. **Start the Next.js Frontend Studio (Port 3001):**
   ```bash
   npm run dev:web
   # or: cd web && npm run dev -- -p 3001
   ```
   *The frontend studio will be available at `http://localhost:3001`.*

4. **Access the Applications:**
   - **Next.js 15 Full Studio**: [http://localhost:3001](http://localhost:3001)
   - **Standalone Fallback UI**: [http://localhost:3000](http://localhost:3000)

---

## 📡 REST API Reference

The backend engine (`server.mjs`) provides the following endpoints:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/scenes` | List built-in scenes, background presets, and style descriptors |
| `GET` | `/api/moods` | List all 9 musical moods, BPM tempos, and scale keys |
| `GET` | `/api/references` | Retrieve the 300-image reference library catalog (`lofi`, `anime`, `pixar`) |
| `GET` | `/api/stock-videos` | Retrieve catalog of seamless 60fps MP4 video loops |
| `POST` | `/api/generate` | Dispatch an asynchronous audio/video generation job |
| `GET` | `/api/jobs/:id` | Poll status, progress percentage, logs, and download links for a job |
| `POST` | `/api/upload` | Upload a custom background image or animated GIF (up to 20MB) |
| `POST` | `/api/publish` | Publish completed video to YouTube, Instagram, TikTok, or X |

### Example Generation Request (`POST /api/generate`)
```json
{
  "title": "Midnight Rain & Coding",
  "subtitle": "LoFi Study Beats",
  "mood": "rainy_tokyo",
  "style": "lofi",
  "durationSeconds": 30,
  "scene": "stock_videos/stock_lofi_rain_desk.mp4",
  "enableRain": true,
  "enableVinyl": true,
  "enableSubtitles": true,
  "enableProgressBar": true
}
```

### Example Polling Response (`GET /api/jobs/{id}`)
```json
{
  "id": "aca82b02",
  "status": "completed",
  "progress": 100,
  "step": "Rendering completed successfully",
  "videoUrl": "/outputs/aca82b02/out.mp4",
  "audioUrl": "/outputs/aca82b02/audio.wav",
  "duration": 30
}
```

---

## 🧠 Brain Archive Integration

All development records, transcripts, prompt investigations, temporary media files, and AI-generated image artifacts from the active engineering session have been duplicated and preserved in:
👉 [`docs/brain_archive/`](file:///c:/Users/thann/Downloads/AntiGravity/ClaudeLoFiGenerator/docs/brain_archive/)

This ensures zero data loss across AI agent compaction cycles and provides a complete audit trail of architectural decisions and generated artwork.

---

## 📜 Documentation Index

For exhaustive technical guides, refer to the documentation suite in `docs/`:
- [**System Architecture & Design**](file:///c:/Users/thann/Downloads/AntiGravity/ClaudeLoFiGenerator/docs/ARCHITECTURE.md)
- [**Code Explanation & Function Breakdown**](file:///c:/Users/thann/Downloads/AntiGravity/ClaudeLoFiGenerator/docs/CODE_EXPLANATION.md)
- [**Bugs, Gotchas & Technical Fixes**](file:///c:/Users/thann/Downloads/AntiGravity/ClaudeLoFiGenerator/docs/BUGS_AND_FIXES.md)
- [**Full Session History & Prompt Log**](file:///c:/Users/thann/Downloads/AntiGravity/ClaudeLoFiGenerator/docs/SESSION_HISTORY.md)
- [**Reference Repository (300 AI Assets)**](file:///c:/Users/thann/Downloads/AntiGravity/ClaudeLoFiGenerator/docs/REFERENCE_REPO.md)
- [**Stock Videos & AI Video Loop Pipeline**](file:///c:/Users/thann/Downloads/AntiGravity/ClaudeLoFiGenerator/docs/STOCK_VIDEOS.md)

---

## 📄 License
This project is open-source under the MIT License. Built with ❤️ by Sudhir Thanna.
