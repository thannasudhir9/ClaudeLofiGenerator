import http from "node:http";
import https from "node:https";
import { createReadStream, existsSync } from "node:fs";
import { copyFile, mkdir, readFile, writeFile, stat, readdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MOODS, pickMood, renderWav } from "./generate.mjs";
import { publishToYouTube, publishToInstagram } from "./publish.mjs";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, "public");
const OUT = path.join(ROOT, "outputs");
const BGS = path.join(PUBLIC, "backgrounds");
const REF = path.join(PUBLIC, "reference_repo");
const CATALOG_PATH = path.join(REF, "catalog.json");
const STOCK_VIDEOS = path.join(PUBLIC, "stock_videos");
const STOCK_VIDEOS_CATALOG = path.join(STOCK_VIDEOS, "catalog.json");
const PORT = Number(process.env.PORT) || 3000;
const FFMPEG = process.env.FFMPEG || "ffmpeg";
const PYTHON = process.env.PYTHON || "python";

function getSystemFont() {
  if (process.env.FONT_FILE && existsSync(process.env.FONT_FILE)) return process.env.FONT_FILE;
  const candidates = [
    "C:/Windows/Fonts/Nirmala.ttc",
    "C:/Windows/Fonts/NirmalaB.ttc",
    "C:/Windows/Fonts/gautami.ttf",
    "C:/Windows/Fonts/arial.ttf",
  ];
  for (const c of candidates) {
    try {
      if (existsSync(c)) return c;
    } catch {}
  }
  return "C:/Windows/Fonts/arial.ttf";
}
const FONT_SRC = getSystemFont();
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "");
const MIN_SECONDS = 10;
const MAX_SECONDS = 240;
const MAX_GIF_BYTES = 20 * 1024 * 1024;
const JOB_ID = /^[a-f0-9]{8}$/;
const STYLE_NAMES = {
  lofi: "Lofi Chill",
  anime: "Anime & Ghibli",
  pixar: "Pixar 3D",
  devotional: "Devotional & Sacred",
  cyberpunk: "Cyberpunk & Synth",
  nature: "Biophilic Nature",
  simple_ai: "Simple AI & Minimal",
};
const STYLE_FILTERS = {
  anime: "[bg0]hqdn3d=3:2:5:4,eq=saturation=1.42:contrast=1.16:brightness=0.02,unsharp=7:7:1.3:5:5:0.5,curves=r='0/0 0.5/0.52 1/1':b='0/0 0.5/0.54 1/1'[bg]",
  pixar: "[bg0]split=2[orig][bloom];[bloom]eq=brightness=0.06:contrast=1.28:saturation=1.45,gblur=sigma=20:steps=2[bloom];[orig][bloom]blend=all_mode=screen:all_opacity=0.45[blended];[blended]colorbalance=rs=0.05:gs=0.02:bs=-0.03,unsharp=5:5:0.7:3:3:0.3[bg]",
  devotional: "[bg0]split=2[orig][glow];[glow]eq=brightness=0.07:contrast=1.22:saturation=1.35,gblur=sigma=22:steps=2[glow];[orig][glow]blend=all_mode=screen:all_opacity=0.45[blended];[blended]colorbalance=rs=0.10:gs=0.04:bs=-0.08,unsharp=5:5:0.8:3:3:0.3[bg]",
  cyberpunk: "[bg0]eq=contrast=1.26:saturation=1.52:brightness=-0.02,colorbalance=rs=0.09:gs=-0.04:bs=0.14,unsharp=7:7:1.2:5:5:0.4[bg]",
  nature: "[bg0]eq=contrast=1.14:saturation=1.36:brightness=0.02,colorbalance=rs=-0.02:gs=0.07:bs=0.02,unsharp=5:5:0.9:3:3:0.4[bg]",
  simple_ai: "[bg0]eq=contrast=1.12:saturation=1.06:brightness=0.01,unsharp=5:5:0.8:3:3:0.3[bg]",
};

export const CATEGORIES_DATA = {
  devotional: {
    id: "devotional",
    name: "Devotional & Sacred",
    icon: "🕉️",
    badge: "Sacred 432Hz",
    description: "432Hz Raag Bhupali bansuri flute, meditative tanpura drone, temple bells & golden aura bloom.",
    defaultMood: "devotional_temple",
    subcategories: [
      { id: "krishna_radha", name: "Krishna & Radha Beach Twilight", scene: "krishna_radha_beach.jpg", prompt: "Krishna and Radha sitting near the beach ocean shore listening to pleasant bansuri music, golden twilight", mood: "devotional_temple" },
      { id: "vedic_temple", name: "Vedic Temple & Ghats", scene: "devotional_vedic_ghats.jpg", prompt: "Ancient sacred Vedic temple steps along holy river at golden sunrise with floating lotus diyas", mood: "devotional_temple" },
      { id: "himalayan_shrine", name: "Himalayan Peak Meditation", scene: "devotional_himalayan_temple.jpg", prompt: "Sacred Himalayan temple shrine overlooking misty snow peaks under golden sunrise rays", mood: "devotional_temple" },
      { id: "sufi_mystic", name: "Sufi Mystic Golden Glow", scene: "devotional_himalayan_temple.jpg", prompt: "Mystical devotional sanctum with swirling golden dust particles, warm lanterns and divine peace", mood: "devotional_temple" },
      { id: "sacred_bells", name: "Sacred Chants & Temple Bells", scene: "krishna_radha_beach.jpg", prompt: "Ancient temple courtyard with sacred brass bells, fragrant flower garlands and spiritual twilight resonance", mood: "devotional_temple" },
    ],
  },
  anime: {
    id: "anime",
    name: "Anime & Ghibli",
    icon: "🌸",
    badge: "Cinematic Cel",
    description: "Makoto Shinkai sky colors, hand-painted Ghibli cel warmth, vibrant curves & sakura flutter.",
    defaultMood: "shinkai_anime",
    subcategories: [
      { id: "shinkai_sky", name: "Makoto Shinkai Twilight Skies", scene: "anime_shinkai_sunset.jpg", prompt: "Makoto Shinkai anime twilight train window with radiant sunset clouds and distant Tokyo tower", mood: "shinkai_anime" },
      { id: "ghibli_garden", name: "Studio Ghibli Cottage Garden", scene: "anime_ghibli_garden.jpg", prompt: "Studio Ghibli country cottage porch overlooking sunlit summer garden with butterflies and wildflowers", mood: "ghibli_garden" },
      { id: "city_pop_retro", name: "Retro 90s City Pop", scene: "anime_retro_city_pop.jpg", prompt: "Retro 1990s Japanese anime aesthetic, pastel sunset over suburban Tokyo with cassette player on balcony", mood: "shinkai_anime" },
      { id: "cyber_mecha", name: "Mecha Twilight Horizon", scene: "anime_shinkai_sunset.jpg", prompt: "Futuristic anime coastal bay at twilight with giant mecha silhouette against pastel sky", mood: "shinkai_anime" },
    ],
  },
  lofi: {
    id: "lofi",
    name: "LoFi Chill & Study",
    icon: "☕",
    badge: "Analog Tape",
    description: "Analog tape saturation, vinyl crackle, gentle Rhodes chords, boom-bap rhythm & rainy window vibe.",
    defaultMood: "night",
    subcategories: [
      { id: "study_desk", name: "Classic LoFi Study Desk", scene: "lofi_study_girl.jpg", prompt: "Rainy night study session with warm amber lamp light, sleeping cat and headphones", mood: "night" },
      { id: "rainy_cafe", name: "Cozy Rainy Tokyo Cafe", scene: "lofi_rainy_cafe.jpg", prompt: "Cozy bookstore cafe with warm espresso, bookshelf rows and soft rain tapping against glass", mood: "lofi_cafe" },
      { id: "sunset_balcony", name: "Sunset Balcony & Vinyl", scene: "lofi_sunset_balcony.jpg", prompt: "Golden hour sunset balcony with vintage vinyl turntable and skyline silhouette", mood: "warm" },
      { id: "midnight_bedroom", name: "Midnight Starlight Bedroom", scene: "lofi_starlight_bedroom.jpg", prompt: "Celestial starry bedroom with glowing moon lamp, cozy blankets and distant city lights", mood: "dreamy" },
    ],
  },
  pixar: {
    id: "pixar",
    name: "Pixar 3D Cinematic",
    icon: "🧸",
    badge: "3D Storybook",
    description: "3D animated volumetric screen bloom, subsurface scattering warmth, soft music box & deep storytelling.",
    defaultMood: "pixar_cozy",
    subcategories: [
      { id: "cozy_cabin", name: "Fireplace Hearth Cabin", scene: "pixar_cozy_cabin.jpg", prompt: "Pixar 3D animated cozy winter cabin with hot cocoa, crackling fireplace and sleeping puppy", mood: "pixar_cozy" },
      { id: "rooftop_stars", name: "Rooftop Stargazing", scene: "pixar_rooftop_stars.jpg", prompt: "Pixar 3D animated rooftop with vintage brass telescope, cozy knit scarf and starlit city sky", mood: "dreamy" },
      { id: "miniature_world", name: "Whimsical Toy Kingdom", scene: "pixar_cozy_cabin.jpg", prompt: "Pixar 3D miniature artisan toy workshop filled with clocks, wooden carousel and magical dust", mood: "pixar_cozy" },
      { id: "cloud_city", name: "Floating Sky Islands", scene: "pixar_rooftop_stars.jpg", prompt: "Pixar 3D whimsical floating islands in cotton-candy clouds with cute flying propeller craft", mood: "dreamy" },
    ],
  },
  cyberpunk: {
    id: "cyberpunk",
    name: "Cyberpunk & Synthwave",
    icon: "⚡",
    badge: "Neon Synth",
    description: "16th-note analog saw bassline, neon cyan/magenta split toning, scanline noise & high-energy glide.",
    defaultMood: "cyber_synthwave",
    subcategories: [
      { id: "neon_rain", name: "Night City Neon Rain", scene: "cyberpunk_neon_rain.jpg", prompt: "Futuristic neon cyberpunk alley with ramen stall, glowing holographic signs and heavy rain reflections", mood: "cyber_synthwave" },
      { id: "synthwave_grid", name: "Outrun 80s Grid Sunset", scene: "lofi_tokyo_cyberpunk.jpg", prompt: "Outrun synthwave digital wireframe grid with neon magenta sun and chrome sports car", mood: "cyber_synthwave" },
      { id: "bladerunner_skyline", name: "Blade Runner Megacity", scene: "cyberpunk_neon_rain.jpg", prompt: "Dystopian cyberpunk megacity skyline with flying spinners, giant holographic advertisements and mist", mood: "cyber_synthwave" },
      { id: "cyber_arcade", name: "Holographic Cyber Arcade", scene: "lofi_tokyo_cyberpunk.jpg", prompt: "Retro-futuristic arcade hall bathed in neon purple CRT light with retro gaming machines", mood: "cyber_synthwave" },
    ],
  },
  nature: {
    id: "nature",
    name: "Biophilic Nature",
    icon: "🌿",
    badge: "Organic 528Hz",
    description: "Flowing woodland stream pink noise, emerald color grade, gentle swaying camera breath & sunbeam warmth.",
    defaultMood: "nature_sanctuary",
    subcategories: [
      { id: "biophilic_waterfall", name: "Cascading Sanctuary Waterfall", scene: "nature_biophilic_waterfall.jpg", prompt: "Biophilic glasshouse sanctuary with cascading waterfall, lush tropical ferns and sunbeams", mood: "nature_sanctuary" },
      { id: "bioluminescent_grove", name: "Bioluminescent Forest Grove", scene: "nature_bioluminescent_forest.jpg", prompt: "Mystical midnight forest with glowing bioluminescent turquoise stream and magical fireflies", mood: "nature_sanctuary" },
      { id: "misty_pines", name: "Misty Nordic Pines", scene: "nature_biophilic_waterfall.jpg", prompt: "Deep Scandinavian pine forest shrouded in morning mist with sun rays cutting through tall trees", mood: "nature_sanctuary" },
      { id: "zen_bamboo", name: "Zen Bamboo Stream", scene: "nature_bioluminescent_forest.jpg", prompt: "Traditional Japanese zen garden with trickling bamboo water fountain, mossy stones and raked sand", mood: "nature_sanctuary" },
    ],
  },
  simple_ai: {
    id: "simple_ai",
    name: "Simple AI & Minimalist",
    icon: "📐",
    badge: "Clean Modernist",
    description: "Steady Ken Burns pan, modernist architectural balance, crystalline downbeat chimes & pure sine calm.",
    defaultMood: "simple_minimal",
    subcategories: [
      { id: "minimalist_lounge", name: "Nordic Architectural Lounge", scene: "simple_ai_minimal_lounge.jpg", prompt: "Minimalist modern architecture lounge overlooking misty forest with clean lines and warm wood", mood: "simple_minimal" },
      { id: "kinetic_geometry", name: "Kinetic Geometric Flow", scene: "simple_ai_geometric_flow.jpg", prompt: "Minimalist abstract 3D geometric ribbons and floating spheres in warm studio lighting", mood: "simple_minimal" },
      { id: "ambient_gradient", name: "Ambient Pastel Gradient", scene: "simple_ai_geometric_flow.jpg", prompt: "Ultra-clean modern pastel color field horizon slowly shifting in peaceful atmospheric gradient", mood: "simple_minimal" },
      { id: "glass_morphism", name: "Abstract Glass Morphism", scene: "simple_ai_minimal_lounge.jpg", prompt: "Frosted glass geometric monoliths refracting soft studio sunlight in pure architectural minimalism", mood: "simple_minimal" },
    ],
  },
};

