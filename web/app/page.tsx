"use client";

import { useState, useEffect, useRef } from "react";
import { ThemeToggle } from "./theme-toggle";
import { ambientSound } from "./ambient-audio";

type ToolId = "lofi-prompt" | "lyrics" | "lofi-youtube" | "slides" | "trim";
type Style = "lofi" | "anime" | "pixar" | "devotional" | "cyberpunk" | "nature" | "simple_ai";
type Category = "all" | "devotional" | "anime" | "lofi" | "pixar" | "cyberpunk" | "nature" | "simple_ai";
type AspectRatio = "16:9" | "9:16" | "1:1";
type Resolution = "720p" | "1080p" | "2k" | "4k";

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
  category?: string;
  subcategory?: string;
  url: string;
};

export type ReferenceItem = {
  id: string;
  title: string;
  category: string;
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
  resolution?: Resolution;
  dimensions?: string;
  title?: string;
  sub?: string;
  seconds?: number;
  createdAt?: number;
  size?: number;
  style?: string;
};

const RESOLUTION_OPTIONS: { id: Resolution; label: string; desc: string; badge: string; dimensions: string }[] = [
  { id: "720p", label: "720p HD", desc: "Fast Preview & Web Streaming", badge: "Fast", dimensions: "1280x720" },
  { id: "1080p", label: "1080p Full HD", desc: "High Definition Standard", badge: "Standard", dimensions: "1920x1080" },
  { id: "2k", label: "2K QHD", desc: "Ultra Crisp Studio Fidelity", badge: "Crisp", dimensions: "2560x1440" },
  { id: "4k", label: "4K UHD", desc: "Master Cinema Quality (Max Detail)", badge: "Cinema", dimensions: "3840x2160" },
];

const SUBCATEGORIES: { id: string; category: Category; name: string; icon: string; prompt: string; scene: string; mood: string; desc: string }[] = [
  // Devotional
  { id: "krishna_radha", category: "devotional", name: "Krishna & Radha Ocean Twilight", icon: "🪈", prompt: "Krishna and Radha sitting near the beach ocean shore listening to pleasant bansuri music, golden twilight", scene: "krishna_radha_beach.jpg", mood: "devotional_temple", desc: "Bansuri flute by ocean shore with floating lotus blooms" },
  { id: "vedic_temple", category: "devotional", name: "Vedic Temple & Ghats", icon: "🪔", prompt: "Ancient sacred Vedic temple steps along holy river at golden sunrise with floating lotus diyas", scene: "devotional_vedic_ghats.jpg", mood: "devotional_temple", desc: "Holy river steps at dawn with glowing candle diyas" },
  { id: "himalayan_shrine", category: "devotional", name: "Himalayan Peak Shrine", icon: "🏔️", prompt: "Sacred Himalayan temple shrine overlooking misty snow peaks under golden sunrise rays", scene: "devotional_himalayan_temple.jpg", mood: "devotional_temple", desc: "Ancient mountain monastery with golden sunbeams" },
  { id: "sufi_mystic", category: "devotional", name: "Sufi Mystic Golden Glow", icon: "✨", prompt: "Mystical devotional sanctum with swirling golden dust particles, warm lanterns and divine peace", scene: "devotional_himalayan_temple.jpg", mood: "devotional_temple", desc: "Devotional trance with warm lanterns and spiritual peace" },
  
  // Anime
  { id: "shinkai_sky", category: "anime", name: "Makoto Shinkai Sky", icon: "☁️", prompt: "Makoto Shinkai anime twilight train window with radiant sunset clouds and distant Tokyo tower", scene: "anime_shinkai_sunset.jpg", mood: "shinkai_anime", desc: "Vibrant clouds and golden twilight horizon" },
  { id: "ghibli_garden", category: "anime", name: "Studio Ghibli Garden", icon: "🍃", prompt: "Studio Ghibli country cottage porch overlooking sunlit summer garden with butterflies and wildflowers", scene: "anime_ghibli_garden.jpg", mood: "ghibli_garden", desc: "Hand-painted porch with wildflower meadows" },
  { id: "city_pop_retro", category: "anime", name: "Retro 90s City Pop", icon: "📻", prompt: "Retro 1990s Japanese anime aesthetic, pastel sunset over suburban Tokyo with cassette player on balcony", scene: "anime_retro_city_pop.jpg", mood: "shinkai_anime", desc: "Pastel Tokyo sunset with vintage cassette boombox" },
  
  // LoFi
  { id: "study_desk", category: "lofi", name: "Classic Study Desk", icon: "🎧", prompt: "Rainy night study session with warm amber lamp light, sleeping cat and headphones", scene: "lofi_study_girl.jpg", mood: "night", desc: "LoFi girl with headphones, study desk and sleeping cat" },
  { id: "rainy_cafe", category: "lofi", name: "Cozy Rainy Cafe", icon: "☕", prompt: "Cozy bookstore cafe with warm espresso, bookshelf rows and soft rain tapping against glass", scene: "lofi_rainy_cafe.jpg", mood: "lofi_cafe", desc: "Steaming coffee with Tokyo rain against window" },
  { id: "sunset_balcony", category: "lofi", name: "Sunset Balcony & Vinyl", icon: "🌇", prompt: "Golden hour sunset balcony with vintage vinyl turntable and skyline silhouette", scene: "lofi_sunset_balcony.jpg", mood: "warm", desc: "Vinyl turntable and golden hour dusk" },
  { id: "midnight_bedroom", category: "lofi", name: "Midnight Starlight Bedroom", icon: "🌙", prompt: "Celestial starry bedroom with glowing moon lamp, cozy blankets and distant city lights", scene: "lofi_starlight_bedroom.jpg", mood: "dreamy", desc: "Moon lamp and cosmic starlight through window" },

  // Pixar
  { id: "cozy_cabin", category: "pixar", name: "Fireplace Hearth Cabin", icon: "🪵", prompt: "Pixar 3D animated cozy winter cabin with hot cocoa, crackling fireplace and sleeping puppy", scene: "pixar_cozy_cabin.jpg", mood: "pixar_cozy", desc: "3D hearth warmth with hot cocoa and puppy" },
  { id: "rooftop_stars", category: "pixar", name: "Rooftop Stargazing", icon: "🔭", prompt: "Pixar 3D animated rooftop with vintage brass telescope, cozy knit scarf and starlit city sky", scene: "pixar_rooftop_stars.jpg", mood: "dreamy", desc: "Brass telescope and starry night fairytale" },

  // Cyberpunk
  { id: "neon_rain", category: "cyberpunk", name: "Night City Neon Rain", icon: "🌧️", prompt: "Futuristic neon cyberpunk alley with ramen stall, glowing holographic signs and heavy rain reflections", scene: "cyberpunk_neon_rain.jpg", mood: "cyber_synthwave", desc: "Ramen stall neon reflections in wet asphalt" },
  { id: "synthwave_grid", category: "cyberpunk", name: "Outrun 80s Grid", icon: "⚡", prompt: "Outrun synthwave digital wireframe grid with neon magenta sun and chrome sports car", scene: "lofi_tokyo_cyberpunk.jpg", mood: "cyber_synthwave", desc: "Neon wireframe grid with synthwave horizon" },

  // Nature
  { id: "biophilic_waterfall", category: "nature", name: "Sanctuary Waterfall", icon: "💧", prompt: "Biophilic glasshouse sanctuary with cascading waterfall, lush tropical ferns and sunbeams", scene: "nature_biophilic_waterfall.jpg", mood: "nature_sanctuary", desc: "Cascading glasshouse waterfall and sunbeams" },
  { id: "bioluminescent_grove", category: "nature", name: "Bioluminescent Forest", icon: "🍄", prompt: "Mystical midnight forest with glowing bioluminescent turquoise stream and magical fireflies", scene: "nature_bioluminescent_forest.jpg", mood: "nature_sanctuary", desc: "Glowing turquoise river and dancing fireflies" },

  // Simple AI
  { id: "minimalist_lounge", category: "simple_ai", name: "Nordic Modernist Lounge", icon: "🪑", prompt: "Minimalist modern architecture lounge overlooking misty forest with clean lines and warm wood", scene: "simple_ai_minimal_lounge.jpg", mood: "simple_minimal", desc: "Architectural clean lines and misty pine forest" },
  { id: "kinetic_geometry", category: "simple_ai", name: "Kinetic Geometric Flow", icon: "⚪", prompt: "Minimalist abstract 3D geometric ribbons and floating spheres in warm studio lighting", scene: "simple_ai_geometric_flow.jpg", mood: "simple_minimal", desc: "Floating 3D geometric ribbons and diffuse light" },
];

