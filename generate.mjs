import { writeFileSync } from "node:fs";

const SAMPLE_RATE = 44100;

const CHORDS = {
  Cmaj7: [261.63, 329.63, 392.0, 493.88],
  Am7: [220.0, 261.63, 329.63, 392.0],
  Fmaj7: [174.61, 220.0, 261.63, 329.63],
  G7: [196.0, 246.94, 293.66, 349.23],
  Dm7: [146.83, 174.61, 220.0, 261.63],
  Em7: [164.81, 196.0, 246.94, 293.66],
  Bm7: [246.94, 293.66, 369.99, 440.0],
  E7: [164.81, 207.65, 246.94, 293.66],
  Amaj7: [220.0, 277.18, 329.63, 415.3],
  Dmaj7: [146.83, 185.0, 220.0, 277.18],
  Bbmaj7: [233.08, 293.66, 349.23, 440.0],
  Gm7: [196.0, 233.08, 293.66, 349.23],
};

export const MOODS = {
  night: {
    label: "Night Rain",
    bpm: 74,
    progression: ["Dm7", "G7", "Cmaj7", "Am7"],
    colors: ["0x0b1d33", "0x2a4a6b"],
    tag: "Late night study & gentle rain",
    defaultBg: "lofi_study_girl.jpg",
  },
  sunset: {
    label: "Golden Hour",
    bpm: 78,
    progression: ["Fmaj7", "Em7", "Dm7", "Cmaj7"],
    colors: ["0x3a1c2e", "0xd9793f"],
    tag: "Warm dusk breeze & rooftop vibes",
    defaultBg: "lofi_sunset_balcony.jpg",
  },
  morning: {
    label: "Slow Morning",
    bpm: 72,
    progression: ["Cmaj7", "Dm7", "Em7", "Fmaj7"],
    colors: ["0x253b30", "0xdfbe99"],
    tag: "Fresh brewed coffee & morning calm",
    defaultBg: "lofi_slow_morning.jpg",
  },
  lofi_cafe: {
    label: "Cozy Cafe",
    bpm: 75,
    progression: ["Cmaj7", "Em7", "Am7", "Dm7"],
    colors: ["0x261910", "0xa36842"],
    tag: "Rainy bookstore & warm espresso",
    defaultBg: "lofi_rainy_cafe.jpg",
  },
  cyberpunk: {
    label: "Neon Midnight",
    bpm: 82,
    progression: ["Am7", "Fmaj7", "Dm7", "Em7"],
    colors: ["0x110e2b", "0x632d84"],
    tag: "Tokyo synth reflections & neon mist",
    defaultBg: "lofi_tokyo_cyberpunk.jpg",
  },
  dreamy: {
    label: "Starlight Drift",
    bpm: 70,
    progression: ["Fmaj7", "G7", "Em7", "Am7"],
    colors: ["0x12142e", "0x534ba0"],
    tag: "Cosmic floating & deep slumber",
    defaultBg: "lofi_starlight_bedroom.jpg",
  },
  autumn: {
    label: "Autumn Leaves",
    bpm: 76,
    progression: ["Dm7", "Am7", "Bbmaj7", "Cmaj7"],
    colors: ["0x2a1612", "0x9e4324"],
    tag: "Fallen leaves & vintage cassette nostalgia",
    defaultBg: "lofi_study_girl.jpg",
  },
  shinkai_anime: {
    label: "Shinkai Twilight",
    bpm: 78,
    progression: ["Fmaj7", "G7", "Em7", "Am7"],
    colors: ["0x2d1742", "0xe0726d"],
    tag: "Makoto Shinkai anime piano & radiant sunset breeze",
    defaultBg: "anime_shinkai_sunset.jpg",
  },
  pixar_cozy: {
    label: "Pixar Hearth",
    bpm: 72,
    progression: ["Cmaj7", "Fmaj7", "Dm7", "G7"],
    colors: ["0x3a1908", "0xe68c43"],
    tag: "3D animated fireplace warmth & storybook chimes",
    defaultBg: "pixar_cozy_cabin.jpg",
  },
  ghibli_garden: {
    label: "Ghibli Garden",
    bpm: 74,
    progression: ["Cmaj7", "Em7", "Fmaj7", "G7"],
    colors: ["0x1d3822", "0x88c270"],
    tag: "Summer cottage porch & hand-painted peace",
    defaultBg: "anime_ghibli_garden.jpg",
  },
};

