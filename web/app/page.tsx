"use client";

import { useState, useEffect, useRef } from "react";
import { ThemeToggle } from "./theme-toggle";
import { ambientSound } from "./ambient-audio";

type ToolId = "lofi-prompt" | "lofi-youtube" | "slides" | "trim";
type Style = "lofi" | "anime" | "pixar";
type AspectRatio = "16:9" | "9:16" | "1:1";

type MoodInfo = {
  id: string;
  label: string;
  bpm: number;
  tag: string;
  colors: string[];
};

type SceneInfo = {
  id: string;
  label: string;
  tag: string;
  style?: string;
  url: string;
};

export type ReferenceItem = {
  id: string;
  title: string;
  category: "lofi" | "anime" | "pixar";
  filename: string;
  path: string;
  style: Style;
  mood: string;
  tags: string[];
  source: string;
};

type Result = {
  id: string;
  url: string;
  audioUrl?: string;
  moodLabel?: string;
  mood?: string;
  bgScene?: string;
  removedSeconds?: number;
  aspectRatio?: AspectRatio;
  title?: string;
  sub?: string;
  seconds?: number;
  createdAt?: number;
  size?: number;
  style?: string;
};

const STYLES: { id: Style; name: string; desc: string }[] = [
  { id: "lofi", name: "Lofi Tape", desc: "Warm harmonic gradient, clean waveform & analog vinyl glow." },
  { id: "anime", name: "Anime Cel", desc: "Vibrant Makoto Shinkai/Ghibli anime colors, high sharpness & cel lines." },
  { id: "pixar", name: "Pixar Bloom", desc: "Volumetric 3D lighting, warm golden bloom & cinematic depth of field." },
];

const PRESETS = [
  { label: "Shinkai Twilight", prompt: "Makoto Shinkai anime twilight train window with radiant sunset clouds", mood: "shinkai_anime", style: "anime" as Style, scene: "anime_shinkai_sunset.jpg", seconds: 60 },
  { label: "Pixar Fireplace", prompt: "Pixar 3D animated cozy winter cabin with hot cocoa and sleeping puppy", mood: "pixar_cozy", style: "pixar" as Style, scene: "pixar_cozy_cabin.jpg", seconds: 60 },
  { label: "Ghibli Garden", prompt: "Studio Ghibli country cottage porch overlooking sunlit summer garden", mood: "ghibli_garden", style: "anime" as Style, scene: "anime_ghibli_garden.jpg", seconds: 60 },
  { label: "Pixar Stargazing", prompt: "Pixar 3D animated rooftop with vintage telescope and fluffy white cat", mood: "dreamy", style: "pixar" as Style, scene: "pixar_rooftop_stars.jpg", seconds: 60 },
  { label: "Rainy Study", prompt: "Rainy night study session with warm amber lamp light", mood: "night", style: "lofi" as Style, scene: "lofi_study_girl.jpg", seconds: 60 },
  { label: "Cozy Cafe", prompt: "Cozy bookstore cafe with warm espresso and soft rain on glass", mood: "lofi_cafe", style: "lofi" as Style, scene: "lofi_rainy_cafe.jpg", seconds: 60 },
  { label: "Midnight Tokyo", prompt: "Rainy midnight Tokyo ramen bar with neon sign reflections", mood: "cyberpunk", style: "lofi" as Style, scene: "lofi_tokyo_cyberpunk.jpg", seconds: 60 },
  { label: "Golden Sunset", prompt: "Golden hour sunset walk with gentle warm breeze and nostalgic clouds", mood: "sunset", style: "lofi" as Style, scene: "lofi_sunset_balcony.jpg", seconds: 45 },
];

const GIF_PRESETS = [
  { name: "Anime Girl Study", url: "https://media.giphy.com/media/3o7aD2saalBwwftBIY/giphy.gif" },
  { name: "Pixel Rain Window", url: "https://media.giphy.com/media/13HgwGsXF0aiGY/giphy.gif" },
  { name: "Tokyo Night Drive", url: "https://media.giphy.com/media/l0HlFTxM28m5xZtDy/giphy.gif" },
];

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data as T;
}