const SCENES = [
  { id: "lofi_study_girl.jpg", label: "Anime Study Desk", tag: "Classic Lofi Girl with headphones, rain & cat", style: "lofi", category: "lofi", subcategory: "study_desk", url: "/backgrounds/lofi_study_girl.jpg" },
  { id: "anime_shinkai_sunset.jpg", label: "Shinkai Twilight Train", tag: "Makoto Shinkai vibrant clouds & Tokyo sunset", style: "anime", category: "anime", subcategory: "shinkai_sky", url: "/backgrounds/anime_shinkai_sunset.jpg" },
  { id: "pixar_cozy_cabin.jpg", label: "Pixar Fireplace Cabin", tag: "3D animated cabin, hot cocoa & sleeping puppy", style: "pixar", category: "pixar", subcategory: "cozy_cabin", url: "/backgrounds/pixar_cozy_cabin.jpg" },
  { id: "anime_ghibli_garden.jpg", label: "Ghibli Summer Porch", tag: "Hand-painted cottage garden, iced tea & butterflies", style: "anime", category: "anime", subcategory: "ghibli_garden", url: "/backgrounds/anime_ghibli_garden.jpg" },
  { id: "anime_retro_city_pop.jpg", label: "Retro City Pop Sunset", tag: "1990s anime suburban Tokyo sunset with vintage cassette player", style: "anime", category: "anime", subcategory: "city_pop_retro", url: "/backgrounds/anime_retro_city_pop.jpg" },
  { id: "pixar_rooftop_stars.jpg", label: "Pixar Rooftop Stargazing", tag: "3D animated telescope, cozy scarf & starry night", style: "pixar", category: "pixar", subcategory: "rooftop_stars", url: "/backgrounds/pixar_rooftop_stars.jpg" },
  { id: "lofi_rainy_cafe.jpg", label: "Cozy Rainy Cafe", tag: "Warm coffee cup with steam & Tokyo rain", style: "lofi", category: "lofi", subcategory: "rainy_cafe", url: "/backgrounds/lofi_rainy_cafe.jpg" },
  { id: "lofi_tokyo_cyberpunk.jpg", label: "Tokyo Neon Alley", tag: "Rainy street, neon ramen bar & retro car", style: "cyberpunk", category: "cyberpunk", subcategory: "synthwave_grid", url: "/backgrounds/lofi_tokyo_cyberpunk.jpg" },
  { id: "cyberpunk_neon_rain.jpg", label: "Night City Cyberpunk Rain", tag: "Futuristic neon alley with ramen bar and rain reflections", style: "cyberpunk", category: "cyberpunk", subcategory: "neon_rain", url: "/backgrounds/cyberpunk_neon_rain.jpg" },
  { id: "lofi_sunset_balcony.jpg", label: "Sunset Balcony", tag: "Golden hour sunset & vinyl record player", style: "lofi", category: "lofi", subcategory: "sunset_balcony", url: "/backgrounds/lofi_sunset_balcony.jpg" },
  { id: "lofi_starlight_bedroom.jpg", label: "Starlight Galaxy", tag: "Celestial night sky, moon lamp & cozy bed", style: "lofi", category: "lofi", subcategory: "midnight_bedroom", url: "/backgrounds/lofi_starlight_bedroom.jpg" },
  { id: "lofi_slow_morning.jpg", label: "Sunny Morning Room", tag: "Warm morning sunlight & acoustic guitar", style: "lofi", category: "lofi", subcategory: "study_desk", url: "/backgrounds/lofi_slow_morning.jpg" },
  { id: "krishna_radha_beach.jpg", label: "Krishna & Radha Beach Twilight", tag: "Celestial flute melody by ocean shore with lotus blooms", style: "devotional", category: "devotional", subcategory: "krishna_radha", url: "/backgrounds/krishna_radha_beach.jpg" },
  { id: "devotional_himalayan_temple.jpg", label: "Himalayan Sacred Temple", tag: "Golden sunrise over sacred peaks with river lotus diyas", style: "devotional", category: "devotional", subcategory: "himalayan_shrine", url: "/backgrounds/devotional_himalayan_temple.jpg" },
  { id: "devotional_vedic_ghats.jpg", label: "Vedic Sacred Ghats Dawn", tag: "Sacred Ganges river steps at dawn with floating diyas and holy bells", style: "devotional", category: "devotional", subcategory: "vedic_temple", url: "/backgrounds/devotional_vedic_ghats.jpg" },
  { id: "nature_biophilic_waterfall.jpg", label: "Biophilic Forest Waterfall", tag: "Cascading waterfall sanctuary with sunbeams and lush ferns", style: "nature", category: "nature", subcategory: "biophilic_waterfall", url: "/backgrounds/nature_biophilic_waterfall.jpg" },
  { id: "nature_bioluminescent_forest.jpg", label: "Bioluminescent Forest Grove", tag: "Mystical night grove with glowing turquoise stream and fireflies", style: "nature", category: "nature", subcategory: "bioluminescent_grove", url: "/backgrounds/nature_bioluminescent_forest.jpg" },
  { id: "simple_ai_minimal_lounge.jpg", label: "Simple AI Zen Architecture", tag: "Clean minimalist modernist lounge overlooking misty pines", style: "simple_ai", category: "simple_ai", subcategory: "minimalist_lounge", url: "/backgrounds/simple_ai_minimal_lounge.jpg" },
  { id: "simple_ai_geometric_flow.jpg", label: "Simple AI Geometric Sculptures", tag: "Abstract 3D modernist ribbons and floating spheres in soft lighting", style: "simple_ai", category: "simple_ai", subcategory: "kinetic_geometry", url: "/backgrounds/simple_ai_geometric_flow.jpg" },
];

function parseStyle(v) {
  const s = typeof v === "string" && v ? v.toLowerCase() : "lofi";
  if (!Object.hasOwn(STYLE_NAMES, s)) return "lofi";
  return s;
}

function parseAspectRatio(v) {
  return ["16:9", "9:16", "1:1"].includes(v) ? v : "16:9";
}

function parseResolution(v) {
  const r = typeof v === "string" ? v.toLowerCase().trim() : "1080p";
  if (["4k", "2160p", "uhd"].includes(r)) return "4k";
  if (["2k", "1440p", "qhd"].includes(r)) return "2k";
  if (["1080p", "fhd", "fullhd"].includes(r)) return "1080p";
  if (["720p", "hd"].includes(r)) return "720p";
  return "1080p";
}

