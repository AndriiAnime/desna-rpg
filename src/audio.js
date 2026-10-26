import { MUSIC_THEMES, MUSIC_MIX, musicBar, normalizeMusicMode } from './content/music-score.js';
import { createSynth } from './audio-engine.js';

/** Original six-scene score and synthesized effects. Recordings stay outside the game. */
export function createAudio() {
  let context, master, compressor, effects, currentTrack, timer;
  let muted = false, mode = 'clearing', destroyed = false, lastType = -Infinity;
  const retiringTracks = new Set();
  try { muted = localStorage.getItem('desna.audio.muted') === 'true'; } catch { /* private browsing */ }

  function makeTrack() {
    if (!context || destroyed) return;
    const bus = context.createGain(); bus.gain.value = 0;
    bus.connect(master);
    const synth = createSynth(context, bus, { room: MUSIC_THEMES[mode].room });
    const at = context.currentTime;
    bus.gain.linearRampToValueAtTime(MUSIC_MIX.music, at + MUSIC_MIX.fadeSeconds);
    return { mode, bus, synth, bar:0, nextBar:at+.04 };
  }
  function disposeTrack(track) {
    if (!track) return;
    clearTimeout(track.timeout); track.synth.dispose(); track.bus.disconnect(); retiringTracks.delete(track);
  }
  function retireTrack(track) {
    if (!track) return;
    const now = context.currentTime;
    if (track.bus.gain.cancelAndHoldAtTime) track.bus.gain.cancelAndHoldAtTime(now);
    else { const value = track.bus.gain.value; track.bus.gain.cancelScheduledValues(now); track.bus.gain.setValueAtTime(value, now); }
    track.bus.gain.linearRampToValueAtTime(0, now + .65);
    retiringTracks.add(track);
    track.timeout = setTimeout(() => disposeTrack(track), 750);
  }
  function schedule() {
    if (!context || muted || destroyed || document.hidden || context.state !== 'running') return;
    currentTrack ||= makeTrack();
    const track = currentTrack, theme = MUSIC_THEMES[track.mode], beat = 60 / theme.bpm;
    if (track.nextBar < context.currentTime - .25) track.nextBar = context.currentTime + .03;
    while (track.nextBar < context.currentTime + .2) {
      for (const event of musicBar(track.mode, track.bar)) track.synth.play(event, track.nextBar + event.beat * beat, beat);
      track.nextBar += theme.beats * beat; track.bar++;
    }
  }
  async function unlock() {
    if (destroyed) return false;
    try {
      if (!context) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return false;
        context = new AudioContext();
        master = context.createGain(); master.gain.value = MUSIC_MIX.master;
        compressor = context.createDynamicsCompressor();
        compressor.threshold.value = -14; compressor.knee.value = 10; compressor.ratio.value = 4;
        compressor.attack.value = .006; compressor.release.value = .2;
        master.connect(compressor).connect(context.destination);
        timer = setInterval(schedule, 75);
      }
      if (!muted && !document.hidden) {
        if (context.state !== 'running') await context.resume();
        if (destroyed || muted || document.hidden) return false;
        effects ||= createSynth(context, master, { room:.08, level:.85 });
        schedule();
      }
      return true;
    } catch { return false; }
  }
  function silence() {
    disposeTrack(currentTrack); currentTrack = null;
    for (const track of [...retiringTracks]) disposeTrack(track);
    effects?.dispose(); effects = null; lastType = -Infinity;
  }
  async function setMuted(value) {
    muted = Boolean(value);
    try { localStorage.setItem('desna.audio.muted', String(muted)); } catch { /* optional persistence */ }
    if (muted) { silence(); if (context && context.state !== 'closed') await context.suspend(); }
    else await unlock();
    return muted;
  }
  function setMode(value) {
    const next = normalizeMusicMode(value);
    if (mode === next || destroyed) return;
    mode = next;
    retireTrack(currentTrack); currentTrack = null;
    schedule();
  }
  function sound(name) {
    if (!context || muted || destroyed || context.state !== 'running' || document.hidden) return;
    const now = context.currentTime;
    if (name === 'type') { if (now - lastType < .06) return; lastType = now; }
    effects?.effect(name, now + .003);
  }
  const onVisibility = () => {
    if (document.hidden) { silence(); if (context && context.state !== 'closed') context.suspend().catch(() => {}); }
    else if (!muted && context) unlock();
  };
  document.addEventListener('visibilitychange', onVisibility);
  return {
    unlock, setMuted, setMode, sound,
    get muted() { return muted; },
    destroy() {
      if (destroyed) return;
      destroyed = true; clearInterval(timer); silence(); effects?.dispose();
      document.removeEventListener('visibilitychange', onVisibility);
      master?.disconnect(); compressor?.disconnect();
      if (context && context.state !== 'closed') context.close().catch(() => {});
    },
  };
}