const STYLES: { id: Style; name: string; desc: string; badge: string }[] = [
  { id: "devotional", name: "Devotional & Sacred", desc: "432Hz ethereal golden aura bloom, divine radiance & soul peace.", badge: "Sacred" },
  { id: "anime", name: "Anime & Ghibli", desc: "Makoto Shinkai sky, hand-painted cel warmth, high sharpness & sakura bloom.", badge: "Cinematic" },
  { id: "lofi", name: "LoFi Chill & Study", desc: "Cozy rainy tape warmth, vinyl crackle, gentle camera breath & Rhodes chords.", badge: "Classic" },
  { id: "pixar", name: "Pixar 3D Cozy", desc: "3D animated volumetric lighting, warm golden bloom & nostalgic music box.", badge: "Storybook" },
  { id: "cyberpunk", name: "Cyberpunk & Synth", desc: "Rainy Night City neon cyan/magenta pulse, analog saw bass & chromatic glide.", badge: "Retro Synth" },
  { id: "nature", name: "Biophilic Nature", desc: "Lush emerald sanctuary, flowing woodland stream, sunbeams & gentle breeze.", badge: "Organic" },
  { id: "simple_ai", name: "Simple AI & Minimal", desc: "Ultra-clean modern Ken Burns pan, high-contrast architecture & pure sine chill.", badge: "Modernist" },
];