function getLayoutConfig(aspectRatio = "16:9", resolution = "1080p") {
  const res = parseResolution(resolution);
  
  // Base 1080p reference parameters
  let width = 1920;
  let height = 1080;
  let waveHeight = 220;
  let waveY = 820;
  let titleY = "260";
  let titleSize = 72;
  let subY = "370";
  let subSize = 38;
  let wmY = "h-text_h-36";
  let wmX = "w-text_w-36";
  let wmSize = 34;

  if (aspectRatio === "9:16") {
    width = 1080;
    height = 1920;
    waveHeight = 260;
    waveY = 1520;
    titleY = "560";
    titleSize = 64;
    subY = "660";
    subSize = 36;
    wmY = "h-text_h-45";
    wmX = "w-text_w-45";
    wmSize = 32;
  } else if (aspectRatio === "1:1") {
    width = 1080;
    height = 1080;
    waveHeight = 190;
    waveY = 820;
    titleY = "280";
    titleSize = 56;
    subY = "370";
    subSize = 32;
    wmY = "h-text_h-30";
    wmX = "w-text_w-30";
    wmSize = 30;
  }

  // Multipliers by chosen resolution
  let scale = 1.0;
  let crf = "22";
  let videoBitrate = "8M";
  let maxRate = "12M";

  if (res === "720p") {
    scale = 720 / 1080; // 0.6667 -> 1280x720
    crf = "23";
    videoBitrate = "4M";
    maxRate = "6M";
  } else if (res === "1080p") {
    scale = 1.0; // 1920x1080
    crf = "22";
    videoBitrate = "8M";
    maxRate = "12M";
  } else if (res === "2k") {
    scale = 1440 / 1080; // 1.3333 -> 2560x1440
    crf = "21";
    videoBitrate = "14M";
    maxRate = "20M";
  } else if (res === "4k") {
    scale = 2160 / 1080; // 2.0 -> 3840x2160
    crf = "20";
    videoBitrate = "24M";
    maxRate = "32M";
  }

  const finalWidth = Math.round(width * scale);
  const finalHeight = Math.round(height * scale);

  return {
    resolution: res,
    scale,
    width: finalWidth,
    height: finalHeight,
    waveHeight: Math.round(waveHeight * scale),
    waveY: Math.round(waveY * scale),
    titleY: typeof titleY === "string" && !isNaN(Number(titleY)) ? String(Math.round(Number(titleY) * scale)) : titleY,
    titleSize: Math.round(titleSize * scale),
    subY: typeof subY === "string" && !isNaN(Number(subY)) ? String(Math.round(Number(subY) * scale)) : subY,
    subSize: Math.round(subSize * scale),
    wmY,
    wmX,
    wmSize: Math.round(wmSize * scale),
    crf,
    videoBitrate,
    maxRate,
  };
}

function runProcess(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { cwd, windowsHide: true });
    let stderr = "";
    proc.stderr.on("data", (d) => (stderr += d));
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve(stderr);
      else reject(new Error(`${path.basename(cmd)} exited ${code}: ${stderr.slice(-800)}`));
    });
  });
}

function parseYoutubeUrl(raw) {
  let u;
  try {
    u = new URL(raw);
  } catch {
    throw new Error("Invalid YouTube URL");
  }
  const host = u.hostname.replace(/^www\./, "");
  if (!["youtube.com", "m.youtube.com", "youtu.be"].includes(host)) {
    throw new Error("URL must be a youtube.com or youtu.be link");
  }
  return u.toString();
}

async function downloadYoutubeAudio(url, seconds, jobDir) {
  await runProcess(
    PYTHON,
    [
      "-m", "yt_dlp",
      "-x", "--audio-format", "wav",
      "--no-playlist",
      "--download-sections", `*0-${seconds}`,
      "--force-keyframes-at-cuts",
      "-o", "audio.%(ext)s",
      url,
    ],
    jobDir,
  );
}

async function downloadGif(url, jobDir) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid GIF URL");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("GIF URL must be http(s)");
  const res = await fetch(parsed);
  if (!res.ok) throw new Error(`GIF download failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_GIF_BYTES) throw new Error("GIF is larger than 20 MB");
  await writeFile(path.join(jobDir, "bg.gif"), buf);
}

async function downloadVideo(url, jobDir) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid video URL");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Video URL must be http(s)");
  const res = await fetch(parsed);
  if (!res.ok) throw new Error(`Video download failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > 50 * 1024 * 1024) throw new Error("Video is larger than 50 MB");
  await writeFile(path.join(jobDir, "bg.mp4"), buf);
}

async function renderMp4(jobDir, {
  seconds,
  bg,
  title,
  sub,
  watermark,
  timed = [],
  lyrics = [],
  lyricsStyle = {},
  style = "lofi",
  aspectRatio = "16:9",
  resolution = "1080p",
  strictPromptAdherence = false,
  cameraMotion = "subtle_breath",
}) {
  await copyFile(FONT_SRC, path.join(jobDir, "font.ttf"));
  const layout = getLayoutConfig(aspectRatio, resolution);

  let inputs;
  let bgScale;
  const hasStyleFilter = Object.hasOwn(STYLE_FILTERS, style);
  const bgLabel = hasStyleFilter ? "bg0" : "bg";

  if (bg.kind === "video") {
    let vidName = "bg.mp4";
    if (bg.localFile) {
      const ext = path.extname(bg.localFile).toLowerCase() || ".mp4";
      vidName = `bg${ext}`;
      await copyFile(bg.localFile, path.join(jobDir, vidName)).catch(() => {});
    }
    inputs = ["-stream_loop", "-1", "-i", vidName];
    bgScale = `[0:v]scale=${layout.width}:${layout.height}:force_original_aspect_ratio=increase,crop=${layout.width}:${layout.height},setsar=1,fps=30[${bgLabel}]`;
  } else if (bg.kind === "gif") {
    if (bg.localFile) {
      await copyFile(bg.localFile, path.join(jobDir, "bg.gif")).catch(() => {});
    }
    inputs = ["-stream_loop", "-1", "-i", "bg.gif"];
    bgScale = `[0:v]scale=${layout.width}:${layout.height}:force_original_aspect_ratio=increase,crop=${layout.width}:${layout.height},setsar=1,fps=30[${bgLabel}]`;
  } else if (bg.kind === "image") {
    let imgName = "bg.jpg";
    if (bg.localFile) {
      const ext = path.extname(bg.localFile).toLowerCase() || ".jpg";
      imgName = `bg${ext}`;
      await copyFile(bg.localFile, path.join(jobDir, imgName)).catch(() => {});
    }
    inputs = ["-loop", "1", "-i", imgName];

    // Camera Motion & Strict Prompt Fidelity Control
    if (cameraMotion === "zero_drift") {
      // Completely locked stationary framing with zero zoompan
      bgScale = `[0:v]scale=${layout.width}:${layout.height}:force_original_aspect_ratio=increase,crop=${layout.width}:${layout.height},setsar=1,fps=30[${bgLabel}]`;
    } else if (cameraMotion === "gaze_locked" || strictPromptAdherence) {
      // Strict Character Gaze & Pose Lock: Micro 0.25% center breath only, zero lateral or vertical drift
      bgScale = `[0:v]scale=${layout.width}:${layout.height}:force_original_aspect_ratio=increase,crop=${layout.width}:${layout.height},zoompan=z='1.002+0.003*sin(in/140)':x='(iw-iw/zoom)*0.5':y='(ih-ih/zoom)*0.5':d=1:s=${layout.width}x${layout.height}:fps=30[${bgLabel}]`;
    } else if (style === "anime") {
      // Makoto Shinkai sky & cloud pan drift across the horizon + cel sharpness
      bgScale = `[0:v]scale=${layout.width}:${layout.height}:force_original_aspect_ratio=increase,crop=${layout.width}:${layout.height},zoompan=z='min(zoom+0.0004,1.08)':x='(iw-iw/zoom)*(0.5+0.18*sin(in/90))':y='(ih-ih/zoom)*(0.4+0.12*cos(in/110))':d=1:s=${layout.width}x${layout.height}:fps=30[${bgLabel}]`;
    } else if (style === "pixar") {
      // 3D parallax depth breathing with gentle multi-axis floating
      bgScale = `[0:v]scale=${layout.width}:${layout.height}:force_original_aspect_ratio=increase,crop=${layout.width}:${layout.height},zoompan=z='1.02+0.03*sin(in/75)':x='iw/2-(iw/zoom/2)+15*sin(in/90)':y='ih/2-(ih/zoom/2)+10*cos(in/90)':d=1:s=${layout.width}x${layout.height}:fps=30[${bgLabel}]`;
    } else if (style === "devotional") {
      // Ethereal divine camera breath: very slow reverent zoom with soft golden ascend
      bgScale = `[0:v]scale=${layout.width}:${layout.height}:force_original_aspect_ratio=increase,crop=${layout.width}:${layout.height},zoompan=z='1.01+0.025*sin(in/120)':x='(iw-iw/zoom)*0.5':y='(ih-ih/zoom)*(0.5-0.08*sin(in/140))':d=1:s=${layout.width}x${layout.height}:fps=30[${bgLabel}]`;
    } else if (style === "cyberpunk") {
      // Neon pulse & dynamic drift with subtle horizontal sweep
      bgScale = `[0:v]scale=${layout.width}:${layout.height}:force_original_aspect_ratio=increase,crop=${layout.width}:${layout.height},zoompan=z='1.03+0.02*sin(in/60)':x='(iw-iw/zoom)*(0.5+0.25*sin(in/70))':y='(ih-ih/zoom)*0.5':d=1:s=${layout.width}x${layout.height}:fps=30,noise=alls=8:allf=t+u[${bgLabel}]`;
    } else if (style === "nature") {
      // Organic breeze sway: gentle horizontal and vertical wave motion
      bgScale = `[0:v]scale=${layout.width}:${layout.height}:force_original_aspect_ratio=increase,crop=${layout.width}:${layout.height},zoompan=z='1.02+0.02*cos(in/95)':x='(iw-iw/zoom)*(0.5+0.15*cos(in/100))':y='(ih-ih/zoom)*(0.5+0.1*sin(in/120))':d=1:s=${layout.width}x${layout.height}:fps=30[${bgLabel}]`;
    } else if (style === "simple_ai") {
      // Ultra-clean progressive Ken Burns zoom pan (cinematic and steady)
      bgScale = `[0:v]scale=${layout.width}:${layout.height}:force_original_aspect_ratio=increase,crop=${layout.width}:${layout.height},zoompan=z='min(zoom+0.0005,1.07)':x='(iw-iw/zoom)*0.5':y='(ih-ih/zoom)*0.5':d=1:s=${layout.width}x${layout.height}:fps=30[${bgLabel}]`;
    } else {
      // Classic LoFi: Slow analog camera breath + film grain texture
      bgScale = `[0:v]scale=${layout.width}:${layout.height}:force_original_aspect_ratio=increase,crop=${layout.width}:${layout.height},zoompan=z='1.01+0.02*sin(in/90)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${layout.width}x${layout.height}:fps=30,noise=alls=10:allf=t+u[${bgLabel}]`;
    }
  } else {
    inputs = ["-f", "lavfi", "-i", `gradients=s=${layout.width}x${layout.height}:c0=${bg.colors[0]}:c1=${bg.colors[1]}:speed=0.01:rate=30:duration=${seconds}`];
    bgScale = `[0:v]scale=${layout.width}:${layout.height}:force_original_aspect_ratio=increase,crop=${layout.width}:${layout.height},setsar=1,fps=30[${bgLabel}]`;
  }

  const chain = [bgScale];
  if (hasStyleFilter) chain.push(STYLE_FILTERS[style]);
  let last = "bg";
  const texts = [];
  if (title) {
    const cleanTitle = title.slice(0, 60);
    const dynamicSize = cleanTitle.length > 40 ? Math.round(layout.titleSize * 0.72) : cleanTitle.length > 25 ? Math.round(layout.titleSize * 0.85) : layout.titleSize;
    texts.push({ file: "title.txt", text: cleanTitle, size: dynamicSize, color: "white", y: layout.titleY, x: "(w-text_w)/2" });
  }
  if (sub) texts.push({ file: "sub.txt", text: sub, size: layout.subSize, color: "white@0.9", y: layout.subY, x: "(w-text_w)/2" });
  if (watermark) texts.push({ file: "wm.txt", text: watermark.slice(0, 60), size: layout.wmSize, color: "white@0.6", y: layout.wmY, x: layout.wmX });
  texts.push(...timed);

  // Synchronized Multilingual On-Screen Lyrics (Telugu, Hindi, English)
  if (Array.isArray(lyrics) && lyrics.length > 0) {
    const pos = lyricsStyle.position || "bottom";
    const yPos =
      pos === "center"
        ? "(h-text_h)/2"
        : pos === "top"
        ? `${Math.round(layout.height * 0.16)}`
        : `${Math.round(layout.height * 0.78)}`;
    const lyricColor = lyricsStyle.color || "white";
    const boxColor = lyricsStyle.boxColor || "black@0.62";
    const baseSize = lyricsStyle.size
      ? Math.round(layout.subSize * (lyricsStyle.size / 24))
      : Math.round(layout.titleSize * 0.75);

    lyrics.forEach((item, idx) => {
      if (!item || !item.text) return;
      const cleanText = String(item.text).trim();
      if (!cleanText) return;
      const start = Number(item.start) || 0;
      const end = Number(item.end) || seconds;
      texts.push({
        file: `lyric_${idx}.txt`,
        text: cleanText,
        size: baseSize,
        color: lyricColor,
        x: "(w-text_w)/2",
        y: yPos,
        box: 1,
        boxcolor: boxColor,
        boxborderw: 8,
        enable: `between(t,${start.toFixed(2)},${end.toFixed(2)})`,
      });
    });
  }

  for (const [i, t] of texts.entries()) {
    await writeFile(path.join(jobDir, t.file), t.text);
    const enable = t.enable ? `:enable='${t.enable}'` : "";
    const boxPart = t.box ? `:box=1:boxcolor=${t.boxcolor || "black@0.4"}:boxborderw=${t.boxborderw || 6}` : ":box=1:boxcolor=black@0.4:boxborderw=6";
    chain.push(`[${last}]drawtext=fontfile=font.ttf:textfile=${t.file}:fontcolor=${t.color}:fontsize=${t.size}:x=${t.x}:y=${t.y}${enable}${boxPart}:shadowcolor=black@0.8:shadowx=2:shadowy=2[t${i}]`);
    last = `t${i}`;
  }
  // Ensure universal browser compatibility with yuv420p
  chain.push(`[${last}]format=yuv420p[v]`);

  const args = [
    "-y", "-hide_banner", "-loglevel", "error",
    ...inputs,
    "-i", "audio.wav",
    "-filter_complex", chain.join(";"),
    "-map", "[v]", "-map", "1:a",
    "-t", String(seconds),
    "-c:v", "libx264", "-preset", "veryfast", "-crf", layout.crf,
    "-b:v", layout.videoBitrate, "-maxrate", layout.maxRate, "-bufsize", `${Math.round(parseInt(layout.maxRate) * 1.5)}M`,
    "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "192k",
    "-movflags", "+faststart",
    "out.mp4",
  ];
  await runProcess(FFMPEG, args, jobDir);
}