export function pickMood(prompt) {
  if (!prompt || typeof prompt !== "string") return "night";
  const p = prompt.toLowerCase();
  if (/pixar|3d|disney|fireplace|cabin|puppy|bloom/.test(p)) return "pixar_cozy";
  if (/shinkai|anime|twilight|train|manga|your name/.test(p)) return "shinkai_anime";
  if (/ghibli|miyazaki|garden|cottage|butterfly|porch/.test(p)) return "ghibli_garden";
  if (/neon|cyber|synth|future|tokyo|blade|matrix|drive/.test(p)) return "cyberpunk";
  if (/cafe|coffee|book|library|tea|bakery|espresso|acoustic/.test(p)) return "lofi_cafe";
  if (/dream|star|space|cosmic|cloud|drift|sleep|celestial/.test(p)) return "dreamy";
  if (/autumn|fall|leaves|october|ember|harvest|wood/.test(p)) return "autumn";
  if (/sunset|golden|warm|dusk|evening|twilight/.test(p)) return "sunset";
  if (/morning|sun|cozy|breakfast|dawn|light|fresh/.test(p)) return "morning";
  return "night";
}

function seededRandom(seedStr) {
  let h = 2166136261;
  for (const ch of seedStr) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  if (h === 0) h = 1;
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return (h >>> 0) / 4294967296;
  };
}