export default function Home() {
  const [tool, setTool] = useState<ToolId>("lofi-prompt");
  const [prompt, setPrompt] = useState("Rainy night study session with warm amber lamp light");
  const [mood, setMood] = useState<string>("night");
  const [moods, setMoods] = useState<MoodInfo[]>([]);
  const [scenesList, setScenesList] = useState<SceneInfo[]>([
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
  ]);
  const [selectedScene, setSelectedScene] = useState<string>("lofi_study_girl.jpg");
  const [previewMode, setPreviewMode] = useState<boolean>(true);

  // Curated 300 Reference Images Repository State (100 Lofi, 100 Anime, 100 Pixar) + Stock Video Loops
  const [referenceRepo, setReferenceRepo] = useState<ReferenceItem[]>([]);
  const [stockVideos, setStockVideos] = useState<any[]>([]);
  const [refRepoOpen, setRefRepoOpen] = useState(false);
  const [refCategory, setRefCategory] = useState<"all" | "lofi" | "anime" | "pixar" | "videos">("all");
  const [refSearch, setRefSearch] = useState("");
  const [selectedRef, setSelectedRef] = useState<ReferenceItem | null>(null);
  const [refCounts, setRefCounts] = useState({ total: 300, lofi: 100, anime: 100, pixar: 100 });
  
  // Custom Still Image Living Animator State
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [customImageDataUrl, setCustomImageDataUrl] = useState<string | null>(null);
  const [customImageUrl, setCustomImageUrl] = useState("");
  const [customImageLabel, setCustomImageLabel] = useState("My Living Artwork");
  const [customAnimStyle, setCustomAnimStyle] = useState<Style>("lofi");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [liveAnimatorEnabled, setLiveAnimatorEnabled] = useState(true);
  const animatorCanvasRef = useRef<HTMLCanvasElement>(null);

  const [ytUrl, setYtUrl] = useState("");
  const [gifUrl, setGifUrl] = useState("");
  const [customVideoUrl, setCustomVideoUrl] = useState("");
  const [scenes, setScenes] = useState("Rainy night\nWarm lamp light\nStudy with me\nGentle thoughts");
  const [seconds, setSeconds] = useState(60);
  const [watermark, setWatermark] = useState("");
  const [style, setStyle] = useState<Style>("lofi");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");

  // Status & Results
  const [busy, setBusy] = useState(false);
  const [renderStep, setRenderStep] = useState(0);
  const [status, setStatus] = useState<{ kind: "idle" | "ok" | "error"; text: string }>({ kind: "idle", text: "" });
  const [result, setResult] = useState<Result | null>(null);

  // History / Vault
  const [history, setHistory] = useState<Result[]>([]);
  const [vaultOpen, setVaultOpen] = useState(false);

  // Publishing
  const [title, setTitle] = useState("Lofi Study Mix");
  const [desc, setDesc] = useState("Relaxing atmospheric lofi beats generated with Lofi Studio.");
  const [privacy, setPrivacy] = useState<"private" | "unlisted" | "public">("private");
  const [pubBusy, setPubBusy] = useState<null | "youtube" | "instagram">(null);
  const [pubStatus, setPubStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [publishTab, setPublishTab] = useState<"youtube" | "instagram">("youtube");

  // Ambient Sound Engine state
  const [ambientPlaying, setAmbientPlaying] = useState(false);
  const [ambientExpanded, setAmbientExpanded] = useState(false);
  const [masterVol, setMasterVol] = useState(50);
  const [vinylVol, setVinylVol] = useState(40);
  const [rainVol, setRainVol] = useState(35);
  const [hissVol, setHissVol] = useState(15);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Load available moods, scenes, 300 references, and previous renders history
  useEffect(() => {
    fetch("/api/moods")
      .then((r) => r.json())
      .then((data) => {
        if (data.moods && Array.isArray(data.moods)) {
          setMoods(data.moods);
        }
      })
      .catch(() => {});

    fetch("/api/scenes")
      .then((r) => r.json())
      .then((data) => {
        if (data.scenes && Array.isArray(data.scenes)) {
          setScenesList(data.scenes);
        }
      })
      .catch(() => {});

    fetch("/api/references?limit=300")
      .then((r) => r.json())
      .then((data) => {
        if (data.items && Array.isArray(data.items)) {
          setReferenceRepo(data.items);
          if (data.counts) setRefCounts(data.counts);
        }
      })
      .catch(() => {});

    fetch("/api/stock-videos")
      .then((r) => r.json())
      .then((data) => {
        if (data.items && Array.isArray(data.items)) {
          setStockVideos(data.items);
        }
      })
      .catch(() => {});

    loadHistory();
  }, []);

  function selectReferenceAsset(item: ReferenceItem) {
    setSelectedRef(item);
    setSelectedScene(item.path);
    if (item.style) {
      setStyle(item.style);
    }
    if (item.mood && moods.some((m) => m.id === item.mood)) {
      setMood(item.mood);
    }
    setPreviewMode(true);
    setStatus({
      kind: "ok",
      text: `Loaded reference asset: "${item.title}" (${item.category.toUpperCase()}) as video scene!`,
    });
  }

  function loadHistory() {
    fetch("/api/history")
      .then((r) => r.json())
      .then((data) => {
        if (data.items && Array.isArray(data.items)) {
          setHistory(data.items);
          if (data.items.length > 0 && !result) {
            setResult(data.items[0]);
          }
        }
      })
      .catch(() => {});
  }

  // Real-time Canvas Particle Animation Engine (LoFi Rain, Anime Petals/Fireflies, Pixar Embers)
  useEffect(() => {
    if (!liveAnimatorEnabled) return;
    const canvas = animatorCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 640);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 360);

    const onResize = () => {
      if (canvas.parentElement) {
        width = canvas.width = canvas.parentElement.clientWidth;
        height = canvas.height = canvas.parentElement.clientHeight;
      }
    };
    window.addEventListener("resize", onResize);

    const particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number }[] = [];
    const count = style === "lofi" ? 45 : style === "anime" ? 35 : 25;
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: style === "anime" ? (Math.random() - 0.25) * 1.6 : (Math.random() - 0.5) * 0.4,
        vy: style === "lofi" ? 3.5 + Math.random() * 4 : style === "pixar" ? -0.8 - Math.random() * 1.2 : 0.8 + Math.random() * 1.5,
        size: style === "lofi" ? 1.5 : style === "pixar" ? 2.5 + Math.random() * 3 : 2 + Math.random() * 2.5,
        alpha: 0.35 + Math.random() * 0.6,
      });
    }

    let time = 0;
    const render = () => {
      time += 0.02;
      ctx.clearRect(0, 0, width, height);

      if (style === "lofi") {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
        ctx.lineWidth = 1.2;
        for (const p of particles) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - 1, p.y + p.vy * 2.5);
          ctx.stroke();
          p.y += p.vy;
          p.x -= 0.4;
          if (p.y > height) { p.y = -10; p.x = Math.random() * width; }
          if (p.x < 0) p.x = width;
        }
      } else if (style === "anime") {
        for (const p of particles) {
          ctx.save();
          ctx.globalAlpha = p.alpha * (0.6 + 0.4 * Math.sin(time + p.x));
          ctx.fillStyle = p.vy < 1.2 ? "rgba(244, 114, 182, 0.85)" : "rgba(56, 189, 248, 0.9)";
          ctx.shadowColor = ctx.fillStyle;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          p.x += p.vx + Math.sin(time + p.y * 0.01) * 0.5;
          p.y += p.vy;
          if (p.y > height) { p.y = -10; p.x = Math.random() * width; }
          if (p.x > width) p.x = 0;
          if (p.x < 0) p.x = width;
        }
      } else if (style === "pixar") {
        for (const p of particles) {
          ctx.save();
          ctx.globalAlpha = p.alpha * (0.5 + 0.5 * Math.sin(time * 2 + p.y));
          ctx.fillStyle = "rgba(245, 158, 11, 0.85)";
          ctx.shadowColor = "rgba(251, 191, 36, 0.9)";
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          p.y += p.vy;
          p.x += Math.sin(time + p.y * 0.02) * 0.7;
          if (p.y < -10) { p.y = height + 10; p.x = Math.random() * width; }
          if (p.x > width) p.x = 0;
          if (p.x < 0) p.x = width;
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
    };
  }, [liveAnimatorEnabled, style]);

  const handleUploadAndAnimate = async () => {
    try {
      setUploadingImage(true);
      const payload: any = { style: customAnimStyle, label: customImageLabel || "Custom Living Artwork" };
      if (customImageDataUrl) {
        payload.dataUrl = customImageDataUrl;
      } else if (customImageUrl) {
        payload.imageUrl = customImageUrl;
      } else {
        alert("Please select an image file or enter an image URL.");
        setUploadingImage(false);
        return;
      }

      const res = await fetch("/api/upload-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload image");

      setSelectedScene(data.filename);
      setStyle(customAnimStyle);
      setLiveAnimatorEnabled(true);
      setPreviewMode(true);
      setUploadModalOpen(false);
      setStatus({ kind: "ok", text: `Custom image activated as living ${customAnimStyle.toUpperCase()} scene!` });
    } catch (err: any) {
      alert("Error activating image: " + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle ambient audio
  function toggleAmbient() {
    if (!ambientSound) return;
    const playing = ambientSound.toggle();
    setAmbientPlaying(playing);
  }

  function handleMasterVol(v: number) {
    setMasterVol(v);
    ambientSound?.setMasterVolume(v / 100);
  }

  function handleVinylVol(v: number) {
    setVinylVol(v);
    ambientSound?.setVinylVolume(v / 100);
  }

  function handleRainVol(v: number) {
    setRainVol(v);
    ambientSound?.setRainVolume(v / 100);
  }

  function handleHissVol(v: number) {
    setHissVol(v);
    ambientSound?.setHissVolume(v / 100);
  }

  // Preset chip selection
  function applyPreset(p: (typeof PRESETS)[0]) {
    setPrompt(p.prompt);
    setMood(p.mood);
    if (p.scene) setSelectedScene(p.scene);
    if (p.style) setStyle(p.style);
    setSeconds(p.seconds);
    setTitle(p.label + " Lofi Mix");
  }

  // Mood selection with automatic scene & style matching
  function selectMood(mId: string) {
    setMood(mId);
    const moodSceneMap: Record<string, { scene: string; style?: Style }> = {
      shinkai_anime: { scene: "anime_shinkai_sunset.jpg", style: "anime" },
      pixar_cozy: { scene: "pixar_cozy_cabin.jpg", style: "pixar" },
      ghibli_garden: { scene: "anime_ghibli_garden.jpg", style: "anime" },
      night: { scene: "lofi_study_girl.jpg", style: "lofi" },
      sunset: { scene: "lofi_sunset_balcony.jpg", style: "lofi" },
      morning: { scene: "lofi_slow_morning.jpg", style: "lofi" },
      lofi_cafe: { scene: "lofi_rainy_cafe.jpg", style: "lofi" },
      cyberpunk: { scene: "lofi_tokyo_cyberpunk.jpg", style: "lofi" },
      dreamy: { scene: "lofi_starlight_bedroom.jpg", style: "lofi" },
      autumn: { scene: "lofi_sunset_balcony.jpg", style: "lofi" },
    };
    if (moodSceneMap[mId]) {
      setSelectedScene(moodSceneMap[mId].scene);
      if (moodSceneMap[mId].style) setStyle(moodSceneMap[mId].style!);
    }
  }

  // Visual style selection with smart artwork pairing
  function handleStyleSelect(sId: Style) {
    setStyle(sId);
    if (sId === "anime" && !selectedScene.startsWith("anime_")) {
      setSelectedScene("anime_shinkai_sunset.jpg");
    } else if (sId === "pixar" && !selectedScene.startsWith("pixar_")) {
      setSelectedScene("pixar_cozy_cabin.jpg");
    } else if (sId === "lofi" && (selectedScene.startsWith("anime_") || selectedScene.startsWith("pixar_"))) {
      setSelectedScene("lofi_study_girl.jpg");
    }
  }

  // Format seconds to MM:SS
  function formatDuration(sec: number) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  }

  // Generate action
  async function generate() {
    setBusy(true);
    setRenderStep(1);
    setPubStatus(null);
    setStatus({
      kind: "idle",
      text: "Synthesizing chord progressions and audio layers...",
    });

    // Step simulation for UX feedback
    const t1 = setTimeout(() => setRenderStep(2), 2500);
    const t2 = setTimeout(() => setRenderStep(3), 6000);
    const t3 = setTimeout(() => setRenderStep(4), 11000);

    try {
      let data: Result;
      if (tool === "lofi-youtube") {
        if (!ytUrl.trim()) throw new Error("Please enter a valid YouTube URL.");
        data = await postJson("/api/from-youtube", {
          youtubeUrl: ytUrl.trim(),
          gifUrl: gifUrl.trim(),
          scene: selectedScene,
          seconds,
          watermark: watermark.trim(),
          aspectRatio,
        });
        setStatus({ kind: "ok", text: "Rendered audio and video from YouTube source!" });
      } else if (tool === "slides") {
        if (!scenes.trim()) throw new Error("Add at least one scene line.");
        data = await postJson("/api/slides", {
          scenes,
          seconds,
          scene: selectedScene,
          watermark: watermark.trim(),
          aspectRatio,
        });
        setStatus({ kind: "ok", text: `Rendered ${data.moodLabel} story slides!` });
      } else if (tool === "trim") {
        if (!result) throw new Error("Select or render a video first, then trim it.");
        const trimmed = await postJson<Result>("/api/trim-silence", { jobId: result.id });
        setResult(trimmed);
        setStatus({ kind: "ok", text: `Trimmed! Removed ${(trimmed.removedSeconds ?? 0).toFixed(1)}s of silent gaps.` });
        loadHistory();
        return;
      } else {
        if (!prompt.trim()) throw new Error("Enter a prompt describing your lofi mood.");
        data = await postJson("/api/generate", {
          prompt: prompt.trim(),
          seconds,
          style,
          mood,
          scene: selectedScene,
          aspectRatio,
          watermark: watermark.trim(),
        });
        setStatus({ kind: "ok", text: `Rendered with ${data.moodLabel} palette!` });
      }
      setResult(data);
      setPreviewMode(false);
      loadHistory();
    } catch (err) {
      setStatus({ kind: "error", text: err instanceof Error ? err.message : "Generation failed." });
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      setBusy(false);
      setRenderStep(0);
    }
  }

  // Publish to social media
  async function publish(target: "youtube" | "instagram") {
    if (!result) return;
    setPubBusy(target);
    setPubStatus(null);
    try {
      const data = await postJson<{ url?: string; id?: string }>("/api/publish", {
        jobId: result.id,
        target,
        title: title.trim(),
        description: desc.trim(),
        privacy,
      });
      setPubStatus({ kind: "ok", text: data.url ? `Successfully published: ${data.url}` : `Published (ID: ${data.id})` });
    } catch (err) {
      setPubStatus({ kind: "error", text: err instanceof Error ? err.message : "Publish failed. Check API credentials on server." });
    } finally {
      setPubBusy(null);
    }
  }

  const isReferenceScene =
    selectedScene.startsWith("/reference_repo/") ||
    selectedScene.startsWith("reference_repo/") ||
    selectedScene.startsWith("/stock_videos/") ||
    selectedScene.startsWith("stock_videos/");
  const sceneImgSrc = isReferenceScene
    ? (selectedScene.startsWith("/") ? selectedScene : `/${selectedScene}`)
    : `/backgrounds/${selectedScene}`;
  const isVideoScene = sceneImgSrc.toLowerCase().endsWith(".mp4") || sceneImgSrc.toLowerCase().endsWith(".webm");
  const activeStockVid = stockVideos.find(
    (v) => v.path === selectedScene || v.path === "/" + selectedScene.replace(/^\/+/, "")
  );
  const activeRef = referenceRepo.find(
    (r) => r.path === selectedScene || r.path === "/" + selectedScene.replace(/^\/+/, "")
  );
  const activeSceneLabel = activeStockVid
    ? activeStockVid.title
    : (activeRef ? activeRef.title : (scenesList.find((s) => s.id === selectedScene)?.label || "Anime Study Desk"));
  const activeSceneTag = activeStockVid
    ? `STOCK VIDEO LOOP • ${activeStockVid.style} • ${(activeStockVid.tags || []).join(", ")}`
    : (activeRef
      ? `${activeRef.category.toUpperCase()} Reference • ${activeRef.style} • ${(activeRef.tags || []).join(", ")}`
      : (scenesList.find((s) => s.id === selectedScene)?.tag || "Living aesthetic artwork with Ken Burns motion & reactive audio waveform"));

  const displayedItems = refCategory === "videos" ? stockVideos : referenceRepo;
  const filteredReferences = displayedItems.filter((item) => {
    if (refCategory !== "all" && refCategory !== "videos" && item.category !== refCategory) return false;
    if (refSearch.trim()) {
      const q = refSearch.toLowerCase();
      const matchTitle = item.title?.toLowerCase().includes(q);
      const matchMood = item.mood?.toLowerCase().includes(q);
      const matchStyle = item.style?.toLowerCase().includes(q);
      const matchTags = item.tags?.some((t: string) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchMood && !matchStyle && !matchTags) return false;
    }
    return true;
  });

  return (
    <>
      {/* Top Navbar with Studio Ambience Controls */}
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 18V5l12-2v13" stroke="currentColor" strokeWidth="2.5" fill="none" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </div>
          <div>
            <span>Lofi Studio</span>
            <span className="brand-badge" style={{ marginLeft: "0.5rem" }}>
              v2.0 PRO
            </span>
          </div>
        </div>

        <div className="topbar-actions">
          {/* Ambient Sound Toggle Button */}
          <button
            type="button"
            className={`action-btn ${ambientPlaying ? "primary" : ""}`}
            style={{ padding: "0.45rem 0.85rem", fontSize: "0.82rem", minWidth: "auto" }}
            onClick={() => setAmbientExpanded(!ambientExpanded)}
            title="Procedural Ambient Background Mixer (Vinyl & Rain)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20M17 5v14M7 8v8M22 10v4M2 10v4" />
            </svg>
            <span>Ambience {ambientPlaying ? "(On)" : ""}</span>
          </button>

          {/* Reference Library Drawer Button */}
          <button
            type="button"
            className="action-btn"
            style={{ padding: "0.45rem 0.85rem", fontSize: "0.82rem", minWidth: "auto", border: "1px solid var(--accent)", color: "var(--accent)" }}
            onClick={() => setRefRepoOpen(true)}
            title="Browse curated 300 reference images repository (100 Lofi, 100 Anime, 100 Pixar)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="2" width="20" height="20" rx="4" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span>Reference Repo ({refCounts.total})</span>
          </button>

          {/* History / Vault Drawer Button */}
          <button
            type="button"
            className="action-btn"
            style={{ padding: "0.45rem 0.85rem", fontSize: "0.82rem", minWidth: "auto" }}
            onClick={() => setVaultOpen(true)}
            title="Browse previously rendered lofi tracks"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>Vault ({history.length})</span>
          </button>

          <ThemeToggle />
        </div>
      </header>

      {/* Floating Ambient Sound Mixer Drawer */}
      {ambientExpanded && (
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0.5rem clamp(1rem, 3vw, 2rem)" }}>
          <div className="ambient-mixer">
            <div className="ambient-header">
              <div className="ambient-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <span>Procedural Analog Ambience Mixer</span>
                <span className="field-hint">(Synthesized in-browser, no streaming bandwidth)</span>
              </div>
              <button
                type="button"
                className={`ambient-toggle-btn ${ambientPlaying ? "active" : ""}`}
                onClick={toggleAmbient}
              >
                {ambientPlaying ? "Pause Ambience" : "Play Ambience"}
              </button>
            </div>

            <div className="ambient-sliders">
              <div className="ambient-slider-item">
                <label>Master Volume ({masterVol}%)</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={masterVol}
                  onChange={(e) => handleMasterVol(Number(e.target.value))}
                />
              </div>
              <div className="ambient-slider-item">
                <label>Vinyl Crackle ({vinylVol}%)</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={vinylVol}
                  onChange={(e) => handleVinylVol(Number(e.target.value))}
                />
              </div>
              <div className="ambient-slider-item">
                <label>Gentle Rain ({rainVol}%)</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={rainVol}
                  onChange={(e) => handleRainVol(Number(e.target.value))}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Studio Workstation Layout */}
      <main className="studio-container">
        {/* Left Column: Creator Station */}
        <section className="studio-panel" aria-labelledby="creator-title">
          <div className="studio-panel-header">
            <div>
              <h1 id="creator-title" className="studio-title">
                Lofi Creator Studio
              </h1>
              <p className="studio-subtitle">
                Synthesize warm Rhodes chord progressions, composite aesthetic visual loops, and publish in seconds.
              </p>
            </div>
          </div>

          {/* Mode Tabs */}
          <div className="mode-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tool === "lofi-prompt"}
              className={`mode-tab-btn ${tool === "lofi-prompt" ? "active" : ""}`}
              onClick={() => setTool("lofi-prompt")}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3v18M3 12h18M8 8l8 8M16 8l-8 8" />
              </svg>
              <span>AI Lofi Maker</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tool === "lofi-youtube"}
              className={`mode-tab-btn ${tool === "lofi-youtube" ? "active" : ""}`}
              onClick={() => setTool("lofi-youtube")}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              <span>YouTube Remix</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tool === "slides"}
              className={`mode-tab-btn ${tool === "slides" ? "active" : ""}`}
              onClick={() => setTool("slides")}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              <span>Lyric Slides</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tool === "trim"}
              className={`mode-tab-btn ${tool === "trim" ? "active" : ""}`}
              onClick={() => setTool("trim")}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="6" cy="6" r="3" />
                <circle cx="6" cy="18" r="3" />
                <line x1="20" y1="4" x2="8.12" y2="15.88" />
                <line x1="14.47" y1="14.48" x2="20" y2="20" />
                <line x1="8.12" y1="8.12" x2="12" y2="12" />
              </svg>
              <span>Trim Pauses</span>
            </button>
          </div>

          {/* Tool 1: AI Prompt Lofi Generation */}
          {tool === "lofi-prompt" && (
            <>
              {/* Inspiration Chips */}
              <div className="presets-section">
                <span className="section-label">Quick Aesthetic Inspirations</span>
                <div className="chips-row">
                  {PRESETS.map((p) => (
                    <button
                      type="button"
                      key={p.label}
                      className="preset-chip"
                      onClick={() => applyPreset(p)}
                    >
                      <span>✨</span>
                      <span>{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Prompt Textarea */}
              <div className="field">
                <label htmlFor="prompt">
                  <span>Prompt Description</span>
                  <span className="field-hint">{prompt.length}/200</span>
                </label>
                <textarea
                  id="prompt"
                  value={prompt}
                  maxLength={200}
                  placeholder="e.g. rainy night study session with warm lamp light"
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </div>

              {/* Harmonic Mood Selector */}
              <div className="field">
                <label>
                  <span>Harmonic Mood & Chords</span>
                  <span className="field-hint">Select chord voicing & tempo</span>
                </label>
                <div className="mood-grid">
                  {moods.map((m) => (
                    <div
                      key={m.id}
                      className={`mood-card ${mood === m.id ? "active" : ""}`}
                      onClick={() => selectMood(m.id)}
                    >
                      <div
                        className="mood-color-strip"
                        style={{
                          background: `linear-gradient(90deg, #${m.colors[0].replace("0x", "")}, #${m.colors[1].replace("0x", "")})`,
                        }}
                      />
                      <div className="mood-header">
                        <span className="mood-name">{m.label}</span>
                        <span className="mood-bpm">{m.bpm} BPM</span>
                      </div>
                      <span className="mood-tag">{m.tag}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Living Animated Lofi Artwork Scene Selector */}
              <div className="field">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem", flexWrap: "wrap", gap: "0.5rem" }}>
                  <label style={{ margin: 0 }}>
                    <span>Living Animated Scene Artwork</span>
                    <span className="field-hint">Dynamic Ken Burns camera motion & analog tape shimmer</span>
                  </label>
                  <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="preset-chip"
                      style={{
                        background: "linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(168, 85, 247, 0.25))",
                        border: "1px solid var(--accent)",
                        color: "var(--text)",
                        fontWeight: 600,
                        padding: "0.35rem 0.75rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.45rem",
                      }}
                      onClick={() => setRefRepoOpen(true)}
                    >
                      <span>📚 Reference Library ({refCounts.total})</span>
                    </button>
                    <button
                      type="button"
                      className="preset-chip"
                      style={{
                        background: "linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(59, 130, 246, 0.25))",
                        border: "1px solid var(--success)",
                        color: "var(--text)",
                        fontWeight: 600,
                        padding: "0.35rem 0.75rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.45rem",
                      }}
                      onClick={() => setUploadModalOpen(true)}
                    >
                      <span>🖼️ Animate Custom Image</span>
                      <span style={{ fontSize: "0.7rem", opacity: 0.85 }}>[Lofi / Anime / Pixar]</span>
                    </button>
                  </div>
                </div>

                {/* Active Reference Asset Banner (if user selected one from the 300-repo) */}
                {isReferenceScene && activeRef && (
                  <div className="ref-hero-banner">
                    <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", overflow: "hidden" }}>
                      <img
                        src={activeRef.path}
                        alt={activeRef.title}
                        style={{ width: 56, height: 40, objectFit: "cover", borderRadius: 8, flexShrink: 0, border: "1px solid rgba(255,255,255,0.2)" }}
                      />
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", overflow: "hidden" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{ fontWeight: 700, fontSize: "0.92rem", color: "#fff", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                            {activeRef.title}
                          </span>
                          <span className={`ref-category-badge ${activeRef.category}`} style={{ position: "static" }}>
                            {activeRef.category.toUpperCase()}
                          </span>
                        </div>
                        <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
                          Active Reference Asset for Generation • Mood: {activeRef.mood} • Style: {activeRef.style}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
                      <button
                        type="button"
                        className="preset-chip"
                        style={{ fontSize: "0.75rem" }}
                        onClick={() => setRefRepoOpen(true)}
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        className="preset-chip"
                        style={{ fontSize: "0.75rem" }}
                        onClick={() => {
                          setSelectedScene("lofi_study_girl.jpg");
                          setSelectedRef(null);
                        }}
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                )}

                <div className="scene-grid">
                  {scenesList.map((sc) => (
                    <div
                      key={sc.id}
                      className={`scene-card ${selectedScene === sc.id ? "active" : ""}`}
                      onClick={() => {
                        setSelectedScene(sc.id);
                        setPreviewMode(true);
                      }}
                      title={sc.tag}
                    >
                      <img
                        src={sc.url}
                        alt={sc.label}
                        className="scene-thumb"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/backgrounds/lofi_study_girl.jpg";
                        }}
                      />
                      <div className="scene-info">
                        <div className="scene-title-row">
                          <span className="scene-name">{sc.label}</span>
                          {selectedScene === sc.id && <span className="scene-live-badge">Live</span>}
                        </div>
                        <span className="scene-tag">{sc.tag}</span>
                        {sc.style && (
                          <span className={`scene-style-tag ${sc.style}`}>
                            {sc.style === "anime" ? "Anime" : sc.style === "pixar" ? "Pixar 3D" : "Lofi"}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Visual Look & Filter */}
              <div className="field">
                <label>
                  <span>Visual Look & Filter Grade</span>
                </label>
                <div className="style-grid">
                  {STYLES.map((s) => (
                    <div
                      key={s.id}
                      className={`style-card ${style === s.id ? "active" : ""}`}
                      onClick={() => handleStyleSelect(s.id)}
                    >
                      <span className="style-name">{s.name}</span>
                      <span className="style-desc">{s.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Tool 2: YouTube Audio Remix */}
          {tool === "lofi-youtube" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="field">
                <label htmlFor="ytUrl">YouTube Song URL</label>
                <input
                  id="ytUrl"
                  type="url"
                  value={ytUrl}
                  placeholder="https://www.youtube.com/watch?v=..."
                  onChange={(e) => setYtUrl(e.target.value)}
                />
                <span className="field-hint">Extracts and converts the song audio to warm lofi WAV format.</span>
              </div>

              <div className="field">
                <label htmlFor="gifUrl">Looping Background GIF (Optional)</label>
                <input
                  id="gifUrl"
                  type="url"
                  value={gifUrl}
                  placeholder="https://media.giphy.com/media/.../giphy.gif"
                  onChange={(e) => setGifUrl(e.target.value)}
                />
                <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.4rem", flexWrap: "wrap" }}>
                  <span className="field-hint" style={{ marginRight: "0.4rem" }}>Presets:</span>
                  {GIF_PRESETS.map((g) => (
                    <button
                      type="button"
                      key={g.name}
                      className="preset-chip"
                      style={{ padding: "0.2rem 0.6rem", fontSize: "0.76rem" }}
                      onClick={() => setGifUrl(g.url)}
                    >
                      {g.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tool 3: Story Slides */}
          {tool === "slides" && (
            <div className="field">
              <label htmlFor="scenes">
                <span>Story & Lyric Scenes</span>
                <span className="field-hint">
                  {scenes.split("\n").filter(Boolean).length} lines • {(seconds / Math.max(1, scenes.split("\n").filter(Boolean).length)).toFixed(1)}s per scene
                </span>
              </label>
              <textarea
                id="scenes"
                value={scenes}
                style={{ minHeight: 140 }}
                placeholder={"Midnight coffee\nRain drops tapping window\nDeep focus session\nLofi peace"}
                onChange={(e) => setScenes(e.target.value)}
              />
              <span className="field-hint">
                Each scene line is displayed as a clean centered subtitle in sequence over the generated music.
              </span>
            </div>
          )}

          {/* Tool 4: Trim Pauses */}
          {tool === "trim" && (
            <div style={{ padding: "1rem", background: "var(--surface-card)", borderRadius: 14, border: "1px solid var(--border)" }}>
              <h3 style={{ fontSize: "1rem", marginBottom: "0.4rem" }}>Silence Detection & Pause Cutter</h3>
              <p className="field-hint" style={{ lineHeight: 1.5 }}>
                {result ? (
                  <>
                    Currently targeting video: <strong>#{result.id}</strong> ({result.title || "Lofi Render"}).
                    Removes long pauses and silence gaps greater than 0.6s to create a tight, uninterrupted mix.
                  </>
                ) : (
                  "Select a track from the Vault or generate a video first to trim silent pauses."
                )}
              </p>
            </div>
          )}

          {/* Universal Settings (Aspect Ratio & Duration) */}
          {tool !== "trim" && (
            <>
              {/* Aspect Ratio Selector */}
              <div className="field">
                <label>Aspect Ratio & Format</label>
                <div className="ratio-options">
                  <button
                    type="button"
                    className={`ratio-btn ${aspectRatio === "16:9" ? "active" : ""}`}
                    onClick={() => setAspectRatio("16:9")}
                  >
                    <span>📺 16:9 Landscape</span>
                  </button>
                  <button
                    type="button"
                    className={`ratio-btn ${aspectRatio === "9:16" ? "active" : ""}`}
                    onClick={() => setAspectRatio("9:16")}
                  >
                    <span>📱 9:16 Shorts/Reels</span>
                  </button>
                  <button
                    type="button"
                    className={`ratio-btn ${aspectRatio === "1:1" ? "active" : ""}`}
                    onClick={() => setAspectRatio("1:1")}
                  >
                    <span>⬛ 1:1 Square</span>
                  </button>
                </div>
              </div>

              {/* Length Slider */}
              <div className="field">
                <label htmlFor="seconds">
                  <span>Track Length</span>
                  <div style={{ display: "flex", gap: "0.3rem" }}>
                    {[30, 60, 120, 180].map((s) => (
                      <button
                        type="button"
                        key={s}
                        className="preset-chip"
                        style={{ padding: "0.15rem 0.5rem", fontSize: "0.74rem" }}
                        onClick={() => setSeconds(s)}
                      >
                        {s}s
                      </button>
                    ))}
                  </div>
                </label>
                <div className="slider-container">
                  <input
                    id="seconds"
                    type="range"
                    min={10}
                    max={240}
                    step={5}
                    value={seconds}
                    onChange={(e) => setSeconds(Number(e.target.value))}
                  />
                  <div className="slider-value">{formatDuration(seconds)}</div>
                </div>
              </div>

              {/* Watermark input */}
              <div className="field">
                <label htmlFor="watermark">
                  <span>Watermark / Brand Stamp (Optional)</span>
                </label>
                <input
                  id="watermark"
                  type="text"
                  maxLength={60}
                  value={watermark}
                  placeholder="@yourchannel or study club"
                  onChange={(e) => setWatermark(e.target.value)}
                />
              </div>
            </>
          )}

          {/* Action CTA Button */}
          <button
            type="button"
            className="cta-button"
            disabled={busy}
            onClick={generate}
          >
            {busy ? (
              <>
                <div className="step-indicator spinning" style={{ width: 18, height: 18 }} />
                <span>Synthesizing Lofi Media...</span>
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                <span>
                  {tool === "trim"
                    ? "Trim Silent Pauses"
                    : tool === "lofi-youtube"
                    ? "Render from YouTube Audio"
                    : tool === "slides"
                    ? "Render Story Slides"
                    : "Generate Lofi Video"}
                </span>
              </>
            )}
          </button>

          {/* Render Step Feedback */}
          {busy && (
            <div className="render-tracker">
              <div className={`tracker-step ${renderStep >= 1 ? (renderStep > 1 ? "done" : "active") : ""}`}>
                <div className={`step-indicator ${renderStep === 1 ? "spinning" : ""}`}>
                  {renderStep > 1 ? "✓" : "1"}
                </div>
                <span>Composing Rhodes chord voicing & timing</span>
              </div>
              <div className={`tracker-step ${renderStep >= 2 ? (renderStep > 2 ? "done" : "active") : ""}`}>
                <div className={`step-indicator ${renderStep === 2 ? "spinning" : ""}`}>
                  {renderStep > 2 ? "✓" : "2"}
                </div>
                <span>Generating analog vinyl tape flutter & sub-bass</span>
              </div>
              <div className={`tracker-step ${renderStep >= 3 ? (renderStep > 3 ? "done" : "active") : ""}`}>
                <div className={`step-indicator ${renderStep === 3 ? "spinning" : ""}`}>
                  {renderStep > 3 ? "✓" : "3"}
                </div>
                <span>Rendering waveform visualizer & video canvas</span>
              </div>
              <div className={`tracker-step ${renderStep >= 4 ? "active" : ""}`}>
                <div className={`step-indicator ${renderStep === 4 ? "spinning" : ""}`}>
                  {renderStep > 4 ? "✓" : "4"}
                </div>
                <span>Applying visual style grade & encoding MP4</span>
              </div>
            </div>
          )}

          {/* Status Message */}
          {status.text && (
            <div className={`toast ${status.kind}`}>
              {status.kind === "ok" && <span>✓</span>}
              {status.kind === "error" && <span>⚠️</span>}
              <span>{status.text}</span>
            </div>
          )}
        </section>

        {/* Right Column: Studio Deck Monitor (Player, Downloads, Publishing) */}
        <aside className="monitor-panel" aria-labelledby="monitor-title">
          <div className="deck-display">
            <div className="deck-header">
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span className={`deck-led ${busy ? "busy" : ""}`} />
                <span style={{ fontWeight: 600 }}>STUDIO MONITOR</span>
                <button
                  type="button"
                  className="preset-chip"
                  style={{
                    padding: "0.15rem 0.5rem",
                    fontSize: "0.7rem",
                    background: liveAnimatorEnabled ? "rgba(16, 185, 129, 0.22)" : undefined,
                    color: liveAnimatorEnabled ? "var(--success)" : undefined,
                    borderColor: liveAnimatorEnabled ? "var(--success)" : undefined,
                  }}
                  onClick={() => setLiveAnimatorEnabled(!liveAnimatorEnabled)}
                  title="Toggle real-time atmospheric particles (LoFi rain, Anime fireflies, Pixar embers)"
                >
                  {liveAnimatorEnabled ? "✨ Animator: LIVE" : "⏸ Animator: OFF"}
                </button>
                {result && (
                  <button
                    type="button"
                    className="preset-chip"
                    style={{ padding: "0.15rem 0.5rem", fontSize: "0.7rem", marginLeft: "0.3rem" }}
                    onClick={() => setPreviewMode(!previewMode)}
                    title="Toggle between rendered video and selected background artwork stage"
                  >
                    {previewMode ? "▶ Show Video" : "🖼 Scene Stage"}
                  </button>
                )}
              </div>
              <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.75rem", fontFamily: "Space Grotesk, monospace" }}>
                {result && !previewMode ? (
                  <>
                    <span>ID: #{result.id}</span>
                    {result?.aspectRatio && <span>{result.aspectRatio}</span>}
                  </>
                ) : (
                  <span style={{ color: "var(--accent)" }}>LIVE STAGE</span>
                )}
              </div>
            </div>

            <div className="video-wrapper">
              {result && !previewMode ? (
                <video
                  ref={videoRef}
                  key={result.url}
                  src={result.url}
                  controls
                  playsInline
                  autoPlay={false}
                  preload="metadata"
                />
              ) : (
                <div
                  className="video-placeholder"
                  style={{
                    position: "relative",
                    overflow: "hidden",
                    minHeight: 280,
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {/* Living aesthetic backdrop preview (image or video loop) */}
                  {isVideoScene ? (
                    <video
                      src={sceneImgSrc}
                      autoPlay
                      loop
                      muted
                      playsInline
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        filter: "brightness(0.75) contrast(1.05)",
                      }}
                    />
                  ) : (
                    <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", overflow: "hidden" }}>
                      <img
                        src={sceneImgSrc}
                        alt={activeSceneLabel}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          filter:
                            style === "anime"
                              ? "brightness(0.85) contrast(1.18) saturate(1.4)"
                              : style === "pixar"
                              ? "brightness(0.88) contrast(1.15) drop-shadow(0 0 16px rgba(245,158,11,0.3))"
                              : "brightness(0.75) contrast(1.05)",
                          transform: liveAnimatorEnabled ? "scale(1.04)" : "scale(1.0)",
                          transition: "all 0.6s ease",
                        }}
                      />
                      {liveAnimatorEnabled && (
                        <canvas
                          ref={animatorCanvasRef}
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            pointerEvents: "none",
                            zIndex: 1,
                          }}
                        />
                      )}
                    </div>
                  )}
                  <div
                    style={{
                      position: "relative",
                      zIndex: 2,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      textAlign: "center",
                      gap: "0.5rem",
                      background: "rgba(10, 8, 20, 0.76)",
                      padding: "1.1rem 1.4rem",
                      borderRadius: 16,
                      backdropFilter: "blur(10px)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      maxWidth: "88%",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <span className="deck-led" style={{ width: 8, height: 8 }} />
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--accent)" }}>
                        {isReferenceScene ? "Selected Reference Scene" : "Selected Scene Backdrop"}
                      </span>
                    </div>
                    <strong style={{ fontSize: "1.05rem", color: "#fff" }}>
                      {activeSceneLabel}
                    </strong>
                    <span style={{ fontSize: "0.78rem", color: "rgba(255, 255, 255, 0.8)", maxWidth: 320, lineHeight: 1.35 }}>
                      {activeSceneTag}
                    </span>
                    {result ? (
                      <button
                        type="button"
                        className="preset-chip"
                        style={{ marginTop: "0.3rem", background: "var(--accent)", color: "#000", fontWeight: 600 }}
                        onClick={() => setPreviewMode(false)}
                      >
                        ▶ Watch Rendered Video (#{result.id})
                      </button>
                    ) : (
                      <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.2rem", flexWrap: "wrap", justifyContent: "center" }}>
                        <span style={{ fontSize: "0.72rem", background: "rgba(245, 158, 11, 0.2)", border: "1px solid rgba(245, 158, 11, 0.4)", color: "#fcd34d", padding: "0.2rem 0.6rem", borderRadius: 100 }}>
                          Ready to Synthesize
                        </span>
                        <button
                          type="button"
                          className="preset-chip"
                          style={{ fontSize: "0.72rem", padding: "0.2rem 0.55rem" }}
                          onClick={() => setRefRepoOpen(true)}
                        >
                          📚 Change Reference
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Deck Action Bar */}
            <div className="deck-actions">
              {result && (
                <>
                  <a className="action-btn primary" href={result.url} download={`lofi-${result.id}.mp4`}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    <span>Download MP4</span>
                  </a>

                  {result.audioUrl && (
                    <a className="action-btn" href={result.audioUrl} download={`lofi-${result.id}.wav`}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 18V5l12-2v13" />
                        <circle cx="6" cy="18" r="3" />
                        <circle cx="18" cy="16" r="3" />
                      </svg>
                      <span>Audio (WAV)</span>
                    </a>
                  )}

                  <button
                    type="button"
                    className="action-btn"
                    onClick={() => {
                      setTool("trim");
                      generate();
                    }}
                    title="Trim pauses from this render"
                  >
                    <span>✂️ Trim Pauses</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Animated EQ Bars Visualizer */}
          <div className="visualizer-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem", color: "var(--text-muted)" }}>
              <span>ANALOG HARMONIC SPECTRUM</span>
              <span style={{ fontFamily: "Space Grotesk, monospace" }}>44.1 kHz • 16-BIT</span>
            </div>
            <div className="eq-bars">
              {[18, 35, 42, 28, 48, 62, 50, 38, 70, 85, 60, 45, 55, 68, 40, 25, 32, 50, 42, 20].map((h, i) => (
                <div
                  key={i}
                  className="eq-bar"
                  style={{
                    height: busy ? `${Math.min(95, h + (i % 3) * 15)}%` : `${h * 0.45}%`,
                    animation: busy ? `pulse 0.4s infinite alternate ${i * 0.05}s` : "none",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Social Publishing Card */}
          <div className="publish-card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 id="monitor-title" style={{ fontSize: "1.1rem" }}>
                Export & Publish Hub
              </h2>
              <div style={{ display: "flex", gap: "0.3rem" }}>
                <button
                  type="button"
                  className={`preset-chip ${publishTab === "youtube" ? "active" : ""}`}
                  style={{ background: publishTab === "youtube" ? "var(--accent)" : undefined, color: publishTab === "youtube" ? "#fff" : undefined }}
                  onClick={() => setPublishTab("youtube")}
                >
                  YouTube
                </button>
                <button
                  type="button"
                  className={`preset-chip ${publishTab === "instagram" ? "active" : ""}`}
                  style={{ background: publishTab === "instagram" ? "var(--accent)" : undefined, color: publishTab === "instagram" ? "#fff" : undefined }}
                  onClick={() => setPublishTab("instagram")}
                >
                  Instagram Reels
                </button>
              </div>
            </div>

            <div className="field">
              <label htmlFor="pubTitle">Video Title</label>
              <input
                id="pubTitle"
                type="text"
                maxLength={100}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="pubDesc">Caption / Description</label>
              <textarea
                id="pubDesc"
                value={desc}
                style={{ minHeight: 70 }}
                onChange={(e) => setDesc(e.target.value)}
              />
            </div>

            {publishTab === "youtube" && (
              <div className="field">
                <label htmlFor="pubPrivacy">YouTube Privacy</label>
                <select
                  id="pubPrivacy"
                  value={privacy}
                  onChange={(e) => setPrivacy(e.target.value as typeof privacy)}
                >
                  <option value="private">Private (Only you)</option>
                  <option value="unlisted">Unlisted (Anyone with link)</option>
                  <option value="public">Public (Published on channel)</option>
                </select>
              </div>
            )}

            <div className="publish-grid">
              <button
                type="button"
                className="action-btn primary"
                disabled={!result || pubBusy !== null}
                onClick={() => publish("youtube")}
              >
                {pubBusy === "youtube" ? "Posting to YouTube..." : "Post to YouTube"}
              </button>
              <button
                type="button"
                className="action-btn"
                disabled={!result || pubBusy !== null}
                onClick={() => publish("instagram")}
              >
                {pubBusy === "instagram" ? "Posting to Reels..." : "Post to Instagram Reels"}
              </button>
            </div>

            {pubStatus && (
              <div className={`toast ${pubStatus.kind}`}>
                {pubStatus.kind === "ok" ? "✓" : "⚠️"} {pubStatus.text}
              </div>
            )}
          </div>
        </aside>
      </main>

      {/* Studio Vault / History Modal */}
      {vaultOpen && (
        <div className="modal-overlay" onClick={() => setVaultOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Studio Vault — Render History</h3>
              </div>
              <button
                type="button"
                className="action-btn"
                style={{ padding: "0.3rem 0.6rem", minWidth: "auto" }}
                onClick={() => setVaultOpen(false)}
              >
                ✕ Close
              </button>
            </div>

            <div className="modal-body">
              {history.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                  No rendered tracks yet. Generate your first lofi track!
                </div>
              ) : (
                history.map((item) => (
                  <div key={item.id} className="history-item">
                    <div className="history-info">
                      <span className="history-title">{item.title || `Lofi Mix #${item.id}`}</span>
                      <div className="history-meta">
                        <span>{item.sub || "Lofi Music"}</span>
                        <span>•</span>
                        <span>{item.seconds ? `${item.seconds}s` : "60s"}</span>
                        <span>•</span>
                        <span>{item.aspectRatio || "16:9"}</span>
                        <span>•</span>
                        <span>{item.style}</span>
                      </div>
                    </div>

                    <div className="history-actions">
                      <button
                        type="button"
                        className="action-btn primary"
                        style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}
                        onClick={() => {
                          setResult(item);
                          setVaultOpen(false);
                        }}
                      >
                        ▶ Load & Play
                      </button>
                      <a
                        className="action-btn"
                        style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}
                        href={item.url}
                        download={`lofi-${item.id}.mp4`}
                      >
                        MP4
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Curated 300 Reference Images Library Modal */}
      {refRepoOpen && (
        <div className="modal-overlay" onClick={() => setRefRepoOpen(false)}>
          <div className="modal-content ref-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <span style={{ fontSize: "1.4rem" }}>🎨</span>
                <div>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>
                    Curated Reference Asset Library
                  </h3>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    300 high-res aesthetic artworks across 3 genres: 100 Lofi, 100 Anime & Ghibli, 100 Pixar 3D
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="action-btn"
                style={{ padding: "0.3rem 0.7rem", minWidth: "auto" }}
                onClick={() => setRefRepoOpen(false)}
              >
                ✕ Close
              </button>
            </div>

            {/* Reference Repository Toolbar (Tabs + Search) */}
            <div className="ref-toolbar">
              <div className="ref-tabs">
                <button
                  type="button"
                  className={`ref-tab-btn ${refCategory === "all" ? "active" : ""}`}
                  onClick={() => setRefCategory("all")}
                >
                  <span>✨ All</span>
                  <span style={{ opacity: 0.8 }}>({refCounts.total})</span>
                </button>
                <button
                  type="button"
                  className={`ref-tab-btn ${refCategory === "lofi" ? "active" : ""}`}
                  onClick={() => setRefCategory("lofi")}
                >
                  <span>🎧 Lofi Tape</span>
                  <span style={{ opacity: 0.8 }}>({refCounts.lofi})</span>
                </button>
                <button
                  type="button"
                  className={`ref-tab-btn ${refCategory === "anime" ? "active" : ""}`}
                  onClick={() => setRefCategory("anime")}
                >
                  <span>🌸 Anime & Ghibli</span>
                  <span style={{ opacity: 0.8 }}>({refCounts.anime})</span>
                </button>
                <button
                  type="button"
                  className={`ref-tab-btn ${refCategory === "pixar" ? "active" : ""}`}
                  onClick={() => setRefCategory("pixar")}
                >
                  <span>✨ Pixar 3D</span>
                  <span style={{ opacity: 0.8 }}>({refCounts.pixar})</span>
                </button>
                <button
                  type="button"
                  className={`ref-tab-btn ${refCategory === "videos" ? "active" : ""}`}
                  onClick={() => setRefCategory("videos")}
                >
                  <span>🎬 Stock Video Loops</span>
                  <span style={{ opacity: 0.8 }}>({stockVideos.length})</span>
                </button>
              </div>

              <input
                type="text"
                className="ref-search-input"
                placeholder="Search moods, tags, scenes (e.g. rain, cafe)..."
                value={refSearch}
                onChange={(e) => setRefSearch(e.target.value)}
              />
            </div>

            {/* Reference Grid */}
            <div className="ref-grid">
              {filteredReferences.length === 0 ? (
                <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                  No reference assets matching &ldquo;{refSearch}&rdquo;.
                </div>
              ) : (
                filteredReferences.map((item) => {
                  const isSelected = selectedScene === item.path || selectedScene === item.path.replace(/^\//, "");
                  const isItemVideo = item.path?.endsWith(".mp4") || item.path?.endsWith(".webm");
                  return (
                    <div
                      key={item.id}
                      className={`ref-card ${isSelected ? "active" : ""}`}
                      onClick={() => {
                        selectReferenceAsset(item);
                        setRefRepoOpen(false);
                      }}
                    >
                      <div className="ref-card-img-wrap">
                        {isItemVideo ? (
                          <video
                            src={`${item.path}#t=0.1`}
                            poster={item.path.replace(/\.(mp4|webm)$/, ".jpg")}
                            autoPlay
                            loop
                            muted
                            playsInline
                            preload="auto"
                            className="ref-card-img"
                          />
                        ) : (
                          <img
                            src={item.path}
                            alt={item.title}
                            className="ref-card-img"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/backgrounds/lofi_study_girl.jpg";
                            }}
                          />
                        )}
                        <span className={`ref-category-badge ${item.category}`}>{item.category}</span>
                        {isSelected && (
                          <span style={{ position: "absolute", top: "0.5rem", right: "0.5rem", background: "var(--accent)", color: "#000", fontWeight: 700, fontSize: "0.65rem", padding: "0.15rem 0.45rem", borderRadius: 4, zIndex: 2 }}>
                            Active Scene
                          </span>
                        )}
                      </div>
                      <div className="ref-card-body">
                        <span className="ref-card-title" title={item.title}>
                          {item.title}
                        </span>
                        <div className="ref-card-tags">
                          <span className="ref-card-tag">{item.mood}</span>
                          <span className="ref-card-tag">{item.style}</span>
                          {(item.tags || []).slice(0, 2).map((t) => (
                            <span key={t} className="ref-card-tag">#{t}</span>
                          ))}
                        </div>
                        <button
                          type="button"
                          className="preset-chip"
                          style={{
                            marginTop: "0.35rem",
                            width: "100%",
                            justifyContent: "center",
                            background: isSelected ? "var(--accent)" : undefined,
                            color: isSelected ? "#000" : undefined,
                            fontWeight: isSelected ? 700 : 500,
                            fontSize: "0.74rem",
                          }}
                        >
                          {isSelected ? "✓ Active Reference" : "Use As Scene"}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload & Animate Still Image Modal */}
      {uploadModalOpen && (
        <div className="modal-overlay" onClick={() => setUploadModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <span style={{ fontSize: "1.5rem" }}>🖼️</span>
                <div>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>
                    Add & Animate Still Image
                  </h3>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    Transform any static photo into a living, animated LoFi, Anime, or Pixar 3D scene
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="action-btn"
                style={{ padding: "0.3rem 0.7rem", minWidth: "auto" }}
                onClick={() => setUploadModalOpen(false)}
              >
                ✕ Close
              </button>
            </div>

            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
              {/* File Drop / Select Area */}
              <div
                style={{
                  border: "2px dashed var(--border)",
                  borderRadius: 14,
                  padding: "1.5rem",
                  textAlign: "center",
                  background: customImageDataUrl ? "rgba(16, 185, 129, 0.08)" : "var(--surface-card)",
                  cursor: "pointer",
                  position: "relative",
                  transition: "all 0.2s",
                }}
                onClick={() => document.getElementById("custom-image-file-input")?.click()}
              >
                <input
                  id="custom-image-file-input"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        setCustomImageDataUrl(ev.target?.result as string);
                        setCustomImageLabel(file.name.replace(/\.[^/.]+$/, ""));
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                {customImageDataUrl ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", justifyContent: "center" }}>
                    <img
                      src={customImageDataUrl}
                      alt="Preview"
                      style={{ width: 80, height: 60, objectFit: "cover", borderRadius: 8, border: "1px solid var(--accent)" }}
                    />
                    <div style={{ textAlign: "left" }}>
                      <strong style={{ color: "var(--success)", display: "block" }}>✓ Image Selected</strong>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Click to choose a different file</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <span style={{ fontSize: "2rem", display: "block", marginBottom: "0.4rem" }}>📁</span>
                    <strong style={{ display: "block", fontSize: "0.95rem" }}>Drop your image here, or browse files</strong>
                    <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Supports high-res PNG, JPG, WebP</span>
                  </div>
                )}
              </div>

              {/* Or URL input */}
              <div className="field">
                <label htmlFor="custom-image-url">Or Paste Image URL</label>
                <input
                  id="custom-image-url"
                  type="url"
                  placeholder="https://example.com/aesthetic-photo.jpg"
                  value={customImageUrl}
                  onChange={(e) => {
                    setCustomImageUrl(e.target.value);
                    if (e.target.value) setCustomImageDataUrl(null);
                  }}
                />
              </div>

              {/* Artwork Label */}
              <div className="field">
                <label htmlFor="custom-image-title">Scene Label</label>
                <input
                  id="custom-image-title"
                  type="text"
                  placeholder="e.g. Rainy Bedroom at 2AM"
                  value={customImageLabel}
                  onChange={(e) => setCustomImageLabel(e.target.value)}
                />
              </div>

              {/* Animation Mode Style Choice */}
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, fontSize: "0.88rem" }}>
                  Select Living Animation Style:
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.6rem" }}>
                  <div
                    className={`style-card ${customAnimStyle === "lofi" ? "active" : ""}`}
                    onClick={() => setCustomAnimStyle("lofi")}
                    style={{ padding: "0.75rem", cursor: "pointer" }}
                  >
                    <span style={{ fontWeight: 700, fontSize: "0.88rem", display: "block" }}>🎧 LoFi Tape</span>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.3 }}>
                      Analog camera breath, rain streaks & warm film grain
                    </span>
                  </div>
                  <div
                    className={`style-card ${customAnimStyle === "anime" ? "active" : ""}`}
                    onClick={() => setCustomAnimStyle("anime")}
                    style={{ padding: "0.75rem", cursor: "pointer" }}
                  >
                    <span style={{ fontWeight: 700, fontSize: "0.88rem", display: "block" }}>🌸 Anime Cel</span>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.3 }}>
                      Makoto Shinkai sky pan drift, cel sharpness & fireflies
                    </span>
                  </div>
                  <div
                    className={`style-card ${customAnimStyle === "pixar" ? "active" : ""}`}
                    onClick={() => setCustomAnimStyle("pixar")}
                    style={{ padding: "0.75rem", cursor: "pointer" }}
                  >
                    <span style={{ fontWeight: 700, fontSize: "0.88rem", display: "block" }}>✨ Pixar 3D</span>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.3 }}>
                      Volumetric bloom pulse, floating golden embers & parallax
                    </span>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="button"
                className="cta-button"
                disabled={uploadingImage || (!customImageDataUrl && !customImageUrl)}
                onClick={handleUploadAndAnimate}
                style={{ marginTop: "0.5rem" }}
              >
                {uploadingImage ? (
                  <>
                    <div className="step-indicator spinning" style={{ width: 16, height: 16 }} />
                    <span>Processing & Animating Image...</span>
                  </>
                ) : (
                  <span>🚀 Activate & Animate in Studio</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