async function renderImage({ scene, style = "lofi", resolution = "1080p", aspectRatio = "16:9", title = "", watermark = "" }) {
  const resolved = resolveScenePath(scene, "lofi_study_girl.jpg");
  const layout = getLayoutConfig(aspectRatio, resolution);
  const id = randomUUID().slice(0, 8);
  const jobDir = path.join(OUT, id);
  await mkdir(jobDir, { recursive: true });

  const ext = path.extname(resolved.filename) || ".jpg";
  const inputImg = path.join(jobDir, `input${ext}`);
  await copyFile(resolved.fullPath, inputImg);
  await copyFile(FONT_SRC, path.join(jobDir, "font.ttf"));

  const hasStyleFilter = Object.hasOwn(STYLE_FILTERS, style);
  const bgLabel = hasStyleFilter ? "bg0" : "bg";
  const bgScale = `[0:v]scale=${layout.width}:${layout.height}:force_original_aspect_ratio=increase,crop=${layout.width}:${layout.height},setsar=1[${bgLabel}]`;

  const chain = [bgScale];
  if (hasStyleFilter) chain.push(STYLE_FILTERS[style]);
  let last = "bg";

  if (title) {
    await writeFile(path.join(jobDir, "title.txt"), title.slice(0, 60));
    chain.push(`[${last}]drawtext=fontfile=font.ttf:textfile=title.txt:fontcolor=white:fontsize=${layout.titleSize}:x=(w-text_w)/2:y=${layout.titleY}:box=1:boxcolor=black@0.4:boxborderw=8:shadowcolor=black@0.75:shadowx=2:shadowy=2[t0]`);
    last = "t0";
  }
  if (watermark) {
    await writeFile(path.join(jobDir, "wm.txt"), watermark.slice(0, 60));
    chain.push(`[${last}]drawtext=fontfile=font.ttf:textfile=wm.txt:fontcolor=white@0.7:fontsize=${layout.wmSize}:x=${layout.wmX}:y=${layout.wmY}:box=1:boxcolor=black@0.3:boxborderw=4[t1]`);
    last = "t1";
  }
  chain.push(`[${last}]format=yuvj420p[out]`);

  const outFilename = `image_${layout.resolution}.jpg`;
  const args = [
    "-y", "-hide_banner", "-loglevel", "error",
    "-i", `input${ext}`,
    "-filter_complex", chain.join(";"),
    "-map", "[out]",
    "-vframes", "1",
    "-q:v", "2",
    outFilename,
  ];
  await runProcess(FFMPEG, args, jobDir);

  const meta = {
    id,
    type: "image",
    resolution: layout.resolution,
    dimensions: `${layout.width}x${layout.height}`,
    aspectRatio,
    style,
    scene: resolved.filename,
    url: `/outputs/${id}/${outFilename}`,
    createdAt: Date.now(),
  };
  await writeFile(path.join(jobDir, "meta.json"), JSON.stringify(meta, null, 2)).catch(() => {});
  return meta;
}

function getGoogleApiKey(bodyKey) {
  return (
    (typeof bodyKey === "string" && bodyKey.trim() ? bodyKey.trim() : null) ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    null
  );
}

async function callGoogleImagen({ prompt, apiKey, aspectRatio = "16:9" }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${encodeURIComponent(apiKey)}`;
  const ratio = aspectRatio === "9:16" ? "9:16" : aspectRatio === "1:1" ? "1:1" : "16:9";
  const payload = {
    instances: [{ prompt }],
    parameters: {
      sampleCount: 1,
      aspectRatio: ratio,
      outputOptions: { mimeType: "image/jpeg" },
    },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Google Imagen API error (${res.status}): ${errText.slice(0, 300)}`);
  }
  const data = await res.json();
  const b64 = data.predictions?.[0]?.bytesBase64Encoded;
  if (!b64) throw new Error("Google Imagen did not return image data");
  return Buffer.from(b64, "base64");
}