export function synthesizeLofi(moodKey, seconds, seed) {
  const m = MOODS[moodKey] || MOODS.night;
  const rand = seededRandom(seed || "lofi-master");
  const total = Math.floor(seconds * SAMPLE_RATE);
  const out = new Float32Array(total);

  const bpm = m.bpm || 75;
  const beatLen = 60 / bpm;
  const barLen = beatLen * 4;
  const stepLen = beatLen / 4; // 16th note

  // Progression
  const progression = m.progression.map((name) => CHORDS[name] || CHORDS.Cmaj7);

  // 1. Synthesize Lofi Drum Kit (Kick, Snare/Rimshot, Hi-hats)
  for (let t_sec = 0; t_sec < seconds; t_sec += barLen) {
    for (let step = 0; step < 16; step++) {
      const stepTime = t_sec + step * stepLen;
      if (stepTime >= seconds) break;
      const i0 = Math.floor(stepTime * SAMPLE_RATE);

      // Kick drum on 0, 7 (ghost kick), 8
      if (step === 0 || step === 8 || step === 7) {
        const vel = step === 7 ? 0.45 : 0.85;
        const kickLen = Math.floor(0.28 * SAMPLE_RATE);
        for (let i = 0; i < kickLen && i0 + i < total; i++) {
          const t = i / SAMPLE_RATE;
          // Pitch sweep 140 -> 46 Hz
          const freq = 46 + 94 * Math.exp(-t * 26);
          const env = Math.exp(-t * 13);
          const sample = Math.sin(2 * Math.PI * freq * t) * env * vel;
          out[i0 + i] += Math.tanh(sample * 1.5) * 0.48;
        }
      }

      // Snare / Rimshot on 4, 12
      if (step === 4 || step === 12) {
        const snareLen = Math.floor(0.2 * SAMPLE_RATE);
        for (let i = 0; i < snareLen && i0 + i < total; i++) {
          const t = i / SAMPLE_RATE;
          const noise = (rand() * 2 - 1) * Math.exp(-t * 24);
          const tone = Math.sin(2 * Math.PI * 185 * t) * Math.exp(-t * 32);
          out[i0 + i] += (noise * 0.4 + tone * 0.3) * 0.42;
        }
      }

      // Hi-Hats on even steps + swing on step 10
      if (step % 2 === 0 || step === 10) {
        const isOpen = step === 10;
        const hatLen = Math.floor((isOpen ? 0.18 : 0.05) * SAMPLE_RATE);
        const vel = isOpen ? 0.4 : (step % 4 === 0 ? 0.28 : 0.18);
        for (let i = 0; i < hatLen && i0 + i < total; i++) {
          const t = i / SAMPLE_RATE;
          const noise = (rand() * 2 - 1) * Math.exp(-t * (isOpen ? 18 : 65));
          out[i0 + i] += noise * vel * 0.32;
        }
      }
    }
  }

  // 2. Synthesize Rhodes Electric Piano Chords & Bassline
  for (let bar = 0; bar * barLen < seconds; bar++) {
    const barTime = bar * barLen;
    const chord = progression[bar % progression.length];

    // Downbeat chord strike + syncopated offbeat tap
    const hits = [
      { time: barTime, dur: barLen * 0.68, vel: 0.85 },
      { time: barTime + beatLen * 1.5, dur: barLen * 0.32, vel: 0.58 },
    ];

    for (const hit of hits) {
      if (hit.time >= seconds) break;
      const i0 = Math.floor(hit.time * SAMPLE_RATE);
      const hitSamples = Math.floor(hit.dur * SAMPLE_RATE);

      for (let i = 0; i < hitSamples && i0 + i < total; i++) {
        const t = i / SAMPLE_RATE;
        // Key strike attack & smooth decay
        const env = Math.min(1, t / 0.012) * Math.exp(-t * 1.6);
        // Analog tape wow & flutter
        const wow = 1 + 0.0016 * Math.sin(2 * Math.PI * 0.3 * (hit.time + t));
        // Vintage stereo tremolo
        const tremolo = 0.86 + 0.14 * Math.sin(2 * Math.PI * 1.4 * (hit.time + t));

        let chordSample = 0;
        for (const freq of chord) {
          const p = 2 * Math.PI * freq * wow * t;
          chordSample += Math.sin(p) + 0.38 * Math.sin(2 * p) + 0.14 * Math.sin(3 * p) + 0.06 * Math.sin(4 * p);
        }

        // Sub bass on root frequency
        const bassFreq = chord[0] * 0.5;
        const bass = Math.sin(2 * Math.PI * bassFreq * wow * t) * Math.exp(-t * 2.0);

        out[i0 + i] += (chordSample * 0.055 + bass * 0.15) * env * tremolo * hit.vel;
      }
    }
  }

  // 3. Vintage Lowpass Filtering, Tape Hiss & Vinyl Crackle
  let lp = 0;
  for (let i = 0; i < total; i++) {
    let x = out[i];
    // Gentle tape hiss
    x += (rand() * 2 - 1) * 0.004;
    // Vinyl crackle / pop
    if (rand() < 0.00035) x += (rand() * 2 - 1) * 0.18;
    // Warm lowpass filter
    lp += 0.36 * (x - lp);
    out[i] = lp;
  }

  // 4. Master Normalization & Fade In/Out
  let peak = 0;
  for (let i = 0; i < total; i++) peak = Math.max(peak, Math.abs(out[i]));
  const gain = peak > 0 ? 0.88 / peak : 1;
  const fade = Math.min(Math.floor(SAMPLE_RATE * 0.6), Math.floor(total / 4));
  for (let i = 0; i < total; i++) {
    let g = gain;
    if (i < fade) g *= i / fade;
    if (total - i < fade) g *= (total - i) / fade;
    out[i] *= g;
  }

  return out;
}

function writeWav(filePath, samples) {
  const dataBytes = samples.length * 2;
  const buf = Buffer.alloc(44 + dataBytes);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataBytes, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataBytes, 40);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  writeFileSync(filePath, buf);
}

export function renderWav(filePath, { mood, seconds, seed }) {
  writeWav(filePath, synthesizeLofi(mood, seconds, seed));
}
