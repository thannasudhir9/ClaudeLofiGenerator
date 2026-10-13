// Web Audio API ambient sound generator (Vinyl Crackle, Rain, Tape Hiss)
// Generates audio procedurally in-browser without needing external MP3/WAV files.

class AmbientSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private vinylGain: GainNode | null = null;
  private rainGain: GainNode | null = null;
  private hissGain: GainNode | null = null;

  private vinylSource: AudioBufferSourceNode | null = null;
  private rainSource: AudioBufferSourceNode | null = null;
  private hissSource: AudioBufferSourceNode | null = null;

  private isPlaying = false;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.5;
      this.masterGain.connect(this.ctx.destination);

      this.vinylGain = this.ctx.createGain();
      this.vinylGain.gain.value = 0.4;
      this.vinylGain.connect(this.masterGain);

      this.rainGain = this.ctx.createGain();
      this.rainGain.gain.value = 0.35;
      this.rainGain.connect(this.masterGain);

      this.hissGain = this.ctx.createGain();
      this.hissGain.gain.value = 0.15;
      this.hissGain.connect(this.masterGain);
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  // Generate 5 seconds of procedural vinyl crackle loop
  private createVinylBuffer(): AudioBuffer {
    if (!this.ctx) throw new Error("No context");
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * 5;
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      // Soft background rumble
      let sample = (Math.random() * 2 - 1) * 0.006;
      // Random dust ticks and needle pops
      if (Math.random() < 0.0012) {
        sample += (Math.random() * 2 - 1) * 0.28;
      }
      if (Math.random() < 0.00015) {
        sample += (Math.random() * 2 - 1) * 0.65;
      }
      data[i] = sample;
    }
    return buffer;
  }

  // Generate 6 seconds of procedural gentle rain noise loop
  private createRainBuffer(): AudioBuffer {
    if (!this.ctx) throw new Error("No context");
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * 6;
    const buffer = this.ctx.createBuffer(2, length, sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        // Pink noise filter
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.969 * b2 + white * 0.153852;
        const pink = b0 + b1 + b2 + white * 0.5362;
        data[i] = pink * 0.08;
      }
    }
    return buffer;
  }

  // Generate 4 seconds of warm tape hiss
  private createHissBuffer(): AudioBuffer {
    if (!this.ctx) throw new Error("No context");
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * 4;
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = 0.7 * last + 0.3 * white;
      data[i] = last * 0.02;
    }
    return buffer;
  }

  public start() {
    this.initContext();
    if (!this.ctx || this.isPlaying) return;

    // Vinyl
    const vinylBuf = this.createVinylBuffer();
    this.vinylSource = this.ctx.createBufferSource();
    this.vinylSource.buffer = vinylBuf;
    this.vinylSource.loop = true;
    this.vinylSource.connect(this.vinylGain!);
    this.vinylSource.start();

    // Rain
    const rainBuf = this.createRainBuffer();
    this.rainSource = this.ctx.createBufferSource();
    this.rainSource.buffer = rainBuf;
    this.rainSource.loop = true;
    // Add a gentle lowpass filter to rain
    const rainFilter = this.ctx.createBiquadFilter();
    rainFilter.type = "lowpass";
    rainFilter.frequency.value = 1600;
    this.rainSource.connect(rainFilter);
    rainFilter.connect(this.rainGain!);
    this.rainSource.start();

    // Hiss
    const hissBuf = this.createHissBuffer();
    this.hissSource = this.ctx.createBufferSource();
    this.hissSource.buffer = hissBuf;
    this.hissSource.loop = true;
    this.hissSource.connect(this.hissGain!);
    this.hissSource.start();

    this.isPlaying = true;
  }

  public stop() {
    try {
      this.vinylSource?.stop();
      this.rainSource?.stop();
      this.hissSource?.stop();
    } catch {}
    this.vinylSource = null;
    this.rainSource = null;
    this.hissSource = null;
    this.isPlaying = false;
  }

  public toggle(): boolean {
    if (this.isPlaying) {
      this.stop();
      return false;
    } else {
      this.start();
      return true;
    }
  }

  public setMasterVolume(v: number) {
    if (this.masterGain) this.masterGain.gain.value = Math.max(0, Math.min(1, v));
  }

  public setVinylVolume(v: number) {
    if (this.vinylGain) this.vinylGain.gain.value = Math.max(0, Math.min(1, v));
  }

  public setRainVolume(v: number) {
    if (this.rainGain) this.rainGain.gain.value = Math.max(0, Math.min(1, v));
  }

  public setHissVolume(v: number) {
    if (this.hissGain) this.hissGain.gain.value = Math.max(0, Math.min(1, v));
  }

  public getStatus() {
    return this.isPlaying;
  }
}

export const ambientSound = typeof window !== "undefined" ? new AmbientSoundEngine() : null;