async function callGoogleGeminiEnhance({ prompt, category, subcategory, apiKey }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
  const payload = {
    contents: [
      {
        parts: [
          {
            text: `You are an expert visual prompt engineer for Google Imagen 3 and cinematic video synthesis. Expand this user concept for the '${category || "lofi"}' category and '${subcategory || "cinematic"}' subcategory: "${prompt}". Write a single rich visual prompt (1-2 sentences) detailing specific camera framing, lighting, volumetric atmosphere, colors, textures, and mood. Avoid markdown or preamble. Return plain text only.`
          }
        ]
      }
    ],
    generationConfig: {
      maxOutputTokens: 120,
      temperature: 0.7,
    }
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Google Gemini API error (${res.status}): ${errText.slice(0, 300)}`);
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  return text || prompt;
}

function enhancePromptLocally(prompt, category, subcategory) {
  const cat = CATEGORIES_DATA[category];
  const catName = cat?.name || category;
  const keywords = {
    devotional: "ethereal golden aura bloom, sacred temple water reflections, floating lotus diyas, divine transcendental radiance, 8k cinematic masterpiece",
    anime: "Makoto Shinkai vibrant cloudscape, twilight gradient, cel anime aesthetic, soft blooming light, high sharpness, masterpiece",
    lofi: "cozy warm lamplight, rainy window blur, analog tape grain, vintage nostalgic warmth, detailed anime illustration",
    pixar: "Pixar 3D animated volumetric lighting, cozy tactile textures, subsurface scattering warmth, storybook depth of field",
    cyberpunk: "futuristic neon cyan and magenta illumination, wet reflective pavement, volumetric atmospheric haze, blade runner aesthetic",
    nature: "biophilic sanctuary, crystal clear water stream, cascading waterfall sunbeams, lush emerald moss, 8k photography",
    simple_ai: "minimalist architectural geometry, clean modernist lines, pure diffused studio lighting, contemporary art composition",
  };
  const extra = keywords[category] || "cinematic composition, beautiful lighting, 8k masterpiece";
  return `${prompt}, in ${catName} aesthetic, ${extra}`;
}

async function newJob(meta = {}) {
  const id = randomUUID().slice(0, 8);
  const jobDir = path.join(OUT, id);
  await mkdir(jobDir, { recursive: true });
  const fullMeta = { id, createdAt: Date.now(), ...meta };
  await writeFile(path.join(jobDir, "meta.json"), JSON.stringify(fullMeta, null, 2)).catch(() => {});
  return { id, jobDir };
}

function resolveScenePath(sceneOverride, defaultBg) {
  const chosen = (sceneOverride || defaultBg || "lofi_study_girl.jpg").trim();
  const cleanPath = chosen.replace(/^\/+/, "");
  if (cleanPath.startsWith("reference_repo/")) {
    const fullPath = path.normalize(path.join(PUBLIC, cleanPath));
    if (fullPath.startsWith(REF)) {
      return { filename: chosen, fullPath };
    }
  }
  if (cleanPath.startsWith("stock_videos/")) {
    const fullPath = path.normalize(path.join(PUBLIC, cleanPath));
    if (fullPath.startsWith(STOCK_VIDEOS)) {
      return { filename: chosen, fullPath };
    }
  }
  if (cleanPath.startsWith("backgrounds/")) {
    const fullPath = path.normalize(path.join(PUBLIC, cleanPath));
    if (fullPath.startsWith(BGS)) {
      return { filename: chosen, fullPath };
    }
  }
  return { filename: chosen, fullPath: path.join(BGS, path.basename(chosen)) };
}

async function handleCustomAudio(jobDir, { audioDataUrl, customAudioUrl, seconds }) {
  const targetWav = path.join(jobDir, "audio.wav");
  if (audioDataUrl && typeof audioDataUrl === "string" && audioDataUrl.length > 30) {
    const commaIdx = audioDataUrl.indexOf(",");
    const b64 = commaIdx >= 0 ? audioDataUrl.slice(commaIdx + 1) : audioDataUrl;
    const buf = Buffer.from(b64, "base64");
    const tempSrc = path.join(jobDir, "uploaded_audio.bin");
    await writeFile(tempSrc, buf);
    await runProcess(
      FFMPEG,
      [
        "-y", "-hide_banner", "-loglevel", "error",
        "-i", tempSrc,
        "-t", String(seconds),
        "-af", "loudnorm=I=-16:TP=-1.5:LRA=11,volume=1.0",
        "-ar", "44100",
        "-ac", "2",
        targetWav,
      ],
      jobDir
    );
    return true;
  }
  if (customAudioUrl && typeof customAudioUrl === "string" && customAudioUrl.startsWith("http")) {
    const res = await fetch(customAudioUrl);
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      const tempSrc = path.join(jobDir, "url_audio.bin");
      await writeFile(tempSrc, buf);
      await runProcess(
        FFMPEG,
        [
          "-y", "-hide_banner", "-loglevel", "error",
          "-i", tempSrc,
          "-t", String(seconds),
          "-af", "loudnorm=I=-16:TP=-1.5:LRA=11,volume=1.0",
          "-ar", "44100",
          "-ac", "2",
          targetWav,
        ],
        jobDir
      );
      return true;
    }
  }
  return false;
}

function parseLyricsLines(rawText, seconds) {
  if (!rawText || typeof rawText !== "string") return [];
  const rawLines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);
  if (!rawLines.length) return [];

  const results = [];
  const unTimed = [];

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    // Check for [MM:SS - MM:SS] format
    const match = /^\[(\d+):(\d+)\s*-\s*(\d+):(\d+)\]\s*(.*)$/.exec(line);
    if (match) {
      const start = parseInt(match[1]) * 60 + parseFloat(match[2]);
      const end = parseInt(match[3]) * 60 + parseFloat(match[4]);
      results.push({ text: match[5].trim(), start, end });
    } else {
      unTimed.push({ text: line, idx: i });
    }
  }

  // If untimed lines exist, distribute evenly across seconds
  if (unTimed.length > 0) {
    const step = seconds / unTimed.length;
    unTimed.forEach((item, pos) => {
      results.push({
        text: item.text,
        start: Number((pos * step).toFixed(2)),
        end: Number(((pos + 1) * step).toFixed(2)),
      });
    });
  }

  return results.sort((a, b) => a.start - b.start);
}

async function generateFromMood({
  prompt,
  seconds,
  style = "lofi",
  moodOverride,
  sceneOverride,
  gifUrl,
  videoUrl,
  aspectRatio = "16:9",
  resolution = "1080p",
  watermark = "",
  strictPromptAdherence = false,
  negativePrompt = "",
  cameraMotion = "subtle_breath",
  lyrics = [],
  lyricsStyle = {},
  audioDataUrl = null,
  customAudioUrl = null,
  titleOverride = undefined,
  subOverride = undefined,
}) {
  const mood = (moodOverride && MOODS[moodOverride]) ? moodOverride : pickMood(prompt);
  const m = MOODS[mood];
  const layout = getLayoutConfig(aspectRatio, resolution);

  const resolved = resolveScenePath(sceneOverride, m?.defaultBg);
  const bgFilename = resolved.filename;
  const localBgPath = resolved.fullPath;

  const parsedLyrics = Array.isArray(lyrics)
    ? lyrics
    : typeof lyrics === "string"
    ? parseLyricsLines(lyrics, seconds)
    : [];

  const { id, jobDir } = await newJob({
    prompt,
    mood,
    moodLabel: m.label,
    seconds,
    style,
    aspectRatio,
    resolution: layout.resolution,
    dimensions: `${layout.width}x${layout.height}`,
    title: prompt.slice(0, 60),
    sub: m.label,
    bgScene: bgFilename,
    strictPromptAdherence,
    cameraMotion,
    hasLyrics: parsedLyrics.length > 0,
    hasCustomAudio: Boolean(audioDataUrl || customAudioUrl),
  });

  let bg;
  if (videoUrl) {
    await downloadVideo(videoUrl, jobDir);
    bg = { kind: "video" };
  } else if (gifUrl) {
    await downloadGif(gifUrl, jobDir);
    bg = { kind: "gif" };
  } else {
    try {
      await stat(localBgPath);
      const isVid = bgFilename.toLowerCase().endsWith(".mp4") || bgFilename.toLowerCase().endsWith(".webm");
      const isGif = bgFilename.toLowerCase().endsWith(".gif");
      bg = { kind: isVid ? "video" : isGif ? "gif" : "image", localFile: localBgPath };
    } catch {
      bg = { kind: "gradient", colors: m.colors };
    }
  }

  // Handle custom uploaded song (e.g. Telugu song/audio track) or synthesize authentic lofi audio
  const customLoaded = await handleCustomAudio(jobDir, { audioDataUrl, customAudioUrl, seconds }).catch(() => false);
  if (!customLoaded) {
    renderWav(path.join(jobDir, "audio.wav"), { mood, seconds, seed: prompt + id });
  }

  const titleText = titleOverride !== undefined ? titleOverride : (parsedLyrics.length > 0 ? null : prompt.slice(0, 60));
  const subText = subOverride !== undefined ? subOverride : (parsedLyrics.length > 0 ? null : m.label);

  await renderMp4(jobDir, {
    seconds,
    bg,
    title: titleText,
    sub: subText,
    watermark,
    style,
    aspectRatio,
    resolution: layout.resolution,
    strictPromptAdherence,
    cameraMotion,
    lyrics: parsedLyrics,
    lyricsStyle,
  });

  const label = style === "lofi" ? m.label : `${STYLE_NAMES[style] || style} look, ${m.label}`;
  return { id, label, mood, bgScene: bgFilename, resolution: layout.resolution, dimensions: `${layout.width}x${layout.height}` };
}

async function generateFromYoutube({ youtubeUrl, seconds, gifUrl, videoUrl, sceneOverride, watermark, aspectRatio = "16:9", resolution = "1080p" }) {
  const url = parseYoutubeUrl(youtubeUrl);
  const layout = getLayoutConfig(aspectRatio, resolution);
  const resolved = resolveScenePath(sceneOverride, "lofi_study_girl.jpg");
  const bgFilename = resolved.filename;
  const localBgPath = resolved.fullPath;

  const { id, jobDir } = await newJob({
    type: "youtube",
    youtubeUrl,
    seconds,
    gifUrl,
    videoUrl,
    aspectRatio,
    resolution: layout.resolution,
    dimensions: `${layout.width}x${layout.height}`,
    title: "YouTube Audio Remix",
    sub: "Lofi Remix",
    bgScene: bgFilename,
  });

  await downloadYoutubeAudio(url, seconds, jobDir);

  let bg;
  if (videoUrl) {
    await downloadVideo(videoUrl, jobDir);
    bg = { kind: "video" };
  } else if (gifUrl) {
    await downloadGif(gifUrl, jobDir);
    bg = { kind: "gif" };
  } else {
    try {
      await stat(localBgPath);
      const isVid = bgFilename.toLowerCase().endsWith(".mp4") || bgFilename.toLowerCase().endsWith(".webm");
      const isGif = bgFilename.toLowerCase().endsWith(".gif");
      bg = { kind: isVid ? "video" : isGif ? "gif" : "image", localFile: localBgPath };
    } catch {
      bg = { kind: "gradient", colors: MOODS.night.colors };
    }
  }

  await renderMp4(jobDir, { seconds, bg, title: null, sub: null, watermark: watermark || "", aspectRatio, resolution: layout.resolution });
  return { id, label: "YouTube audio", resolution: layout.resolution, dimensions: `${layout.width}x${layout.height}` };
}

async function generateSlides({ scenes, seconds, watermark, sceneOverride, aspectRatio = "16:9", resolution = "1080p" }) {
  const lines = scenes.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 12);
  if (!lines.length) throw new Error("Add at least one scene line");
  const mood = pickMood(lines.join(" "));
  const m = MOODS[mood];
  const layout = getLayoutConfig(aspectRatio, resolution);

  const resolved = resolveScenePath(sceneOverride, m?.defaultBg);
  const bgFilename = resolved.filename;
  const localBgPath = resolved.fullPath;

  const { id, jobDir } = await newJob({
    type: "slides",
    mood,
    moodLabel: m.label,
    scenes: lines,
    seconds,
    aspectRatio,
    resolution: layout.resolution,
    dimensions: `${layout.width}x${layout.height}`,
    title: lines[0] || "Story Slides",
    sub: `${lines.length} scene${lines.length > 1 ? "s" : ""}`,
    bgScene: bgFilename,
  });

  renderWav(path.join(jobDir, "audio.wav"), { mood, seconds, seed: lines.join("|") + id });

  let bg;
  try {
    await stat(localBgPath);
    const isVid = bgFilename.toLowerCase().endsWith(".mp4") || bgFilename.toLowerCase().endsWith(".webm");
    const isGif = bgFilename.toLowerCase().endsWith(".gif");
    bg = { kind: isVid ? "video" : isGif ? "gif" : "image", localFile: localBgPath };
  } catch {
    bg = { kind: "gradient", colors: m.colors };
  }

  const step = seconds / lines.length;
  const timed = lines.map((line, i) => ({
    file: `scene${i}.txt`,
    text: line.slice(0, 60),
    size: layout.subSize,
    color: "white",
    x: "(w-text_w)/2",
    y: "(h-text_h)/2",
    enable: `between(t,${(i * step).toFixed(2)},${((i + 1) * step).toFixed(2)})`,
  }));

  await renderMp4(jobDir, {
    seconds,
    bg,
    title: null,
    sub: null,
    watermark: watermark || "",
    timed,
    aspectRatio,
    resolution: layout.resolution,
  });

  return { id, label: `${lines.length} scene${lines.length > 1 ? "s" : ""}`, resolution: layout.resolution, dimensions: `${layout.width}x${layout.height}` };
}

async function trimSilence(jobId) {
  const srcDir = path.join(OUT, jobId);
  const src = path.join(srcDir, "out.mp4");
  const log = await runProcess(
    FFMPEG,
    ["-hide_banner", "-nostats", "-i", src, "-vn", "-af", "silencedetect=noise=-35dB:d=0.6", "-f", "null", "-"],
    srcDir,
  );
  const dm = /Duration: (\d+):(\d+):([\d.]+)/.exec(log);
  if (!dm) throw new Error("Could not read video duration");
  const total = Number(dm[1]) * 3600 + Number(dm[2]) * 60 + Number(dm[3]);
  const starts = [...log.matchAll(/silence_start: ([\d.]+)/g)].map((m) => Number(m[1]));
  const ends = [...log.matchAll(/silence_end: ([\d.]+)/g)].map((m) => Number(m[1]));
  const PAD = 0.15;
  const keep = [];
  let cursor = 0;
  starts.forEach((s, i) => {
    const e = ends[i] ?? total;
    if (s > cursor) keep.push([cursor, Math.min(total, s + PAD)]);
    cursor = Math.max(cursor, e - PAD);
  });
  if (cursor < total) keep.push([cursor, total]);
  const segs = keep.filter(([a, b]) => b - a > 0.1);
  const keptTotal = segs.reduce((n, [a, b]) => n + b - a, 0);
  if (!segs.length || total - keptTotal < 0.5) throw new Error("Nothing to trim: no long pauses found");
  if (segs.length > 300) throw new Error("Too many pauses to trim");

  const expr = segs.map(([a, b]) => `between(t,${a.toFixed(3)},${b.toFixed(3)})`).join("+");
  const { id, jobDir } = await newJob({ type: "trimmed", sourceJobId: jobId, removedSeconds: total - keptTotal });
  await runProcess(
    FFMPEG,
    [
      "-y", "-hide_banner", "-loglevel", "error",
      "-i", src,
      "-filter_complex", `[0:v]select='${expr}',setpts=N/FRAME_RATE/TB[v];[0:a]aselect='${expr}',asetpts=N/SR/TB[a]`,
      "-map", "[v]", "-map", "[a]",
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "22",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "192k",
      "-movflags", "+faststart",
      "out.mp4",
    ],
    jobDir,
  );
  return { id, removedSeconds: total - keptTotal };
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  let data = "";
  for await (const chunk of req) {
    data += chunk;
    if (data.length > 50 * 1024 * 1024) throw new Error("Body too large (max 50MB)");
  }
  return data ? JSON.parse(data) : {};
}

function clampSeconds(v) {
  return Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, Number(v) || 60));
}

async function withBody(req, res, handler) {
  let body;
  try {
    body = await readBody(req);
  } catch {
    return sendJson(res, 400, { error: "Invalid JSON" });
  }
  try {
    sendJson(res, 200, await handler(body));
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { error: err.message });
  }
}

function handleGenerate(req, res) {
  return withBody(req, res, async (body) => {
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt || prompt.length > 300) throw new Error("Prompt must be 1-300 characters");
    const seconds = clampSeconds(body.seconds);
    const style = parseStyle(body.style);
    const aspectRatio = parseAspectRatio(body.aspectRatio);
    const resolution = parseResolution(body.resolution);
    const moodOverride = typeof body.mood === "string" ? body.mood : null;
    const sceneOverride = typeof body.scene === "string" ? body.scene : null;
    const gifUrl = typeof body.gifUrl === "string" && body.gifUrl.trim() ? body.gifUrl.trim() : null;
    const videoUrl = typeof body.videoUrl === "string" && body.videoUrl.trim() ? body.videoUrl.trim() : null;
    const watermark = typeof body.watermark === "string" ? body.watermark.trim().slice(0, 60) : "";
    const strictPromptAdherence = Boolean(body.strictPromptAdherence);
    const negativePrompt = typeof body.negativePrompt === "string" ? body.negativePrompt.trim() : "";
    const cameraMotion = typeof body.cameraMotion === "string" ? body.cameraMotion : "subtle_breath";
    const lyrics = body.lyrics;
    const lyricsStyle = typeof body.lyricsStyle === "object" ? body.lyricsStyle : {};
    const audioDataUrl = typeof body.audioDataUrl === "string" ? body.audioDataUrl : null;
    const customAudioUrl = typeof body.customAudioUrl === "string" ? body.customAudioUrl : null;

    const r = await generateFromMood({
      prompt,
      seconds,
      style,
      moodOverride,
      sceneOverride,
      gifUrl,
      videoUrl,
      aspectRatio,
      resolution,
      watermark,
      strictPromptAdherence,
      negativePrompt,
      cameraMotion,
      lyrics,
      lyricsStyle,
      audioDataUrl,
      customAudioUrl,
    });
    return {
      id: r.id,
      moodLabel: r.label,
      mood: r.mood,
      bgScene: r.bgScene,
      url: `/outputs/${r.id}/out.mp4`,
      audioUrl: `/outputs/${r.id}/audio.wav`,
      aspectRatio,
      resolution: r.resolution,
      dimensions: r.dimensions,
    };
  });
}

function handleLyricsVideo(req, res) {
  return withBody(req, res, async (body) => {
    const lyrics = body.lyrics;
    if (!lyrics) throw new Error("Lyrics text or timed array is required");
    const seconds = clampSeconds(body.seconds || 30);
    const prompt = typeof body.prompt === "string" && body.prompt.trim() ? body.prompt.trim() : "Telugu Lyrics Music Video";
    const style = parseStyle(body.style || "lofi");
    const aspectRatio = parseAspectRatio(body.aspectRatio);
    const resolution = parseResolution(body.resolution);
    const sceneOverride = typeof body.scene === "string" ? body.scene : null;
    const watermark = typeof body.watermark === "string" ? body.watermark.trim().slice(0, 60) : "";
    const lyricsStyle = typeof body.lyricsStyle === "object" ? body.lyricsStyle : {};
    const audioDataUrl = typeof body.audioDataUrl === "string" ? body.audioDataUrl : null;
    const customAudioUrl = typeof body.customAudioUrl === "string" ? body.customAudioUrl : null;
    const strictPromptAdherence = Boolean(body.strictPromptAdherence);
    const cameraMotion = typeof body.cameraMotion === "string" ? body.cameraMotion : "gaze_locked";

    const r = await generateFromMood({
      prompt,
      seconds,
      style,
      sceneOverride,
      aspectRatio,
      resolution,
      watermark,
      strictPromptAdherence,
      cameraMotion,
      lyrics,
      lyricsStyle,
      audioDataUrl,
      customAudioUrl,
    });

    return {
      id: r.id,
      moodLabel: r.label,
      url: `/outputs/${r.id}/out.mp4`,
      audioUrl: `/outputs/${r.id}/audio.wav`,
      aspectRatio,
      resolution: r.resolution,
      dimensions: r.dimensions,
      type: "lyrics_video",
    };
  });
}

function handleCreditsStatus(req, res) {
  sendJson(res, 200, {
    plan: "Unlimited Creator Tier (Zero Paywall)",
    dailyFreeCredits: 999999999,
    creditsRemaining: 999999999,
    isUnlimited: true,
    isZeroPaywall: true,
    resetsInHours: 0,
    policy: {
      localGenerations: "100% UNLIMITED & FREE (999,999,999 credits, 0 consumed)",
      cloudAIImages: "100% UNLIMITED & FREE (999,999,999 credits available)",
      cloudAIVideos: "100% UNLIMITED & FREE (999,999,999 credits available)",
      resolutionSurcharge: "0 credits (4K, 2K, 1080p, 720p all 100% free)",
      failedGenerations: "Automatic instant refund guarantee",
      customLyricsAndAudio: "100% Free & Unlimited",
    },
    message: "Unlimited Credits Mode permanently active: 999,999,999 credits. Zero restrictions, zero subscriptions.",
  });
}

function handleFromYoutube(req, res) {
  return withBody(req, res, async (body) => {
    if (typeof body.youtubeUrl !== "string" || !body.youtubeUrl.trim()) throw new Error("YouTube URL is required");
    const seconds = clampSeconds(body.seconds);
    const gifUrl = typeof body.gifUrl === "string" && body.gifUrl.trim() ? body.gifUrl.trim() : null;
    const videoUrl = typeof body.videoUrl === "string" && body.videoUrl.trim() ? body.videoUrl.trim() : null;
    const sceneOverride = typeof body.scene === "string" ? body.scene : null;
    const watermark = typeof body.watermark === "string" ? body.watermark.trim().slice(0, 60) : "";
    const aspectRatio = parseAspectRatio(body.aspectRatio);
    const resolution = parseResolution(body.resolution);

    const r = await generateFromYoutube({ youtubeUrl: body.youtubeUrl.trim(), seconds, gifUrl, videoUrl, sceneOverride, watermark, aspectRatio, resolution });
    return {
      id: r.id,
      moodLabel: r.label,
      url: `/outputs/${r.id}/out.mp4`,
      audioUrl: `/outputs/${r.id}/audio.wav`,
      aspectRatio,
      resolution: r.resolution,
      dimensions: r.dimensions,
    };
  });
}

function handlePublish(req, res) {
  return withBody(req, res, async (body) => {
    if (!JOB_ID.test(body.jobId || "")) throw new Error("Invalid job id");
    const filePath = path.join(OUT, body.jobId, "out.mp4");
    const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : "Lofi video";
    const description = typeof body.description === "string" ? body.description : "";

    if (body.target === "youtube") {
      return { target: "youtube", ...(await publishToYouTube({ filePath, title, description, privacy: body.privacy })) };
    }
    if (body.target === "instagram") {
      if (!PUBLIC_BASE_URL) throw new Error("Instagram needs a public video URL: set PUBLIC_BASE_URL (for example an ngrok or tunnel address)");
      const videoUrl = `${PUBLIC_BASE_URL}/outputs/${body.jobId}/out.mp4`;
      return { target: "instagram", ...(await publishToInstagram({ videoUrl, caption: `${title}\n${description}`.trim() })) };
    }
    throw new Error("target must be youtube or instagram");
  });
}

function handleSlides(req, res) {
  return withBody(req, res, async (body) => {
    const scenes = typeof body.scenes === "string" ? body.scenes : "";
    const seconds = clampSeconds(body.seconds);
    const watermark = typeof body.watermark === "string" ? body.watermark.trim().slice(0, 60) : "";
    const sceneOverride = typeof body.scene === "string" ? body.scene : null;
    const aspectRatio = parseAspectRatio(body.aspectRatio);
    const resolution = parseResolution(body.resolution);

    const r = await generateSlides({ scenes, seconds, watermark, sceneOverride, aspectRatio, resolution });
    return {
      id: r.id,
      moodLabel: r.label,
      url: `/outputs/${r.id}/out.mp4`,
      audioUrl: `/outputs/${r.id}/audio.wav`,
      aspectRatio,
      resolution: r.resolution,
      dimensions: r.dimensions,
    };
  });
}

function handleRenderImage(req, res) {
  return withBody(req, res, async (body) => {
    const scene = typeof body.scene === "string" ? body.scene : "lofi_study_girl.jpg";
    const style = parseStyle(body.style);
    const resolution = parseResolution(body.resolution);
    const aspectRatio = parseAspectRatio(body.aspectRatio);
    const title = typeof body.title === "string" ? body.title : "";
    const watermark = typeof body.watermark === "string" ? body.watermark : "";

    const r = await renderImage({ scene, style, resolution, aspectRatio, title, watermark });
    return r;
  });
}

function handleCategories(req, res) {
  sendJson(res, 200, {
    categories: CATEGORIES_DATA,
    resolutions: [
      { id: "720p", label: "720p HD", desc: "1280x720 • Fast Web & Mobile Preview", badge: "Fast" },
      { id: "1080p", label: "1080p Full HD", desc: "1920x1080 • Standard High Definition", badge: "Standard" },
      { id: "2k", label: "2K QHD", desc: "2560x1440 • Ultra Crisp Studio Fidelity", badge: "Crisp" },
      { id: "4k", label: "4K UHD", desc: "3840x2160 • Master Cinema Quality", badge: "Cinema" },
    ],
  });
}

function handleGoogleStatus(req, res) {
  const envKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
  sendJson(res, 200, {
    configured: Boolean(envKey),
    hasEnvKey: Boolean(envKey),
    imageModel: "imagen-3.0-generate-002",
    promptModel: "gemini-2.0-flash",
    fallbackAvailable: true,
  });
}

function handleGoogleEnhancePrompt(req, res) {
  return withBody(req, res, async (body) => {
    const rawPrompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (!rawPrompt) throw new Error("Prompt is required");
    const category = typeof body.category === "string" && CATEGORIES_DATA[body.category] ? body.category : "lofi";
    const subcategory = typeof body.subcategory === "string" ? body.subcategory : "";
    const apiKey = getGoogleApiKey(body.apiKey);

    if (apiKey) {
      try {
        const enhanced = await callGoogleGeminiEnhance({ prompt: rawPrompt, category, subcategory, apiKey });
        return { success: true, original: rawPrompt, enhanced, provider: "gemini-2.0-flash" };
      } catch (err) {
        console.warn("Gemini enhance API error:", err.message);
      }
    }
    const enhanced = enhancePromptLocally(rawPrompt, category, subcategory);
    return { success: true, original: rawPrompt, enhanced, provider: "studio-rule-engine" };
  });
}

function handleGoogleGenerateImage(req, res) {
  return withBody(req, res, async (body) => {
    const rawPrompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (!rawPrompt) throw new Error("Prompt is required");
    const category = typeof body.category === "string" && CATEGORIES_DATA[body.category] ? body.category : "lofi";
    const subcategory = typeof body.subcategory === "string" ? body.subcategory : "";
    const resolution = parseResolution(body.resolution);
    const aspectRatio = parseAspectRatio(body.aspectRatio);
    const apiKey = getGoogleApiKey(body.apiKey);

    let imageBuffer;
    let enhancedPrompt = rawPrompt;
    let provider = "google-imagen-3";

    if (apiKey) {
      try {
        if (body.enhancePrompt) {
          enhancedPrompt = await callGoogleGeminiEnhance({ prompt: rawPrompt, category, subcategory, apiKey });
        }
      } catch {
        enhancedPrompt = enhancePromptLocally(rawPrompt, category, subcategory);
      }
      try {
        imageBuffer = await callGoogleImagen({ prompt: enhancedPrompt, apiKey, aspectRatio });
      } catch (err) {
        console.warn("Google Imagen API error:", err.message);
        throw new Error(`Google Imagen failed: ${err.message}`);
      }
    } else {
      provider = "studio-procedural-ai";
      enhancedPrompt = enhancePromptLocally(rawPrompt, category, subcategory);
      const catObj = CATEGORIES_DATA[category];
      const subObj = catObj?.subcategories?.find((s) => s.id === subcategory);
      const chosenScene = subObj?.scene || catObj?.subcategories?.[0]?.scene || "lofi_study_girl.jpg";
      const resolved = resolveScenePath(chosenScene, "lofi_study_girl.jpg");
      imageBuffer = await readFile(resolved.fullPath);
    }

    const filename = `google_ai_${Date.now()}_${randomUUID().slice(0, 6)}.jpg`;
    const filePath = path.join(BGS, filename);
    await writeFile(filePath, imageBuffer);

    const newScene = {
      id: filename,
      label: rawPrompt.slice(0, 40) || "Google AI Artwork",
      tag: `Google AI Generated • ${CATEGORIES_DATA[category]?.name || category} (${resolution})`,
      style: category,
      category: category,
      subcategory: subcategory,
      url: `/backgrounds/${filename}`,
    };
    SCENES.push(newScene);

    return {
      success: true,
      provider,
      filename,
      url: `/backgrounds/${filename}`,
      scene: newScene,
      prompt: rawPrompt,
      enhancedPrompt,
      resolution,
      aspectRatio,
      category,
      subcategory,
    };
  });
}

function handleGoogleGenerateVideo(req, res) {
  return withBody(req, res, async (body) => {
    const rawPrompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (!rawPrompt) throw new Error("Prompt is required");
    const category = typeof body.category === "string" && CATEGORIES_DATA[body.category] ? body.category : "lofi";
    const subcategory = typeof body.subcategory === "string" ? body.subcategory : "";
    const resolution = parseResolution(body.resolution);
    const aspectRatio = parseAspectRatio(body.aspectRatio);
    const seconds = clampSeconds(body.seconds || 30);
    const apiKey = getGoogleApiKey(body.apiKey);

    let sceneFilename;
    if (body.scene && typeof body.scene === "string") {
      sceneFilename = body.scene;
    } else {
      let buffer;
      if (apiKey) {
        const enhanced = enhancePromptLocally(rawPrompt, category, subcategory);
        buffer = await callGoogleImagen({ prompt: enhanced, apiKey, aspectRatio }).catch(() => null);
      }
      if (!buffer) {
        const catObj = CATEGORIES_DATA[category];
        const subObj = catObj?.subcategories?.find((s) => s.id === subcategory);
        const chosen = subObj?.scene || catObj?.subcategories?.[0]?.scene || "lofi_study_girl.jpg";
        const resolved = resolveScenePath(chosen, "lofi_study_girl.jpg");
        buffer = await readFile(resolved.fullPath);
      }
      sceneFilename = `google_ai_${Date.now()}_${randomUUID().slice(0, 6)}.jpg`;
      await writeFile(path.join(BGS, sceneFilename), buffer);
      SCENES.push({
        id: sceneFilename,
        label: rawPrompt.slice(0, 40),
        tag: `Google AI Living Video • ${category}`,
        style: category,
        category: category,
        subcategory,
        url: `/backgrounds/${sceneFilename}`,
      });
    }

    const moodOverride = body.mood || CATEGORIES_DATA[category]?.defaultMood || "night";
    const r = await generateFromMood({
      prompt: rawPrompt,
      seconds,
      style: category,
      moodOverride,
      sceneOverride: sceneFilename,
      aspectRatio,
      resolution,
      watermark: body.watermark || "Google AI Live Video",
    });

    return {
      success: true,
      id: r.id,
      url: `/outputs/${r.id}/out.mp4`,
      audioUrl: `/outputs/${r.id}/audio.wav`,
      moodLabel: r.label,
      bgScene: sceneFilename,
      resolution: r.resolution,
      dimensions: r.dimensions,
      aspectRatio,
      category,
      subcategory,
    };
  });
}

function handleTrimSilence(req, res) {
  return withBody(req, res, async (body) => {
    if (!JOB_ID.test(body.jobId || "")) throw new Error("Invalid job id");
    const r = await trimSilence(body.jobId);
    return {
      id: r.id,
      removedSeconds: r.removedSeconds,
      url: `/outputs/${r.id}/out.mp4`,
      audioUrl: `/outputs/${r.id}/audio.wav`,
    };
  });
}

async function downloadImageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const getFn = parsed.protocol === "https:" ? https.get : http.get;
    getFn(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadImageFromUrl(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download image: HTTP ${res.statusCode}`));
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const buffer = Buffer.concat(chunks);
        const ctype = res.headers["content-type"] || "";
        let ext = ".jpg";
        if (ctype.includes("png")) ext = ".png";
        else if (ctype.includes("webp")) ext = ".webp";
        resolve({ buffer, ext });
      });
      res.on("error", reject);
    }).on("error", reject);
  });
}

