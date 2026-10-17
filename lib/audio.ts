/**
 * Projector ambience synthesised with Web Audio: no files, no autoplay.
 * A band-passed noise "whir" amplitude-modulated at 24 Hz (the shutter),
 * a low mains hum, and a short mechanical clack on every cut.
 */
class ProjectorAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  on = false;

  private ensure() {
    if (this.ctx) return this.ctx;
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    this.ctx = ctx;

    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.noise = buf;

    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    this.master = master;

    // Whir
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 950;
    band.Q.value = 0.7;
    const whir = ctx.createGain();
    whir.gain.value = 0.32;
    const shutter = ctx.createOscillator();
    shutter.type = "square";
    shutter.frequency.value = 24;
    const depth = ctx.createGain();
    depth.gain.value = 0.12;
    shutter.connect(depth).connect(whir.gain);
    src.connect(band).connect(whir).connect(master);

    // Hum
    const hum = ctx.createOscillator();
    hum.frequency.value = 55;
    const humGain = ctx.createGain();
    humGain.gain.value = 0.05;
    hum.connect(humGain).connect(master);

    src.start();
    shutter.start();
    hum.start();
    return ctx;
  }

  async toggle(next: boolean) {
    this.on = next;
    const ctx = this.ensure();
    if (next && ctx.state === "suspended") await ctx.resume();
    const g = this.master!.gain;
    g.cancelScheduledValues(ctx.currentTime);
    g.setTargetAtTime(next ? 0.11 : 0, ctx.currentTime, next ? 0.4 : 0.15);
    if (!next) window.setTimeout(() => !this.on && ctx.suspend(), 900);
  }

  /** A mechanical clack for cuts between acts. */
  cue() {
    if (!this.on || !this.ctx || !this.noise || !this.master) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1800;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.9, t + 0.004);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    src.connect(hp).connect(env).connect(this.master);
    src.start(t, Math.random());
    src.stop(t + 0.12);
  }
}

export const projectorAudio = new ProjectorAudio();
