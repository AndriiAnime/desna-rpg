/** Small original synthesized score. No audio downloads, samples, or external player. */
export function createAudio() {
  let context, master, timer, nextBeat = 0, beat = 0, mode = "field", muted = false;
  const voices = new Set();
  try { muted = localStorage.getItem("desna.audio.muted") === "true"; } catch { /* private mode */ }
  const frequency = (note) => 440 * 2 ** ((note - 69) / 12);
  function tone(note, at, duration, volume = .07, type = "sine") {
    if (!context || muted || context.state !== "running") return;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency(note), at);
    envelope.gain.setValueAtTime(0, at);
    envelope.gain.linearRampToValueAtTime(volume, at + .025);
    envelope.gain.exponentialRampToValueAtTime(.0001, at + duration);
    oscillator.connect(envelope).connect(master);
    voices.add(oscillator);
    oscillator.onended = () => { voices.delete(oscillator); oscillator.disconnect(); envelope.disconnect(); };
    oscillator.start(at); oscillator.stop(at + duration + .03);
  }
  function schedule() {
    if (!context || muted || document.hidden || context.state !== "running") return;
    const interval = mode === "battle" ? 60 / 138 / 2 : 60 / 84 / 2;
    if (nextBeat < context.currentTime) nextBeat = context.currentTime + .03;
    while (nextBeat < context.currentTime + .18) {
      const bar = Math.floor(beat / 16) % 4;
      const roots = [50, 46, 53, 48];
      const root = roots[bar];
      if (mode === "battle") {
        tone(root - 12 + [0, 0, 7, 0, 12, 0, 7, 3][beat % 8], nextBeat, .16, .065, "triangle");
        if (beat % 4 === 0) tone(28, nextBeat, .13, .16, "sine");
        if (beat % 4 === 2) tone(82, nextBeat, .045, .027, "triangle");
        if (beat % 2 === 0) tone(root + [12, 15, 19, 22, 19, 15, 14, 19][beat / 2 % 8], nextBeat, .29, .045, "triangle");
      } else {
        if (beat % 8 === 0) {
          tone(root - 12, nextBeat, 3, .055);
          tone(root + 7, nextBeat, 2.5, .025);
        }
        if (beat % 2 === 0) tone(root + [12, 19, 15, 22, 19, 14, 15, 7][beat / 2 % 8], nextBeat, 1.1, .036, "triangle");
      }
      nextBeat += interval; beat++;
    }
  }
  async function unlock() {
    try {
      if (!context) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return false;
        context = new AudioContext();
        master = context.createGain(); master.gain.value = .4;
        const limiter = context.createDynamicsCompressor();
        master.connect(limiter).connect(context.destination);
        timer = setInterval(schedule, 80);
      }
      if (!muted && !document.hidden) { await context.resume(); nextBeat = context.currentTime + .04; schedule(); }
      return true;
    } catch { return false; }
  }
  function silenceVoices() { for (const voice of voices) { try { voice.stop(); } catch { /* ended */ } } voices.clear(); }
  async function setMuted(value) {
    muted = Boolean(value);
    try { localStorage.setItem("desna.audio.muted", String(muted)); } catch { /* optional persistence */ }
    if (muted) { silenceVoices(); await context?.suspend(); }
    else await unlock();
    return muted;
  }
  function setMode(value) { if (mode === value) return; mode = value; beat = 0; silenceVoices(); nextBeat = context ? context.currentTime + .08 : 0; }
  function sound(name) {
    if (!context || muted || context.state !== "running") return;
    const now = context.currentTime;
    if (name === "hit") { tone(43, now, .11, .1, "triangle"); tone(31, now + .02, .16, .08); }
    else if (name === "block") tone(86, now, .1, .04, "triangle");
    else if (name === "victory") [62, 65, 69, 74].forEach((n, i) => tone(n, now + i * .12, .65, .07, "triangle"));
    else if (name === "defeat") [57, 53, 50].forEach((n, i) => tone(n, now + i * .18, .8, .05));
    else tone(76, now, .07, .025, "triangle");
  }
  const onVisibility = () => { if (document.hidden) { silenceVoices(); context?.suspend(); } else if (!muted && context) unlock(); };
  document.addEventListener("visibilitychange", onVisibility);
  return { unlock, setMuted, setMode, sound, get muted() { return muted; }, destroy() {
    clearInterval(timer); silenceVoices(); document.removeEventListener("visibilitychange", onVisibility); context?.close();
  } };
}