async function handleUploadImage(req, res) {
  try {
    const chunks = [];
    let total = 0;
    const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB limit
    for await (const chunk of req) {
      total += chunk.length;
      if (total > MAX_UPLOAD_BYTES) {
        return sendJson(res, 413, { error: "Image file exceeds 25MB maximum limit" });
      }
      chunks.push(chunk);
    }
    const fullBuffer = Buffer.concat(chunks);
    let buffer;
    let ext = ".jpg";
    let style = "lofi";
    let label = "Custom Living Scene";

    const textPayload = fullBuffer.toString("utf-8").trim();
    if (textPayload.startsWith("{")) {
      const parsed = JSON.parse(textPayload);
      style = parseStyle(parsed.style);
      label = (parsed.label || "Custom Image").slice(0, 50);
      if (parsed.imageUrl) {
        const dl = await downloadImageFromUrl(parsed.imageUrl);
        buffer = dl.buffer;
        ext = dl.ext;
      } else if (parsed.dataUrl) {
        const match = parsed.dataUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
        if (!match) throw new Error("Invalid base64 image data");
        ext = `.${match[1] === "jpeg" ? "jpg" : match[1]}`;
        buffer = Buffer.from(match[2], "base64");
      } else {
        throw new Error("No dataUrl or imageUrl in payload");
      }
    } else {
      buffer = fullBuffer;
      const ctype = req.headers["content-type"] || "image/jpeg";
      if (ctype.includes("png")) ext = ".png";
      else if (ctype.includes("webp")) ext = ".webp";
    }

    const filename = `custom_${Date.now()}_${randomUUID().slice(0, 6)}${ext}`;
    const filePath = path.join(BGS, filename);
    await writeFile(filePath, buffer);

    const newScene = {
      id: filename,
      label: label,
      tag: `Animated living artwork • Style: ${STYLE_NAMES[style]}`,
      style: style,
      url: `/backgrounds/${filename}`,
    };
    SCENES.push(newScene);

    sendJson(res, 200, {
      success: true,
      filename,
      url: `/backgrounds/${filename}`,
      scene: newScene,
    });
  } catch (err) {
    console.error("Image upload error:", err);
    sendJson(res, 500, { error: err.message });
  }
}

