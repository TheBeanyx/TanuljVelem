/** Generated ambient study sounds (Web Audio API) — no external files or streaming. */

export type TrackId = "off" | "rain" | "brown" | "pad" | "ocean";

export const TRACKS: { id: TrackId; label: string; emoji: string }[] = [
  { id: "off", label: "Néma", emoji: "🔇" },
  { id: "rain", label: "Esőcsepp", emoji: "🌧️" },
  { id: "brown", label: "Lágy zaj", emoji: "🎚️" },
  { id: "pad", label: "Lo-fi pad", emoji: "🎹" },
  { id: "ocean", label: "Tengerpart", emoji: "🌊" },
];

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let nodes: AudioNode[] = [];
let timers: number[] = [];

const getCtx = () => {
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.25;
    master.connect(ctx.destination);
  }
  return ctx!;
};

const noiseBuffer = (c: AudioContext, brown: boolean) => {
  const len = c.sampleRate * 4;
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    if (brown) {
      last = (last + 0.02 * white) / 1.02;
      d[i] = last * 3.5;
    } else {
      d[i] = white;
    }
  }
  return buf;
};

const startNoise = (c: AudioContext, opts: { brown: boolean; freq: number; q?: number; lfo?: boolean }) => {
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, opts.brown);
  src.loop = true;
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = opts.freq;
  if (opts.q) filter.Q.value = opts.q;
  const gain = c.createGain();
  gain.gain.value = 0.9;
  src.connect(filter).connect(gain).connect(master!);
  src.start();
  nodes.push(src, filter, gain);

  if (opts.lfo) {
    const lfo = c.createOscillator();
    lfo.frequency.value = 0.08;
    const lfoGain = c.createGain();
    lfoGain.gain.value = 0.45;
    lfo.connect(lfoGain).connect(gain.gain);
    lfo.start();
    nodes.push(lfo, lfoGain);
  }
};

const startPad = (c: AudioContext) => {
  const chords = [
    [220, 261.63, 329.63],
    [196, 246.94, 293.66],
    [174.61, 220, 261.63],
    [164.81, 207.65, 246.94],
  ];
  let idx = 0;
  const playChord = () => {
    const chord = chords[idx % chords.length];
    idx++;
    chord.forEach((f, i) => {
      const osc = c.createOscillator();
      osc.type = i === 0 ? "sine" : "triangle";
      osc.frequency.value = f;
      const g = c.createGain();
      g.gain.value = 0;
      osc.connect(g).connect(master!);
      const now = c.currentTime;
      g.gain.linearRampToValueAtTime(0.12, now + 1.5);
      g.gain.linearRampToValueAtTime(0, now + 6);
      osc.start(now);
      osc.stop(now + 6.2);
    });
  };
  playChord();
  timers.push(window.setInterval(playChord, 6000));
  // subtle noise bed
  startNoise(c, { brown: true, freq: 500 });
};

export const stopMusic = () => {
  timers.forEach((t) => window.clearInterval(t));
  timers = [];
  nodes.forEach((n) => {
    try {
      (n as any).stop?.();
      n.disconnect();
    } catch {}
  });
  nodes = [];
};

export const playTrack = (id: TrackId) => {
  stopMusic();
  if (id === "off") return;
  const c = getCtx();
  if (c.state === "suspended") c.resume();
  if (id === "rain") startNoise(c, { brown: false, freq: 1600, q: 0.6, lfo: true });
  if (id === "brown") startNoise(c, { brown: true, freq: 700 });
  if (id === "ocean") startNoise(c, { brown: true, freq: 420, lfo: true });
  if (id === "pad") startPad(c);
};

export const setVolume = (v: number) => {
  if (master) master.gain.value = v;
};
