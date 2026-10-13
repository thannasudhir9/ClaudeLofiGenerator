import http from "node:http";
import { createReadStream } from "node:fs";
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
const FONT_SRC = process.env.FONT_FILE || "C:/Windows/Fonts/arial.ttf";
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "");
const MIN_SECONDS = 10;
const MAX_SECONDS = 240;
const MAX_GIF_BYTES = 20 * 1024 * 1024;
const JOB_ID = /^[a-f0-9]{8}$/;
const STYLE_NAMES = { lofi: "Lofi", anime: "Anime", pixar: "Pixar" };
const STYLE_FILTERS = {
  anime: "[bg0]hqdn3d=3:2:5:4,eq=saturation=1.42:contrast=1.16:brightness=0.02,unsharp=7:7:1.3:5:5:0.5,curves=r='0/0 0.5/0.52 1/1':b='0/0 0.5/0.54 1/1'[bg]",
  pixar: "[bg0]split=2[orig][bloom];[bloom]eq=brightness=0.06:contrast=1.28:saturation=1.45,gblur=sigma=20:steps=2[bloom];[orig][bloom]blend=all_mode=screen:all_opacity=0.45[blended];[blended]colorbalance=rs=0.05:gs=0.02:bs=-0.03,unsharp=5:5:0.7:3:3:0.3[bg]",
};

const SCENES = [
  { id: "lofi_study_girl.jpg", label: "Anime Study Desk", tag: "Classic Lofi Girl with headphones, rain & cat", style: "lofi", url: "/backgrounds/lofi_study_girl.jpg" },
  { id: "anime_shinkai_sunset.jpg", label: "Shinkai Twilight Train", tag: "Makoto Shinkai vibrant clouds & Tokyo sunset", style: "anime", url: "/backgrounds/anime_shinkai_sunset.jpg" },
  { id: "pixar_cozy_cabin.jpg", label: "Pixar Fireplace Cabin", tag: "3D animated cabin, hot cocoa & sleeping puppy", style: "pixar", url: "/backgrounds/pixar_cozy_cabin.jpg" },
  { id: "anime_ghibli_garden.jpg", label: "Ghibli Summer Porch", tag: "Hand-painted cottage garden, iced tea & butterflies", style: "anime", url: "/backgrounds/anime_ghibli_garden.jpg" },
  { id: "pixar_rooftop_stars.jpg", label: "Pixar Rooftop Stargazing", tag: "3D animated telescope, cozy scarf & starry night", style: "pixar", url: "/backgrounds/pixar_rooftop_stars.jpg" },
  { id: "lofi_rainy_cafe.jpg", label: "Cozy Rainy Cafe", tag: "Warm coffee cup with steam & Tokyo rain", style: "lofi", url: "/backgrounds/lofi_rainy_cafe.jpg" },
  { id: "lofi_tokyo_cyberpunk.jpg", label: "Tokyo Neon Alley", tag: "Rainy street, neon ramen bar & retro car", style: "lofi", url: "/backgrounds/lofi_tokyo_cyberpunk.jpg" },
  { id: "lofi_sunset_balcony.jpg", label: "Sunset Balcony", tag: "Golden hour sunset & vinyl record player", style: "lofi", url: "/backgrounds/lofi_sunset_balcony.jpg" },
  { id: "lofi_starlight_bedroom.jpg", label: "Starlight Galaxy", tag: "Celestial night sky, moon lamp & cozy bed", style: "lofi", url: "/backgrounds/lofi_starlight_bedroom.jpg" },
  { id: "lofi_slow_morning.jpg", label: "Sunny Morning Room", tag: "Warm morning sunlight & acoustic guitar", style: "lofi", url: "/backgrounds/lofi_slow_morning.jpg" },
];

function parseStyle(v) {
  const s = typeof v === "string" && v ? v : "lofi";
  if (!Object.hasOwn(STYLE_NAMES, s)) throw new Error("Unknown style");
  return s;
}

function parseAspectRatio(v) {
  return ["16:9", "9:16", "1:1"].includes(v) ? v : "16:9";
}