async function handleHistory(req, res) {
  try {
    const entries = await readdir(OUT, { withFileTypes: true });
    const items = [];
    for (const dirent of entries) {
      if (!dirent.isDirectory()) continue;
      const id = dirent.name;
      if (!JOB_ID.test(id)) continue;
      const jobDir = path.join(OUT, id);
      try {
        const mp4Stat = await stat(path.join(jobDir, "out.mp4"));
        let meta = {};
        try {
          meta = JSON.parse(await readFile(path.join(jobDir, "meta.json"), "utf-8"));
        } catch {
          let title = "";
          let sub = "";
          try { title = (await readFile(path.join(jobDir, "title.txt"), "utf-8")).trim(); } catch {}
          try { sub = (await readFile(path.join(jobDir, "sub.txt"), "utf-8")).trim(); } catch {}
          meta = { id, title: title || `Lofi Mix #${id}`, sub: sub || "Lofi Studio", createdAt: mp4Stat.mtimeMs };
        }
        items.push({
          id,
          url: `/outputs/${id}/out.mp4`,
          audioUrl: `/outputs/${id}/audio.wav`,
          title: meta.title || `Lofi Mix #${id}`,
          sub: meta.sub || meta.moodLabel || "Lofi Studio",
          mood: meta.mood,
          style: meta.style || "lofi",
          seconds: meta.seconds || 60,
          aspectRatio: meta.aspectRatio || "16:9",
          resolution: meta.resolution || "1080p",
          dimensions: meta.dimensions || "1920x1080",
          createdAt: meta.createdAt || mp4Stat.mtimeMs,
          size: mp4Stat.size,
          bgScene: meta.bgScene,
        });
      } catch {
        // out.mp4 not present or failed
      }
    }
    items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    sendJson(res, 200, { items });
  } catch (err) {
    sendJson(res, 500, { error: err.message });
  }
}