const PRESETS = [
  { label: "Sacred Himalayan Mandir", prompt: "A sacred Himalayan temple at golden sunrise with holy river and floating lotus diyas", mood: "devotional_temple", style: "devotional" as Style, scene: "devotional_himalayan_temple.jpg", seconds: 60, category: "devotional" },
  { label: "Krishna & Radha Twilight", prompt: "Krishna and Radha sitting near the beach ocean shore listening to pleasant bansuri music", mood: "devotional_temple", style: "devotional" as Style, scene: "krishna_radha_beach.jpg", seconds: 60, category: "devotional" },
  { label: "Shinkai Twilight", prompt: "Makoto Shinkai anime twilight train window with radiant sunset clouds", mood: "shinkai_anime", style: "anime" as Style, scene: "anime_shinkai_sunset.jpg", seconds: 60, category: "anime" },
  { label: "Ghibli Garden", prompt: "Studio Ghibli country cottage porch overlooking sunlit summer garden", mood: "ghibli_garden", style: "anime" as Style, scene: "anime_ghibli_garden.jpg", seconds: 60, category: "anime" },
  { label: "Rainy Study", prompt: "Rainy night study session with warm amber lamp light", mood: "night", style: "lofi" as Style, scene: "lofi_study_girl.jpg", seconds: 60, category: "lofi" },
  { label: "Cozy Cafe", prompt: "Cozy bookstore cafe with warm espresso and soft rain on glass", mood: "lofi_cafe", style: "lofi" as Style, scene: "lofi_rainy_cafe.jpg", seconds: 60, category: "lofi" },
  { label: "Pixar Fireplace", prompt: "Pixar 3D animated cozy winter cabin with hot cocoa and sleeping puppy", mood: "pixar_cozy", style: "pixar" as Style, scene: "pixar_cozy_cabin.jpg", seconds: 60, category: "pixar" },
  { label: "Pixar Stargazing", prompt: "Pixar 3D animated rooftop with vintage telescope and fluffy white cat", mood: "dreamy", style: "pixar" as Style, scene: "pixar_rooftop_stars.jpg", seconds: 60, category: "pixar" },
  { label: "Night City Cyber Rain", prompt: "Futuristic neon cyberpunk alley with ramen stall, glowing signs and heavy rain", mood: "cyber_synthwave", style: "cyberpunk" as Style, scene: "cyberpunk_neon_rain.jpg", seconds: 60, category: "cyberpunk" },
  { label: "Biophilic Forest Waterfall", prompt: "Biophilic glasshouse sanctuary with cascading waterfall and tropical ferns", mood: "nature_sanctuary", style: "nature" as Style, scene: "nature_biophilic_waterfall.jpg", seconds: 60, category: "nature" },
  { label: "Simple AI Zen Loft", prompt: "Minimalist modern architecture lounge overlooking misty forest with clean lines", mood: "simple_minimal", style: "simple_ai" as Style, scene: "simple_ai_minimal_lounge.jpg", seconds: 60, category: "simple_ai" },
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
  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const [scenesList, setScenesList] = useState<SceneInfo[]>([
    { id: "lofi_study_girl.jpg", label: "Anime Study Desk", tag: "Classic Lofi Girl with headphones, rain & cat", style: "lofi", category: "lofi", url: "/backgrounds/lofi_study_girl.jpg" },
    { id: "anime_shinkai_sunset.jpg", label: "Shinkai Twilight Train", tag: "Makoto Shinkai vibrant clouds & Tokyo sunset", style: "anime", category: "anime", url: "/backgrounds/anime_shinkai_sunset.jpg" },
    { id: "pixar_cozy_cabin.jpg", label: "Pixar Fireplace Cabin", tag: "3D animated cabin, hot cocoa & sleeping puppy", style: "pixar", category: "pixar", url: "/backgrounds/pixar_cozy_cabin.jpg" },
    { id: "anime_ghibli_garden.jpg", label: "Ghibli Summer Porch", tag: "Hand-painted cottage garden, iced tea & butterflies", style: "anime", category: "anime", url: "/backgrounds/anime_ghibli_garden.jpg" },
    { id: "pixar_rooftop_stars.jpg", label: "Pixar Rooftop Stargazing", tag: "3D animated telescope, cozy scarf & starry night", style: "pixar", category: "pixar", url: "/backgrounds/pixar_rooftop_stars.jpg" },
    { id: "lofi_rainy_cafe.jpg", label: "Cozy Rainy Cafe", tag: "Warm coffee cup with steam & Tokyo rain", style: "lofi", category: "lofi", url: "/backgrounds/lofi_rainy_cafe.jpg" },
    { id: "lofi_tokyo_cyberpunk.jpg", label: "Tokyo Neon Alley", tag: "Rainy street, neon ramen bar & retro car", style: "cyberpunk", category: "cyberpunk", url: "/backgrounds/lofi_tokyo_cyberpunk.jpg" },
    { id: "cyberpunk_neon_rain.jpg", label: "Night City Cyberpunk Rain", tag: "Futuristic neon alley with ramen bar and rain reflections", style: "cyberpunk", category: "cyberpunk", url: "/backgrounds/cyberpunk_neon_rain.jpg" },
    { id: "lofi_sunset_balcony.jpg", label: "Sunset Balcony", tag: "Golden hour sunset & vinyl record player", style: "lofi", category: "lofi", url: "/backgrounds/lofi_sunset_balcony.jpg" },
    { id: "lofi_starlight_bedroom.jpg", label: "Starlight Galaxy", tag: "Celestial night sky, moon lamp & cozy bed", style: "lofi", category: "lofi", url: "/backgrounds/lofi_starlight_bedroom.jpg" },
    { id: "lofi_slow_morning.jpg", label: "Sunny Morning Room", tag: "Warm morning sunlight & acoustic guitar", style: "lofi", category: "lofi", url: "/backgrounds/lofi_slow_morning.jpg" },
    { id: "krishna_radha_beach.jpg", label: "Krishna & Radha Beach Twilight", tag: "Celestial flute melody by ocean shore with lotus blooms", style: "devotional", category: "devotional", url: "/backgrounds/krishna_radha_beach.jpg" },
    { id: "devotional_himalayan_temple.jpg", label: "Himalayan Sacred Temple", tag: "Golden sunrise over sacred peaks with river lotus diyas", style: "devotional", category: "devotional", url: "/backgrounds/devotional_himalayan_temple.jpg" },
    { id: "nature_biophilic_waterfall.jpg", label: "Biophilic Forest Waterfall", tag: "Cascading waterfall sanctuary with sunbeams and lush ferns", style: "nature", category: "nature", url: "/backgrounds/nature_biophilic_waterfall.jpg" },
    { id: "simple_ai_minimal_lounge.jpg", label: "Simple AI Zen Architecture", tag: "Clean minimalist modernist lounge overlooking misty pines", style: "simple_ai", category: "simple_ai", url: "/backgrounds/simple_ai_minimal_lounge.jpg" },
  ]);
  const [selectedScene, setSelectedScene] = useState<string>("lofi_study_girl.jpg");
  const [previewMode, setPreviewMode] = useState<boolean>(true);

  // Curated 300 Reference Images Repository State (100 Lofi, 100 Anime, 100 Pixar) + Stock Video Loops
  const [referenceRepo, setReferenceRepo] = useState<ReferenceItem[]>([]);
  const [stockVideos, setStockVideos] = useState<any[]>([]);
  const [refRepoOpen, setRefRepoOpen] = useState(false);
  const [refCategory, setRefCategory] = useState<"all" | "lofi" | "anime" | "pixar" | "devotional" | "cyberpunk" | "nature" | "simple_ai" | "videos">("all");
  const [refSearch, setRefSearch] = useState("");
  const [selectedRef, setSelectedRef] = useState<ReferenceItem | null>(null);
  const [refCounts, setRefCounts] = useState<any>({ total: 305, lofi: 100, anime: 100, pixar: 100, devotional: 2, cyberpunk: 1, nature: 1, simple_ai: 1 });
  
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
  const [resolution, setResolution] = useState<Resolution>("1080p");
  const [activeSubCategory, setActiveSubCategory] = useState<string>("all");

  // Fair Economics & Community Credits (Always Unlimited: 999999999 credits, 100% free)
  const [dailyCredits, setDailyCredits] = useState({ remaining: 999999999, total: 999999999 });

  // Strict Prompt Fidelity & Anti-Drift Motion Control
  const [strictPromptAdherence, setStrictPromptAdherence] = useState(true);
  const [negativePrompt, setNegativePrompt] = useState(
    "looking into each other's faces, direct eye contact, face to face interaction, turning head toward camera, breaking pose, distorted fingers, morphed face"
  );
  const [cameraMotion, setCameraMotion] = useState<"gaze_locked" | "subtle_breath" | "slow_pan" | "zero_drift">("gaze_locked");
  const [motionControlOpen, setMotionControlOpen] = useState(false);

  // Synchronized On-Screen Lyrics Studio (Multilingual Telugu, Hindi, English)
  const [lyricsEnabled, setLyricsEnabled] = useState(false);
  const [lyricsText, setLyricsText] = useState(
    "నిన్ను చూసిన వేళలో...\nమనసంతా నీదే కల...\nచేయి చేయి కలిపి నడుద్దాం...\nఈ మధుర క్షణాలు శాశ్వతం..."
  );
  const [lyricsPosition, setLyricsPosition] = useState<"bottom" | "center" | "top">("bottom");
  const [lyricsFontSize, setLyricsFontSize] = useState<number>(28);
  const [lyricsColor, setLyricsColor] = useState<string>("#ffffff");
  const [customAudioDataUrl, setCustomAudioDataUrl] = useState<string | null>(null);
  const [customAudioName, setCustomAudioName] = useState<string>("");

  // Google AI Generator State
  const [googleModalOpen, setGoogleModalOpen] = useState(false);
  const [googleApiKey, setGoogleApiKey] = useState("");
  const [googlePrompt, setGooglePrompt] = useState("Krishna and Radha sitting near the beach listening to pleasant bansuri music, radiant golden hour lighting, cinematic masterpiece");
  const [googleCategory, setGoogleCategory] = useState<Category>("devotional");
  const [googleSubCategory, setGoogleSubCategory] = useState<string>("krishna_radha");
  const [googleResolution, setGoogleResolution] = useState<Resolution>("1080p");
  const [googleAspectRatio, setGoogleAspectRatio] = useState<AspectRatio>("16:9");
  const [googleGenerating, setGoogleGenerating] = useState(false);
  const [googleGeneratedImage, setGoogleGeneratedImage] = useState<string | null>(null);
  const [googleGeneratedVideo, setGoogleGeneratedVideo] = useState<Result | null>(null);
  const [googleStatusText, setGoogleStatusText] = useState("");
  const [googleKeyVisible, setGoogleKeyVisible] = useState(false);

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

  // Load available moods, scenes, 300 references, previous renders history, and Google API Key
  useEffect(() => {
    try {
      const savedKey = localStorage.getItem("google_api_key");
      if (savedKey) setGoogleApiKey(savedKey);
    } catch {}

    fetch("/api/credits/status")
      .then((r) => r.json())
      .then((data) => {
        if (data.creditsRemaining !== undefined) {
          setDailyCredits({ remaining: data.creditsRemaining, total: data.dailyFreeCredits || 50 });
        }
      })
      .catch(() => {});

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

  // Real-time Canvas Particle Animation Engine (LoFi, Anime, Pixar, Devotional, Cyberpunk, Nature, Simple AI)
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

    const particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number; angle: number; spin: number }[] = [];
    const count =
      style === "lofi" ? 45 :
      style === "anime" ? 35 :
      style === "devotional" ? 32 :
      style === "cyberpunk" ? 42 :
      style === "nature" ? 32 :
      style === "simple_ai" ? 20 : 26;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: style === "anime" ? (Math.random() - 0.25) * 1.6 :
            style === "nature" ? (Math.random() - 0.3) * 1.3 :
            style === "devotional" ? (Math.random() - 0.5) * 0.7 :
            (Math.random() - 0.5) * 0.4,
        vy: style === "lofi" ? 3.5 + Math.random() * 4 :
            style === "cyberpunk" ? 5.5 + Math.random() * 5 :
            style === "devotional" ? -0.6 - Math.random() * 1.1 :
            style === "pixar" ? -0.8 - Math.random() * 1.2 :
            style === "nature" ? 0.9 + Math.random() * 1.6 :
            0.5 + Math.random() * 1.1,
        size: style === "lofi" ? 1.5 :
              style === "devotional" ? 2.5 + Math.random() * 3.5 :
              style === "pixar" ? 2.5 + Math.random() * 3 :
              style === "cyberpunk" ? 1.5 + Math.random() * 2 :
              style === "nature" ? 3 + Math.random() * 3.5 :
              2 + Math.random() * 2.5,
        alpha: 0.35 + Math.random() * 0.6,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.05,
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
      } else if (style === "devotional") {
        // Ethereal golden lotus petals & sacred divine radiance
        for (const p of particles) {
          ctx.save();
          p.angle += p.spin;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle);
          ctx.globalAlpha = p.alpha * (0.6 + 0.4 * Math.sin(time * 1.5 + p.x));
          ctx.fillStyle = "rgba(251, 191, 36, 0.9)";
          ctx.shadowColor = "rgba(245, 158, 11, 0.95)";
          ctx.shadowBlur = 14;
          // Petal leaf shape
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size * 1.6, p.size * 0.8, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          p.y += p.vy;
          p.x += Math.sin(time + p.y * 0.015) * 0.6;
          if (p.y < -15) { p.y = height + 15; p.x = Math.random() * width; }
          if (p.x > width) p.x = 0;
          if (p.x < 0) p.x = width;
        }
      } else if (style === "cyberpunk") {
        // Neon digital matrix rain streaks & cyan/magenta pulse
        ctx.lineWidth = 1.4;
        for (const p of particles) {
          const isCyan = (p.x | 0) % 2 === 0;
          ctx.strokeStyle = isCyan ? "rgba(6, 182, 212, 0.85)" : "rgba(244, 63, 94, 0.85)";
          ctx.shadowColor = ctx.strokeStyle;
          ctx.shadowBlur = 9;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x, p.y + p.vy * 2.8);
          ctx.stroke();
          p.y += p.vy;
          if (p.y > height) { p.y = -15; p.x = Math.random() * width; }
        }
      } else if (style === "nature") {
        // Organic drifting emerald leaves & sunlit pollen motes
        for (const p of particles) {
          ctx.save();
          p.angle += p.spin;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle);
          ctx.globalAlpha = p.alpha * (0.7 + 0.3 * Math.sin(time + p.x));
          ctx.fillStyle = p.size > 4 ? "rgba(74, 222, 128, 0.85)" : "rgba(250, 204, 21, 0.8)";
          ctx.shadowColor = "rgba(74, 222, 128, 0.6)";
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size * 1.5, p.size * 0.7, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          p.x += p.vx + Math.sin(time + p.y * 0.02) * 0.8;
          p.y += p.vy;
          if (p.y > height + 10) { p.y = -10; p.x = Math.random() * width; }
          if (p.x > width) p.x = 0;
          if (p.x < 0) p.x = width;
        }
      } else if (style === "simple_ai") {
        // Clean minimalist geometric focus particles
        for (const p of particles) {
          ctx.save();
          ctx.globalAlpha = p.alpha * 0.6;
          ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.75, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          p.x += (Math.sin(time * 0.5 + p.y * 0.01) - 0.5) * 0.4;
          p.y += p.vy * 0.7;
          if (p.y > height) { p.y = -5; p.x = Math.random() * width; }
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
          resolution,
        });
        setStatus({ kind: "ok", text: `Rendered audio and video from YouTube source at ${resolution.toUpperCase()}!` });
      } else if (tool === "slides") {
        if (!scenes.trim()) throw new Error("Add at least one scene line.");
        data = await postJson("/api/slides", {
          scenes,
          seconds,
          scene: selectedScene,
          watermark: watermark.trim(),
          aspectRatio,
          resolution,
        });
        setStatus({ kind: "ok", text: `Rendered ${data.moodLabel} story slides at ${resolution.toUpperCase()}!` });
      } else if (tool === "trim") {
        if (!result) throw new Error("Select or render a video first, then trim it.");
        const trimmed = await postJson<Result>("/api/trim-silence", { jobId: result.id });
        setResult(trimmed);
        setStatus({ kind: "ok", text: `Trimmed! Removed ${(trimmed.removedSeconds ?? 0).toFixed(1)}s of silent gaps.` });
        loadHistory();
        return;
      } else if (tool === "lyrics") {
        if (!lyricsText.trim()) throw new Error("Please enter or paste at least one line of lyrics.");
        data = await postJson("/api/lyrics-video", {
          prompt: prompt.trim() || "Telugu Lyrics Video",
          seconds,
          style,
          scene: selectedScene,
          aspectRatio,
          resolution,
          watermark: watermark.trim(),
          strictPromptAdherence,
          cameraMotion,
          lyrics: lyricsText.trim(),
          lyricsStyle: {
            position: lyricsPosition,
            size: lyricsFontSize,
            color: lyricsColor,
          },
          audioDataUrl: customAudioDataUrl,
        });
        setStatus({ kind: "ok", text: `Rendered synchronized on-screen lyrics video at ${resolution.toUpperCase()}!` });
      } else {
        if (!prompt.trim()) throw new Error("Enter a prompt describing your lofi mood.");
        data = await postJson("/api/generate", {
          prompt: prompt.trim(),
          seconds,
          style,
          mood,
          scene: selectedScene,
          aspectRatio,
          resolution,
          watermark: watermark.trim(),
          strictPromptAdherence,
          negativePrompt: negativePrompt.trim(),
          cameraMotion,
          lyrics: lyricsEnabled ? lyricsText.trim() : undefined,
          lyricsStyle: {
            position: lyricsPosition,
            size: lyricsFontSize,
            color: lyricsColor,
          },
          audioDataUrl: customAudioDataUrl || undefined,
        });
        setStatus({ kind: "ok", text: `Rendered ${resolution.toUpperCase()} video with ${data.moodLabel} palette!` });
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

  // Export high-resolution still artwork (Full HD, 2K, 4K)
  async function exportStillImage() {
    try {
      setStatus({ kind: "idle", text: `Rendering ${resolution.toUpperCase()} still artwork...` });
      const data = await postJson<{ url: string; resolution: string; dimensions: string }>("/api/render-image", {
        scene: selectedScene,
        style,
        resolution,
        aspectRatio,
        title: prompt.slice(0, 50),
        watermark: watermark.trim(),
      });
      setStatus({ kind: "ok", text: `Exported ${data.resolution.toUpperCase()} (${data.dimensions}) masterpiece image!` });
      const a = document.createElement("a");
      a.href = data.url;
      a.download = `lofi_studio_${data.resolution}_${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e: any) {
      setStatus({ kind: "error", text: "Image export failed: " + e.message });
    }
  }

  // Google AI Studio Actions
  async function handleGoogleEnhancePrompt() {
    if (!googlePrompt.trim()) return;
    setGoogleStatusText("Enhancing prompt with Google Gemini 2.0 Flash...");
    try {
      const res = await postJson<{ success: boolean; enhanced: string; provider: string }>("/api/google/enhance-prompt", {
        prompt: googlePrompt.trim(),
        category: googleCategory,
        subcategory: googleSubCategory,
        apiKey: googleApiKey.trim(),
      });
      if (res.enhanced) {
        setGooglePrompt(res.enhanced);
        setGoogleStatusText(`Prompt enhanced via ${res.provider}!`);
      }
    } catch (e: any) {
      setGoogleStatusText("Enhance notice: " + e.message);
    }
  }

  async function handleGoogleGenerateImage() {
    if (!googlePrompt.trim()) return;
    setGoogleGenerating(true);
    setGoogleStatusText("Generating artwork with Google Generative AI / Imagen 3...");
    try {
      const res = await postJson<any>("/api/google/generate-image", {
        prompt: googlePrompt.trim(),
        category: googleCategory,
        subcategory: googleSubCategory,
        resolution: googleResolution,
        aspectRatio: googleAspectRatio,
        apiKey: googleApiKey.trim(),
        enhancePrompt: true,
      });
      if (res.url) {
        setGoogleGeneratedImage(res.url);
        setSelectedScene(res.filename);
        setStyle(googleCategory as Style);
        setScenesList((prev) => [res.scene, ...prev]);
        setGoogleStatusText(`Success! Generated artwork via ${res.provider} at ${res.resolution.toUpperCase()}.`);
        setStatus({ kind: "ok", text: `Google AI artwork activated as living scene!` });
      }
    } catch (e: any) {
      setGoogleStatusText("Generation failed: " + e.message);
    } finally {
      setGoogleGenerating(false);
    }
  }

  async function handleGoogleGenerateVideo() {
    if (!googlePrompt.trim()) return;
    setGoogleGenerating(true);
    setGoogleStatusText("Synthesizing living video with Google Generative AI...");
    try {
      const res = await postJson<any>("/api/google/generate-video", {
        prompt: googlePrompt.trim(),
        category: googleCategory,
        subcategory: googleSubCategory,
        resolution: googleResolution,
        aspectRatio: googleAspectRatio,
        seconds,
        apiKey: googleApiKey.trim(),
        scene: googleGeneratedImage ? googleGeneratedImage.replace("/backgrounds/", "") : undefined,
      });
      if (res.id) {
        setResult(res);
        setPreviewMode(false);
        setGoogleGeneratedVideo(res);
        setGoogleStatusText(`Success! Rendered live video #${res.id} (${res.resolution.toUpperCase()} - ${res.dimensions}).`);
        setStatus({ kind: "ok", text: `Rendered live video with Google AI at ${res.resolution.toUpperCase()}!` });
        loadHistory();
      }
    } catch (e: any) {
      setGoogleStatusText("Video synthesis failed: " + e.message);
    } finally {
      setGoogleGenerating(false);
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

          {/* Google AI Studio Drawer Button */}
          <button
            type="button"
            className="action-btn"
            style={{
              padding: "0.45rem 0.85rem",
              fontSize: "0.82rem",
              minWidth: "auto",
              background: "linear-gradient(135deg, rgba(66, 133, 244, 0.22), rgba(219, 68, 85, 0.22))",
              border: "1px solid #4285f4",
              color: "var(--text)",
              fontWeight: 700,
            }}
            onClick={() => setGoogleModalOpen(true)}
            title="Generate AI images and living videos with Google Gemini & Imagen 3"
          >
            <span>✨ Google AI Studio</span>
          </button>

          {/* Unlimited Credits: 999999999 Always Unlimited & 100% Free Indicator */}
          <div
            className="credits-pill"
            style={{
              background: "linear-gradient(135deg, rgba(16, 185, 129, 0.22), rgba(59, 130, 246, 0.22))",
              borderColor: "var(--success)",
              color: "#6ee7b7",
            }}
            title="Unlimited Credits Active: 999,999,999 credits. 100% Free, zero paywalls, zero restrictions."
          >
            <span style={{ fontSize: "0.85rem" }}>⚡</span>
            <span style={{ fontWeight: 800 }}>{dailyCredits.remaining >= 999999999 ? "999,999,999" : dailyCredits.remaining.toLocaleString()} Credits</span>
            <span style={{ color: "rgba(255, 255, 255, 0.75)", fontWeight: 600, fontSize: "0.72rem" }}>• UNLIMITED FREE</span>
          </div>

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
              aria-selected={tool === "lyrics"}
              className={`mode-tab-btn ${tool === "lyrics" ? "active" : ""}`}
              onClick={() => setTool("lyrics")}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
              <span>On-Screen Lyrics</span>
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
              <span>Story Slides</span>
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

              {/* Strict Prompt Fidelity & Motion Drift Control */}
              <div className="fidelity-card">
                <div className="fidelity-header">
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "1.1rem" }}>🔒</span>
                    <div>
                      <strong style={{ fontSize: "0.88rem", display: "block" }}>
                        Strict Prompt Fidelity & Motion Control
                      </strong>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                        Locks character gaze & poses (e.g. smiling downward without looking into each other&apos;s faces)
                      </span>
                    </div>
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", fontSize: "0.8rem", fontWeight: 700 }}>
                    <input
                      type="checkbox"
                      checked={strictPromptAdherence}
                      onChange={(e) => setStrictPromptAdherence(e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: "#8b5cf6" }}
                    />
                    <span>{strictPromptAdherence ? "Strict Lock: ON" : "Drift Free: OFF"}</span>
                  </label>
                </div>

                {/* Motion Camera Preset Choice */}
                <div>
                  <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "0.35rem" }}>
                    Camera Motion & Pose Locking
                  </span>
                  <div className="motion-preset-grid">
                    <button
                      type="button"
                      className={`motion-preset-btn ${cameraMotion === "gaze_locked" ? "active" : ""}`}
                      onClick={() => setCameraMotion("gaze_locked")}
                    >
                      <span>🔒 Gaze & Pose Locked</span>
                      <span style={{ fontSize: "0.68rem", opacity: 0.75 }}>Micro-breath only, zero interaction drift</span>
                    </button>
                    <button
                      type="button"
                      className={`motion-preset-btn ${cameraMotion === "zero_drift" ? "active" : ""}`}
                      onClick={() => setCameraMotion("zero_drift")}
                    >
                      <span>⏸ Stationary (0% Drift)</span>
                      <span style={{ fontSize: "0.68rem", opacity: 0.75 }}>Static framing, maximum character hold</span>
                    </button>
                    <button
                      type="button"
                      className={`motion-preset-btn ${cameraMotion === "subtle_breath" ? "active" : ""}`}
                      onClick={() => setCameraMotion("subtle_breath")}
                    >
                      <span>🌊 Subtle Breath</span>
                      <span style={{ fontSize: "0.68rem", opacity: 0.75 }}>Gentle living atmosphere</span>
                    </button>
                    <button
                      type="button"
                      className={`motion-preset-btn ${cameraMotion === "slow_pan" ? "active" : ""}`}
                      onClick={() => setCameraMotion("slow_pan")}
                    >
                      <span>🎥 Horizon Pan</span>
                      <span style={{ fontSize: "0.68rem", opacity: 0.75 }}>Cinematic lateral camera drift</span>
                    </button>
                  </div>
                </div>

                {/* Negative Prompting Input */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                    <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Negative Prompt (What to Avoid)
                    </span>
                    <button
                      type="button"
                      className="preset-chip"
                      style={{ fontSize: "0.68rem", padding: "0.1rem 0.4rem" }}
                      onClick={() =>
                        setNegativePrompt(
                          "looking into each other's faces, direct eye contact, face to face interaction, turning head toward camera, breaking pose, distorted fingers, morphed face"
                        )
                      }
                    >
                      Reset Defaults
                    </button>
                  </div>
                  <input
                    type="text"
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="e.g. looking into each other's faces, head turns, extra hands..."
                    style={{
                      width: "100%",
                      fontSize: "0.8rem",
                      padding: "0.45rem 0.7rem",
                      borderRadius: 8,
                      background: "rgba(0, 0, 0, 0.35)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                    }}
                  />
                </div>

                {/* Optional Inline Lyrics Toggle */}
                <div style={{ paddingTop: "0.4rem", borderTop: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.45rem", cursor: "pointer", fontSize: "0.82rem" }}>
                    <input
                      type="checkbox"
                      checked={lyricsEnabled}
                      onChange={(e) => setLyricsEnabled(e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: "#10b981" }}
                    />
                    <span>Add Synchronized Lyrics / Subtitles to this video</span>
                  </label>
                  {lyricsEnabled && (
                    <button
                      type="button"
                      className="preset-chip"
                      style={{ fontSize: "0.72rem", padding: "0.15rem 0.5rem", color: "var(--success)" }}
                      onClick={() => setTool("lyrics")}
                    >
                      Open Full Lyrics Editor ↗
                    </button>
                  )}
                </div>
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

                {/* Category Filter Tabs */}
                <div className="category-filter-bar">
                  {[
                    { id: "all", label: "✨ All Categories" },
                    { id: "devotional", label: "🕉️ Devotional" },
                    { id: "anime", label: "🌸 Anime" },
                    { id: "lofi", label: "☕ LoFi" },
                    { id: "pixar", label: "🧸 Pixar 3D" },
                    { id: "cyberpunk", label: "⚡ Cyberpunk" },
                    { id: "nature", label: "🌿 Nature" },
                    { id: "simple_ai", label: "📐 Simple AI" },
                  ].map((cat) => {
                    const count = cat.id === "all" ? scenesList.length : scenesList.filter((s) => s.category === cat.id).length;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        className={`cat-pill ${activeCategory === cat.id ? "active" : ""}`}
                        onClick={() => {
                          setActiveCategory(cat.id as Category);
                          setActiveSubCategory("all");
                        }}
                      >
                        <span>{cat.label}</span>
                        <span style={{ opacity: 0.7, fontSize: "0.7rem" }}>({count})</span>
                      </button>
                    );
                  })}
                </div>

                {/* Subcategories Filter Bar */}
                <div className="subcategory-filter-bar">
                  <button
                    type="button"
                    className={`subcat-pill ${activeSubCategory === "all" ? "active" : ""}`}
                    onClick={() => setActiveSubCategory("all")}
                  >
                    <span>🌟 All Subcategories</span>
                  </button>
                  {SUBCATEGORIES.filter(
                    (sub) => activeCategory === "all" || sub.category === activeCategory
                  ).map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      className={`subcat-pill ${activeSubCategory === sub.id ? "active" : ""}`}
                      onClick={() => {
                        setActiveSubCategory(sub.id);
                        setSelectedScene(sub.scene);
                        if (sub.category !== "all") setStyle(sub.category as Style);
                        if (sub.mood) setMood(sub.mood);
                        if (sub.prompt) setPrompt(sub.prompt);
                        setPreviewMode(true);
                        setStatus({ kind: "ok", text: `Loaded subcategory preset: "${sub.name}"!` });
                      }}
                      title={sub.desc}
                    >
                      <span>{sub.icon}</span>
                      <span>{sub.name}</span>
                    </button>
                  ))}
                </div>

                <div className="scene-grid">
                  {scenesList
                    .filter((sc) => {
                      if (activeCategory !== "all" && sc.category !== activeCategory) return false;
                      if (activeSubCategory !== "all" && sc.subcategory && sc.subcategory !== activeSubCategory) return false;
                      return true;
                    })
                    .map((sc) => (
                      <div
                        key={sc.id}
                        className={`scene-card ${selectedScene === sc.id ? "active" : ""}`}
                        onClick={() => {
                          setSelectedScene(sc.id);
                          if (sc.style) setStyle(sc.style as Style);
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
                              {sc.style === "anime" ? "Anime" :
                               sc.style === "pixar" ? "Pixar 3D" :
                               sc.style === "devotional" ? "Devotional" :
                               sc.style === "cyberpunk" ? "Cyberpunk" :
                               sc.style === "nature" ? "Nature" :
                               sc.style === "simple_ai" ? "Simple AI" : "LoFi"}
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
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.2rem" }}>
                        <span className="style-name">{s.name}</span>
                        <span style={{ fontSize: "0.68rem", padding: "0.15rem 0.45rem", borderRadius: "999px", background: "var(--surface-hover)", color: "var(--accent)", fontWeight: 700 }}>
                          {s.badge}
                        </span>
                      </div>
                      <span className="style-desc">{s.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Tool: Dedicated Synchronized On-Screen Lyrics Studio */}
          {tool === "lyrics" && (
            <div className="lyrics-studio-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <span>🎵</span> Synchronized On-Screen Lyrics Studio
                  </h3>
                  <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.76rem", color: "var(--text-muted)" }}>
                    Type or paste exact Telugu, Hindi, or English lyrics without Instagram spelling errors.
                  </p>
                </div>
                {/* Language / Quick Presets */}
                <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="preset-chip"
                    onClick={() =>
                      setLyricsText(
                        "నిన్ను చూసిన వేళలో...\nమనసంతా నీదే కల...\nచేయి చేయి కలిపి నడుద్దాం...\nఈ మధుర క్షణాలు శాశ్వతం..."
                      )
                    }
                    title="Load popular Telugu romantic melody lyrics preset"
                  >
                    🌸 Telugu Melody
                  </button>
                  <button
                    type="button"
                    className="preset-chip"
                    onClick={() =>
                      setLyricsText(
                        "కృష్ణం వందే జగద్గురుమ్...\nరాధా మాధవ కుంజ విహారి...\nయమునా తీరమున వేణుగానం...\nదివ్య మంగళ స్వరూపం..."
                      )
                    }
                    title="Load Telugu devotional sacred sloka preset"
                  >
                    🙏 Telugu Devotional
                  </button>
                  <button
                    type="button"
                    className="preset-chip"
                    onClick={() =>
                      setLyricsText(
                        "Raindrops falling on the window glass...\nWatching the quiet midnight hours pass...\nWarm coffee, soft vinyl and endless dreams..."
                      )
                    }
                    title="Load English Lo-Fi lyrics preset"
                  >
                    🎧 LoFi English
                  </button>
                </div>
              </div>

              {/* Custom Song / Audio File Upload */}
              <div className="field">
                <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Custom Song Audio (Optional)</span>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    {customAudioName ? `✓ ${customAudioName}` : "MP3, WAV, AAC, M4A"}
                  </span>
                </label>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <label
                    className="preset-chip"
                    style={{
                      padding: "0.5rem 0.9rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      background: customAudioDataUrl ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.05)",
                      borderColor: customAudioDataUrl ? "var(--success)" : undefined,
                    }}
                  >
                    <span>📁</span>
                    <span>{customAudioDataUrl ? "Change Song File" : "Upload Custom Telugu Song"}</span>
                    <input
                      type="file"
                      accept="audio/*"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setCustomAudioName(file.name);
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            setCustomAudioDataUrl(ev.target?.result as string);
                            setStatus({ kind: "ok", text: `Loaded custom song audio: ${file.name}` });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                  {customAudioDataUrl && (
                    <button
                      type="button"
                      className="preset-chip"
                      onClick={() => {
                        setCustomAudioDataUrl(null);
                        setCustomAudioName("");
                      }}
                      style={{ color: "var(--error)" }}
                    >
                      ✕ Remove
                    </button>
                  )}
                  <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
                    {customAudioDataUrl
                      ? "Custom audio track active for video!"
                      : "Leave empty to use built-in procedural lofi chords"}
                  </span>
                </div>
              </div>

              {/* Lyrics Textarea */}
              <div className="field">
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                  <label htmlFor="lyricsText" style={{ margin: 0 }}>
                    Song Lyrics (Line-by-Line or Timed [MM:SS - MM:SS])
                  </label>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    {lyricsText.split("\n").filter(Boolean).length} lines • Auto-synced across {seconds}s
                  </span>
                </div>
                <textarea
                  id="lyricsText"
                  rows={5}
                  value={lyricsText}
                  onChange={(e) => setLyricsText(e.target.value)}
                  placeholder={"Type your Telugu or English lyrics here:\n\nనిన్ను చూసిన వేళలో...\nమనసంతా నీదే కల...\nచేయి చేయి కలిపి నడుద్దాం..."}
                />
              </div>

              {/* Typography & Subtitle Layout Controls */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.8rem" }}>
                <div className="field">
                  <label>Subtitle Position</label>
                  <div className="ratio-options">
                    <button
                      type="button"
                      className={`ratio-btn ${lyricsPosition === "bottom" ? "active" : ""}`}
                      onClick={() => setLyricsPosition("bottom")}
                    >
                      Bottom
                    </button>
                    <button
                      type="button"
                      className={`ratio-btn ${lyricsPosition === "center" ? "active" : ""}`}
                      onClick={() => setLyricsPosition("center")}
                    >
                      Center
                    </button>
                    <button
                      type="button"
                      className={`ratio-btn ${lyricsPosition === "top" ? "active" : ""}`}
                      onClick={() => setLyricsPosition("top")}
                    >
                      Top
                    </button>
                  </div>
                </div>

                <div className="field">
                  <label>
                    <span>Font Size ({lyricsFontSize}px)</span>
                  </label>
                  <input
                    type="range"
                    min={20}
                    max={48}
                    step={2}
                    value={lyricsFontSize}
                    onChange={(e) => setLyricsFontSize(Number(e.target.value))}
                  />
                </div>

                <div className="field">
                  <label>Text Color</label>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    {[
                      { name: "White", val: "#ffffff" },
                      { name: "Gold", val: "#fcd34d" },
                      { name: "Cyan", val: "#67e8f9" },
                      { name: "Sakura", val: "#f472b6" },
                    ].map((c) => (
                      <button
                        key={c.val}
                        type="button"
                        className="preset-chip"
                        style={{
                          background: lyricsColor === c.val ? c.val : undefined,
                          color: lyricsColor === c.val ? "#000" : undefined,
                          borderColor: c.val,
                          fontWeight: 700,
                          fontSize: "0.75rem",
                          padding: "0.2rem 0.55rem",
                        }}
                        onClick={() => setLyricsColor(c.val)}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
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

              {/* Output Resolution Selector (Full HD, 2K, 4K) */}
              <div className="field">
                <label>
                  <span>Video & Image Resolution</span>
                  <span style={{ fontSize: "0.72rem", color: "var(--accent)", fontWeight: 600 }}>
                    {resolution === "4k" ? "Ultra HD 2160p Cinema" : resolution === "2k" ? "Quad HD 1440p Master" : resolution === "1080p" ? "Full HD 1080p Standard" : "HD 720p Fast"}
                  </span>
                </label>
                <div className="resolution-options">
                  {RESOLUTION_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className={`resolution-btn ${resolution === opt.id ? "active" : ""}`}
                      onClick={() => setResolution(opt.id)}
                    >
                      <span className="res-badge">{opt.badge}</span>
                      <span className="res-name">{opt.name}</span>
                      <span className="res-dim">
                        {opt.id === "4k" ? "3840×2160" : opt.id === "2k" ? "2560×1440" : opt.id === "1080p" ? "1920×1080" : "1280×720"}
                      </span>
                    </button>
                  ))}
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

          {/* Action CTA Buttons */}
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            <button
              type="button"
              className="cta-button"
              disabled={busy}
              onClick={generate}
              style={{ flex: "1 1 200px" }}
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
                      : `Generate ${resolution.toUpperCase()} Video`}
                  </span>
                </>
              )}
            </button>

            <button
              type="button"
              className="preset-chip"
              disabled={busy}
              onClick={exportStillImage}
              style={{
                padding: "0.85rem 1.1rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
                background: "rgba(255, 255, 255, 0.05)",
                color: "var(--text)",
                fontWeight: 600,
                fontSize: "0.88rem",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
              title="Render and download high-resolution still image with current artwork and typography grade"
            >
              <span>📸 Export {resolution.toUpperCase()} Image</span>
            </button>

            <button
              type="button"
              className="preset-chip"
              disabled={busy}
              onClick={() => setGoogleModalOpen(true)}
              style={{
                padding: "0.85rem 1.1rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid rgba(139, 92, 246, 0.35)",
                background: "rgba(139, 92, 246, 0.12)",
                color: "#c4b5fd",
                fontWeight: 600,
                fontSize: "0.88rem",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
              title="Open Google Imagen 3 & Gemini AI Studio Generator"
            >
              <span>✨ Google AI Studio</span>
            </button>
          </div>

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
                    {(result?.resolution || resolution) && (
                      <span style={{ color: "var(--accent)", fontWeight: 700 }}>
                        {(result?.resolution || resolution).toUpperCase()}
                      </span>
                    )}
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

                  {/* Live Karaoke / Lyric Subtitle Preview Overlay */}
                  {(lyricsEnabled || tool === "lyrics") && lyricsText && (
                    <div
                      style={{
                        position: "absolute",
                        zIndex: 4,
                        left: "6%",
                        right: "6%",
                        ...(lyricsPosition === "top"
                          ? { top: 18 }
                          : lyricsPosition === "center"
                          ? { top: "50%", transform: "translateY(-50%)" }
                          : { bottom: 18 }),
                        display: "flex",
                        justifyContent: "center",
                        pointerEvents: "none",
                      }}
                    >
                      <div
                        style={{
                          background: "rgba(0, 0, 0, 0.82)",
                          border: "1px solid rgba(255, 255, 255, 0.25)",
                          borderRadius: 8,
                          padding: "0.45rem 1rem",
                          color: lyricsColor || "#ffffff",
                          fontSize: `${Math.min(24, Math.max(14, lyricsFontSize))}px`,
                          fontWeight: 700,
                          textAlign: "center",
                          boxShadow: "0 4px 18px rgba(0, 0, 0, 0.6)",
                          maxWidth: "92%",
                          whiteSpace: "pre-wrap",
                          backdropFilter: "blur(6px)",
                        }}
                      >
                        🎵 {lyricsText.split("\n").filter((l) => l.trim().length > 0)[0] || "Sample Lyric Line"}
                      </div>
                    </div>
                  )}
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
                  className={`ref-tab-btn ${refCategory === "devotional" ? "active" : ""}`}
                  onClick={() => setRefCategory("devotional")}
                >
                  <span>🕉️ Devotional</span>
                  <span style={{ opacity: 0.8 }}>({refCounts.devotional || 2})</span>
                </button>
                <button
                  type="button"
                  className={`ref-tab-btn ${refCategory === "anime" ? "active" : ""}`}
                  onClick={() => setRefCategory("anime")}
                >
                  <span>🌸 Anime</span>
                  <span style={{ opacity: 0.8 }}>({refCounts.anime})</span>
                </button>
                <button
                  type="button"
                  className={`ref-tab-btn ${refCategory === "lofi" ? "active" : ""}`}
                  onClick={() => setRefCategory("lofi")}
                >
                  <span>🎧 LoFi</span>
                  <span style={{ opacity: 0.8 }}>({refCounts.lofi})</span>
                </button>
                <button
                  type="button"
                  className={`ref-tab-btn ${refCategory === "pixar" ? "active" : ""}`}
                  onClick={() => setRefCategory("pixar")}
                >
                  <span>🧸 Pixar</span>
                  <span style={{ opacity: 0.8 }}>({refCounts.pixar})</span>
                </button>
                <button
                  type="button"
                  className={`ref-tab-btn ${refCategory === "cyberpunk" ? "active" : ""}`}
                  onClick={() => setRefCategory("cyberpunk")}
                >
                  <span>⚡ Cyberpunk</span>
                  <span style={{ opacity: 0.8 }}>({refCounts.cyberpunk || 1})</span>
                </button>
                <button
                  type="button"
                  className={`ref-tab-btn ${refCategory === "nature" ? "active" : ""}`}
                  onClick={() => setRefCategory("nature")}
                >
                  <span>🌿 Nature</span>
                  <span style={{ opacity: 0.8 }}>({refCounts.nature || 1})</span>
                </button>
                <button
                  type="button"
                  className={`ref-tab-btn ${refCategory === "simple_ai" ? "active" : ""}`}
                  onClick={() => setRefCategory("simple_ai")}
                >
                  <span>📐 Simple AI</span>
                  <span style={{ opacity: 0.8 }}>({refCounts.simple_ai || 1})</span>
                </button>
                <button
                  type="button"
                  className={`ref-tab-btn ${refCategory === "videos" ? "active" : ""}`}
                  onClick={() => setRefCategory("videos")}
                >
                  <span>🎬 Stock Videos</span>
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

      {/* Google Generative AI Studio Modal (Gemini 2.0 & Imagen 3) */}
      {googleModalOpen && (
        <div className="google-modal-backdrop" onClick={() => setGoogleModalOpen(false)}>
          <div className="google-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="google-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <span style={{ fontSize: "1.4rem" }}>✨</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>
                    Google Generative AI Studio
                  </h3>
                  <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    Direct Gemini 2.0 Flash prompt enhancement & Imagen 3 4K backdrop / living video synthesis
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="preset-chip"
                style={{ fontSize: "1rem", padding: "0.2rem 0.6rem" }}
                onClick={() => setGoogleModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="google-modal-body">
              {/* Google API Key input */}
              <div className="field">
                <label htmlFor="google-api-key" style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Google AI Studio API Key (Gemini & Imagen)</span>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: "0.75rem", color: "var(--accent)", textDecoration: "underline" }}
                  >
                    Get Free Key ↗
                  </a>
                </label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    id="google-api-key"
                    type={googleKeyVisible ? "text" : "password"}
                    placeholder="AIzaSy... (Leave blank to use built-in procedural HD/4K generator)"
                    value={googleApiKey}
                    onChange={(e) => {
                      setGoogleApiKey(e.target.value);
                      try {
                        localStorage.setItem("google_api_key", e.target.value);
                      } catch {}
                    }}
                    style={{ flex: 1, fontFamily: "monospace", fontSize: "0.85rem" }}
                  />
                  <button
                    type="button"
                    className="preset-chip"
                    onClick={() => setGoogleKeyVisible(!googleKeyVisible)}
                    style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}
                  >
                    {googleKeyVisible ? "Hide" : "Show"}
                  </button>
                </div>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.2rem", display: "block" }}>
                  * No key required: If no key is entered, high-fidelity procedural 4K renderers and mood palettes are automatically used.
                </span>
              </div>

              {/* Category & Subcategory Selectors */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
                <div className="field">
                  <label>Category</label>
                  <select
                    value={googleCategory}
                    onChange={(e) => {
                      const cat = e.target.value as Category;
                      setGoogleCategory(cat);
                      const firstSub = SUBCATEGORIES.find((s) => s.category === cat);
                      if (firstSub) {
                        setGoogleSubCategory(firstSub.id);
                        setGooglePrompt(firstSub.prompt);
                      }
                    }}
                    style={{
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                      padding: "0.6rem 0.8rem",
                      borderRadius: 8,
                      width: "100%",
                      fontSize: "0.88rem",
                    }}
                  >
                    <option value="devotional">🙏 Devotional (Vedic / Temples)</option>
                    <option value="anime">🌸 Anime Aesthetic (Makoto / Ghibli)</option>
                    <option value="lofi">🎧 Classic LoFi (Rain / Bedroom)</option>
                    <option value="pixar">✨ Pixar 3D (Warm / Volumetric)</option>
                    <option value="cyberpunk">🌆 Cyberpunk (Neon / Rain)</option>
                    <option value="nature">🌿 Nature Zen (Forest / Water)</option>
                    <option value="simple_ai">🎨 Simple AI (Minimal Flow)</option>
                  </select>
                </div>

                <div className="field">
                  <label>Subcategory Concept</label>
                  <select
                    value={googleSubCategory}
                    onChange={(e) => {
                      const subId = e.target.value;
                      setGoogleSubCategory(subId);
                      const found = SUBCATEGORIES.find((s) => s.id === subId);
                      if (found) setGooglePrompt(found.prompt);
                    }}
                    style={{
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                      padding: "0.6rem 0.8rem",
                      borderRadius: 8,
                      width: "100%",
                      fontSize: "0.88rem",
                    }}
                  >
                    {SUBCATEGORIES.filter((s) => s.category === googleCategory).map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Prompt Textarea + Gemini Enhance Button */}
              <div className="field">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                  <label htmlFor="google-prompt" style={{ margin: 0 }}>Scene / Concept Prompt</label>
                  <button
                    type="button"
                    className="preset-chip"
                    onClick={handleGoogleEnhancePrompt}
                    disabled={googleGenerating || !googlePrompt.trim()}
                    style={{
                      padding: "0.2rem 0.6rem",
                      fontSize: "0.75rem",
                      background: "rgba(139, 92, 246, 0.2)",
                      borderColor: "rgba(139, 92, 246, 0.5)",
                      color: "#c4b5fd",
                      fontWeight: 600,
                    }}
                  >
                    ✨ Gemini 2.0 Flash Enhance
                  </button>
                </div>
                <textarea
                  id="google-prompt"
                  rows={3}
                  value={googlePrompt}
                  onChange={(e) => setGooglePrompt(e.target.value)}
                  placeholder="Describe your desired scene, lighting, mood, elements..."
                  style={{
                    width: "100%",
                    borderRadius: 8,
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    padding: "0.6rem 0.8rem",
                    fontSize: "0.88rem",
                    resize: "vertical",
                  }}
                />
              </div>

              {/* Resolution & Aspect Ratio Settings */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
                <div className="field">
                  <label>Resolution Tier</label>
                  <div className="resolution-options" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
                    {RESOLUTION_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        className={`resolution-btn ${googleResolution === opt.id ? "active" : ""}`}
                        onClick={() => setGoogleResolution(opt.id)}
                        style={{ padding: "0.4rem 0.5rem" }}
                      >
                        <span className="res-badge" style={{ fontSize: "0.7rem" }}>{opt.badge}</span>
                        <span className="res-name" style={{ fontSize: "0.75rem" }}>{opt.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="field">
                  <label>Aspect Ratio</label>
                  <div className="ratio-options">
                    <button
                      type="button"
                      className={`ratio-btn ${googleAspectRatio === "16:9" ? "active" : ""}`}
                      onClick={() => setGoogleAspectRatio("16:9")}
                      style={{ padding: "0.4rem 0.5rem", fontSize: "0.78rem" }}
                    >
                      16:9
                    </button>
                    <button
                      type="button"
                      className={`ratio-btn ${googleAspectRatio === "9:16" ? "active" : ""}`}
                      onClick={() => setGoogleAspectRatio("9:16")}
                      style={{ padding: "0.4rem 0.5rem", fontSize: "0.78rem" }}
                    >
                      9:16
                    </button>
                    <button
                      type="button"
                      className={`ratio-btn ${googleAspectRatio === "1:1" ? "active" : ""}`}
                      onClick={() => setGoogleAspectRatio("1:1")}
                      style={{ padding: "0.4rem 0.5rem", fontSize: "0.78rem" }}
                    >
                      1:1
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="cta-button"
                  disabled={googleGenerating || !googlePrompt.trim()}
                  onClick={handleGoogleGenerateImage}
                  style={{
                    flex: "1 1 180px",
                    background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                    padding: "0.75rem 1rem",
                  }}
                >
                  {googleGenerating ? (
                    <>
                      <div className="step-indicator spinning" style={{ width: 16, height: 16 }} />
                      <span>Generating with Google...</span>
                    </>
                  ) : (
                    <span>🎨 Synthesize Imagen 3 Artwork</span>
                  )}
                </button>

                <button
                  type="button"
                  className="cta-button"
                  disabled={googleGenerating || !googlePrompt.trim()}
                  onClick={handleGoogleGenerateVideo}
                  style={{
                    flex: "1 1 180px",
                    background: "linear-gradient(135deg, #059669, #10b981)",
                    padding: "0.75rem 1rem",
                  }}
                >
                  {googleGenerating ? (
                    <>
                      <div className="step-indicator spinning" style={{ width: 16, height: 16 }} />
                      <span>Synthesizing Live Video...</span>
                    </>
                  ) : (
                    <span>🎬 Synthesize Full Live Video</span>
                  )}
                </button>
              </div>

              {/* Status Message */}
              {googleStatusText && (
                <div
                  style={{
                    padding: "0.6rem 0.8rem",
                    borderRadius: 8,
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid var(--border)",
                    fontSize: "0.82rem",
                    color: "var(--accent)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <span className="step-indicator spinning" style={{ width: 12, height: 12, display: googleGenerating ? "inline-block" : "none" }} />
                  <span>{googleStatusText}</span>
                </div>
              )}

              {/* Generated Image Preview */}
              {googleGeneratedImage && (
                <div
                  style={{
                    borderRadius: 12,
                    overflow: "hidden",
                    border: "1px solid var(--border)",
                    background: "#000",
                    position: "relative",
                  }}
                >
                  <img
                    src={googleGeneratedImage}
                    alt="Generated Artwork"
                    style={{ width: "100%", maxHeight: 240, objectFit: "cover", display: "block" }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      bottom: 8,
                      right: 8,
                      display: "flex",
                      gap: "0.4rem",
                    }}
                  >
                    <a
                      href={googleGeneratedImage}
                      download="google_ai_artwork.jpg"
                      className="preset-chip"
                      style={{ background: "rgba(0, 0, 0, 0.75)", color: "#fff", textDecoration: "none" }}
                    >
                      💾 Download JPG
                    </a>
                    <button
                      type="button"
                      className="preset-chip"
                      style={{ background: "var(--accent)", color: "#000", fontWeight: 700 }}
                      onClick={() => {
                        setSelectedScene(googleGeneratedImage.replace("/backgrounds/", ""));
                        setGoogleModalOpen(false);
                      }}
                    >
                      ✓ Applied to Stage
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