function getLayoutConfig(aspectRatio = "16:9") {
  if (aspectRatio === "9:16") {
    return {
      width: 720,
      height: 1280,
      waveHeight: 180,
      waveY: 1020,
      titleY: "380",
      titleSize: 42,
      subY: "450",
      subSize: 24,
      wmY: "h-text_h-30",
      wmX: "w-text_w-30",
      wmSize: 22,
    };
  }
  if (aspectRatio === "1:1") {
    return {
      width: 720,
      height: 720,
      waveHeight: 130,
      waveY: 550,
      titleY: "190",
      titleSize: 38,
      subY: "250",
      subSize: 22,
      wmY: "h-text_h-20",
      wmX: "w-text_w-20",
      wmSize: 20,
    };
  }
  // 16:9 default
  return {
    width: 1280,
    height: 720,
    waveHeight: 150,
    waveY: 530,
    titleY: "160",
    titleSize: 50,
    subY: "235",
    subSize: 26,
    wmY: "h-text_h-20",
    wmX: "w-text_w-20",
    wmSize: 24,
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

async function renderMp4(jobDir, { seconds, bg, title, sub, watermark, timed = [], style = "lofi", aspectRatio = "16:9" }) {
  await copyFile(FONT_SRC, path.join(jobDir, "font.ttf"));
  const layout = getLayoutConfig(aspectRatio);

  let inputs;
  let bgScale;
  const bgLabel = style === "lofi" ? "bg" : "bg0";

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
    // Subtle cinematic camera breath (Ken Burns zoompan) + analog film grain texture
    bgScale = `[0:v]scale=${layout.width}:${layout.height}:force_original_aspect_ratio=increase,crop=${layout.width}:${layout.height},zoompan=z='min(zoom+0.0003,1.06)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${layout.width}x${layout.height}:fps=30,noise=alls=9:allf=t+u[${bgLabel}]`;
  } else {
    inputs = ["-f", "lavfi", "-i", `gradients=s=${layout.width}x${layout.height}:c0=${bg.colors[0]}:c1=${bg.colors[1]}:speed=0.01:rate=30:duration=${seconds}`];
    bgScale = `[0:v]scale=${layout.width}:${layout.height}:force_original_aspect_ratio=increase,crop=${layout.width}:${layout.height},setsar=1,fps=30[${bgLabel}]`;
  }

  const chain = [
    bgScale,
    `[1:a]showwaves=s=${layout.width}x${layout.waveHeight}:mode=cline:colors=0xf59e0b@0.85:rate=30[w]`,
    `[bg][w]overlay=0:${layout.waveY}:format=auto[v0]`,
  ];
  if (style !== "lofi") chain.splice(1, 0, STYLE_FILTERS[style]);
  let last = "v0";
  const texts = [];
  if (title) {
    const cleanTitle = title.slice(0, 60);
    const dynamicSize = cleanTitle.length > 40 ? Math.round(layout.titleSize * 0.72) : cleanTitle.length > 25 ? Math.round(layout.titleSize * 0.85) : layout.titleSize;
    texts.push({ file: "title.txt", text: cleanTitle, size: dynamicSize, color: "white", y: layout.titleY, x: "(w-text_w)/2" });
  }
  if (sub) texts.push({ file: "sub.txt", text: sub, size: layout.subSize, color: "white@0.9", y: layout.subY, x: "(w-text_w)/2" });
  if (watermark) texts.push({ file: "wm.txt", text: watermark.slice(0, 60), size: layout.wmSize, color: "white@0.6", y: layout.wmY, x: layout.wmX });
  texts.push(...timed);

  for (const [i, t] of texts.entries()) {
    await writeFile(path.join(jobDir, t.file), t.text);
    const enable = t.enable ? `:enable='${t.enable}'` : "";
    chain.push(`[${last}]drawtext=fontfile=font.ttf:textfile=${t.file}:fontcolor=${t.color}:fontsize=${t.size}:x=${t.x}:y=${t.y}${enable}:box=1:boxcolor=black@0.4:boxborderw=6:shadowcolor=black@0.75:shadowx=2:shadowy=2[t${i}]`);
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
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "22",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "192k",
    "-movflags", "+faststart",
    "out.mp4",
  ];
  await runProcess(FFMPEG, args, jobDir);
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

async function generateFromMood({ prompt, seconds, style = "lofi", moodOverride, sceneOverride, gifUrl, videoUrl, aspectRatio = "16:9", watermark = "" }) {
  const mood = (moodOverride && MOODS[moodOverride]) ? moodOverride : pickMood(prompt);
  const m = MOODS[mood];

  const resolved = resolveScenePath(sceneOverride, m?.defaultBg);
  const bgFilename = resolved.filename;
  const localBgPath = resolved.fullPath;

  const { id, jobDir } = await newJob({
    prompt,
    mood,
    moodLabel: m.label,
    seconds,
    style,
    aspectRatio,
    title: prompt.slice(0, 60),
    sub: m.label,
    bgScene: bgFilename,
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

  // Synthesize authentic lofi hip hop audio with drums, rhodes chords and sub-bass
  renderWav(path.join(jobDir, "audio.wav"), { mood, seconds, seed: prompt + id });

  await renderMp4(jobDir, {
    seconds,
    bg,
    title: prompt.slice(0, 60),
    sub: m.label,
    watermark,
    style,
    aspectRatio,
  });

  const label = style === "lofi" ? m.label : `${STYLE_NAMES[style]} look, ${m.label}`;
  return { id, label, mood, bgScene: bgFilename };
}

async function generateFromYoutube({ youtubeUrl, seconds, gifUrl, videoUrl, sceneOverride, watermark, aspectRatio = "16:9" }) {
  const url = parseYoutubeUrl(youtubeUrl);
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

  await renderMp4(jobDir, { seconds, bg, title: null, sub: null, watermark: watermark || "", aspectRatio });
  return { id, label: "YouTube audio" };
}

async function generateSlides({ scenes, seconds, watermark, sceneOverride, aspectRatio = "16:9" }) {
  const lines = scenes.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 12);
  if (!lines.length) throw new Error("Add at least one scene line");
  const mood = pickMood(lines.join(" "));
  const m = MOODS[mood];

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
    size: 38,
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
  });

  return { id, label: `${lines.length} scene${lines.length > 1 ? "s" : ""}` };
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
    if (data.length > 10_000) throw new Error("Body too large");
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
    if (!prompt || prompt.length > 200) throw new Error("Prompt must be 1-200 characters");
    const seconds = clampSeconds(body.seconds);
    const style = parseStyle(body.style);
    const aspectRatio = parseAspectRatio(body.aspectRatio);
    const moodOverride = typeof body.mood === "string" ? body.mood : null;
    const sceneOverride = typeof body.scene === "string" ? body.scene : null;
    const gifUrl = typeof body.gifUrl === "string" && body.gifUrl.trim() ? body.gifUrl.trim() : null;
    const videoUrl = typeof body.videoUrl === "string" && body.videoUrl.trim() ? body.videoUrl.trim() : null;
    const watermark = typeof body.watermark === "string" ? body.watermark.trim().slice(0, 60) : "";

    const r = await generateFromMood({ prompt, seconds, style, moodOverride, sceneOverride, gifUrl, videoUrl, aspectRatio, watermark });
    return {
      id: r.id,
      moodLabel: r.label,
      mood: r.mood,
      bgScene: r.bgScene,
      url: `/outputs/${r.id}/out.mp4`,
      audioUrl: `/outputs/${r.id}/audio.wav`,
      aspectRatio,
    };
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

    const r = await generateFromYoutube({ youtubeUrl: body.youtubeUrl.trim(), seconds, gifUrl, videoUrl, sceneOverride, watermark, aspectRatio });
    return {
      id: r.id,
      moodLabel: r.label,
      url: `/outputs/${r.id}/out.mp4`,
      audioUrl: `/outputs/${r.id}/audio.wav`,
      aspectRatio,
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

    const r = await generateSlides({ scenes, seconds, watermark, sceneOverride, aspectRatio });
    return {
      id: r.id,
      moodLabel: r.label,
      url: `/outputs/${r.id}/out.mp4`,
      audioUrl: `/outputs/${r.id}/audio.wav`,
      aspectRatio,
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

function handleMoods(req, res) {
  const moods = Object.entries(MOODS).map(([key, val]) => ({
    id: key,
    label: val.label,
    bpm: val.bpm,
    tag: val.tag || "",
    colors: val.colors,
    defaultBg: val.defaultBg,
  }));
  sendJson(res, 200, { moods, scenes: SCENES });
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
  if (req.method === "GET" && url.pathname === "/api/scenes") return sendJson(res, 200, { scenes: SCENES });
  if (req.method === "GET" && url.pathname === "/api/references") return handleReferences(req, res, url);
  if (req.method === "GET" && url.pathname === "/api/stock-videos") return handleStockVideos(req, res);

  if (req.method === "POST" && url.pathname === "/api/generate") return handleGenerate(req, res);
  if (req.method === "POST" && url.pathname === "/api/from-youtube") return handleFromYoutube(req, res);
  if (req.method === "POST" && url.pathname === "/api/publish") return handlePublish(req, res);
  if (req.method === "POST" && url.pathname === "/api/slides") return handleSlides(req, res);
  if (req.method === "POST" && url.pathname === "/api/trim-silence") return handleTrimSilence(req, res);

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