async function getActiveScenes() {
  const existing = [];
  for (const s of SCENES) {
    try {
      await stat(path.join(BGS, s.id));
      existing.push(s);
    } catch {
      // file missing on disk, fallback if core preset
      if (s.id.startsWith("lofi_") || s.id.startsWith("anime_") || s.id.startsWith("pixar_")) {
        existing.push(s);
      }
    }
  }
  return existing;
}

async function handleMoods(req, res) {
  const moods = Object.entries(MOODS).map(([key, val]) => ({
    id: key,
    label: val.label,
    bpm: val.bpm,
    tag: val.tag || "",
    colors: val.colors,
    defaultBg: val.defaultBg,
  }));
  const scenes = await getActiveScenes();
  sendJson(res, 200, { moods, scenes });
}

let cachedCatalog = null;
async function getCatalog() {
  if (!cachedCatalog) {
    try {
      const data = await readFile(CATALOG_PATH, "utf-8");
      cachedCatalog = JSON.parse(data);
    } catch (e) {
      console.error("Error reading catalog.json:", e);
      cachedCatalog = [];
    }
  }
  return cachedCatalog;
}

async function handleReferences(req, res, url) {
  try {
    const catalog = await getCatalog();
    const category = url.searchParams.get("category");
    const q = (url.searchParams.get("q") || "").toLowerCase().trim();
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 300, 1), 300);
    const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);

    let filtered = catalog;
    if (category && category !== "all") {
      filtered = filtered.filter((item) => item.category === category);
    }
    if (q) {
      filtered = filtered.filter((item) => {
        return (
          item.title?.toLowerCase().includes(q) ||
          item.mood?.toLowerCase().includes(q) ||
          item.style?.toLowerCase().includes(q) ||
          item.tags?.some((t) => t.toLowerCase().includes(q))
        );
      });
    }

    const total = filtered.length;
    const items = filtered.slice(offset, offset + limit);
    const counts = {
      total: catalog.length,
      lofi: catalog.filter((i) => i.category === "lofi").length,
      anime: catalog.filter((i) => i.category === "anime").length,
      pixar: catalog.filter((i) => i.category === "pixar").length,
      devotional: catalog.filter((i) => i.category === "devotional").length,
      cyberpunk: catalog.filter((i) => i.category === "cyberpunk").length,
      nature: catalog.filter((i) => i.category === "nature").length,
      simple_ai: catalog.filter((i) => i.category === "simple_ai").length,
    };

    sendJson(res, 200, { total, counts, items });
  } catch (err) {
    sendJson(res, 500, { error: err.message });
  }
}

let cachedStockVideos = null;
async function getStockVideos() {
  if (!cachedStockVideos) {
    try {
      const data = await readFile(STOCK_VIDEOS_CATALOG, "utf-8");
      cachedStockVideos = JSON.parse(data);
    } catch {
      cachedStockVideos = [];
    }
  }
  return cachedStockVideos;
}

async function handleStockVideos(req, res) {
  try {
    const items = await getStockVideos();
    sendJson(res, 200, { items });
  } catch (err) {
    sendJson(res, 500, { error: err.message });
  }
}

async function serveFile(res, filePath, contentType) {
  try {
    const s = await stat(filePath);
    if (!s.isFile()) throw new Error("not a file");
  } catch {
    res.writeHead(404);
    return res.end("Not found");
  }
  res.writeHead(200, {
    "Content-Type": contentType,
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "public, max-age=3600",
  });
  createReadStream(filePath).pipe(res);
}

const TYPES = {
  ".html": "text/html",
  ".mp4": "video/mp4",
  ".js": "text/javascript",
  ".css": "text/css",
  ".wav": "audio/wav",
  ".json": "application/json",
  ".gif": "image/gif",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    return res.end();
  }

  if (req.method === "GET" && url.pathname === "/api/history") return handleHistory(req, res);
  if (req.method === "GET" && url.pathname === "/api/moods") return handleMoods(req, res);
  if (req.method === "GET" && url.pathname === "/api/scenes") {
    const scenes = await getActiveScenes();
    return sendJson(res, 200, { scenes });
  }
  if (req.method === "GET" && url.pathname === "/api/categories") return handleCategories(req, res);
  if (req.method === "GET" && url.pathname === "/api/references") return handleReferences(req, res, url);
  if (req.method === "GET" && url.pathname === "/api/stock-videos") return handleStockVideos(req, res);
  if (req.method === "GET" && url.pathname === "/api/google/status") return handleGoogleStatus(req, res);
  if (req.method === "GET" && url.pathname === "/api/credits/status") return handleCreditsStatus(req, res);

  if (req.method === "POST" && url.pathname === "/api/generate") return handleGenerate(req, res);
  if (req.method === "POST" && url.pathname === "/api/lyrics-video") return handleLyricsVideo(req, res);
  if (req.method === "POST" && url.pathname === "/api/from-youtube") return handleFromYoutube(req, res);
  if (req.method === "POST" && url.pathname === "/api/publish") return handlePublish(req, res);
  if (req.method === "POST" && url.pathname === "/api/slides") return handleSlides(req, res);
  if (req.method === "POST" && url.pathname === "/api/trim-silence") return handleTrimSilence(req, res);
  if (req.method === "POST" && url.pathname === "/api/upload-image") return handleUploadImage(req, res);
  if (req.method === "POST" && url.pathname === "/api/render-image") return handleRenderImage(req, res);
  if (req.method === "POST" && url.pathname === "/api/google/enhance-prompt") return handleGoogleEnhancePrompt(req, res);
  if (req.method === "POST" && url.pathname === "/api/google/generate-image") return handleGoogleGenerateImage(req, res);
  if (req.method === "POST" && url.pathname === "/api/google/generate-video") return handleGoogleGenerateVideo(req, res);

  if (req.method === "GET" && url.pathname.startsWith("/outputs/")) {
    const target = path.normalize(path.join(ROOT, decodeURIComponent(url.pathname)));
    if (!target.startsWith(OUT + path.sep)) {
      res.writeHead(403);
      return res.end("Forbidden");
    }
    return serveFile(res, target, TYPES[path.extname(target)] || "application/octet-stream");
  }

  if (req.method === "GET" && url.pathname.startsWith("/backgrounds/")) {
    const filename = path.basename(decodeURIComponent(url.pathname));
    const target = path.join(BGS, filename);
    const ext = path.extname(target).toLowerCase();
    return serveFile(res, target, TYPES[ext] || "image/jpeg");
  }

  if (req.method === "GET" && url.pathname.startsWith("/reference_repo/")) {
    const sub = decodeURIComponent(url.pathname.replace(/^\/reference_repo\/?/, ""));
    const target = path.normalize(path.join(REF, sub));
    if (!target.startsWith(REF)) {
      res.writeHead(403);
      return res.end("Forbidden");
    }
    const ext = path.extname(target).toLowerCase();
    return serveFile(res, target, TYPES[ext] || "application/octet-stream");
  }

  if (req.method === "GET" && url.pathname.startsWith("/stock_videos/")) {
    const sub = decodeURIComponent(url.pathname.replace(/^\/stock_videos\/?/, ""));
    const target = path.normalize(path.join(STOCK_VIDEOS, sub));
    if (!target.startsWith(STOCK_VIDEOS)) {
      res.writeHead(403);
      return res.end("Forbidden");
    }
    const ext = path.extname(target).toLowerCase();
    return serveFile(res, target, TYPES[ext] || "video/mp4");
  }

  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
    const html = await readFile(path.join(PUBLIC, "index.html"));
    res.writeHead(200, { "Content-Type": "text/html" });
    return res.end(html);
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Lofi generator running at http://localhost:${PORT}`);
});
