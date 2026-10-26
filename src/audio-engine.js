/** V3 chamber textures: struck/plucked voices decay, rather than holding like winds. */
export const noteFrequency = note => 440 * 2 ** ((note - 69) / 12);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const noises = new WeakMap();
const impulses = new WeakMap();
function noiseBuffer(context) {
  if (noises.has(context)) return noises.get(context);
  const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
  const data = buffer.getChannelData(0); let seed = 71331;
  for (let i = 0; i < data.length; i++) { seed = (1664525 * seed + 1013904223) >>> 0; data[i] = seed / 2147483648 - 1; }
  noises.set(context, buffer); return buffer;
}
function roomImpulse(context) {
  if (impulses.has(context)) return impulses.get(context);
  const buffer = context.createBuffer(2, Math.floor(context.sampleRate * 1.65), context.sampleRate);
  let seed = 1867;
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch); let previous = 0;
    for (let i = 0; i < data.length; i++) {
      seed = (1664525 * seed + 1013904223) >>> 0;
      previous = .62 * previous + .38 * (seed / 2147483648 - 1);
      data[i] = previous * (1 - i / data.length) ** 3.2;
    }
  }
  impulses.set(context, buffer); return buffer;
}

export function createSynth(context, destination, { room = .18, level = 1 } = {}) {
  const input = context.createGain(); input.gain.value = level;
  const dry = context.createGain(); dry.gain.value = .92;
  const reverb = context.createConvolver(); reverb.buffer = roomImpulse(context);
  const wet = context.createGain(); wet.gain.value = room;
  const toneFilter = context.createBiquadFilter(); toneFilter.type = 'lowpass'; toneFilter.frequency.value = 5400;
  input.connect(toneFilter); toneFilter.connect(dry).connect(destination);
  toneFilter.connect(reverb).connect(wet).connect(destination);
  const voices = new Set(), finalizers = new Map(); let disposed = false;

  function voice({ at, duration, frequency = 220, partials = [[1,1]], type = 'sine', gain = .08,
    attack = .008, release = .12, pan = 0, cutoff = 4000, noise = false, endFrequency, filterType = 'lowpass', q = .7, decay, harmonicDecay = 0 }) {
    if (disposed) return;
    duration = Math.max(.015, duration);
    const envelope = context.createGain();
    const filter = context.createBiquadFilter(); filter.type = filterType; filter.frequency.value = cutoff; filter.Q.value = q;
    const stereo = context.createStereoPanner(); stereo.pan.value = clamp(pan,-1,1);
    envelope.connect(filter).connect(stereo).connect(input);
    const end = at + duration + release;
    envelope.gain.setValueAtTime(0, at);
    envelope.gain.linearRampToValueAtTime(gain, at + Math.min(attack, duration * .4));
    if (decay) envelope.gain.setTargetAtTime(.00001, at + Math.min(attack,duration*.4), decay/4);
    else envelope.gain.setTargetAtTime(gain * .52, at + Math.min(attack + .06, duration * .5), Math.max(.025, duration * .3));
    envelope.gain.setTargetAtTime(.00001, at + duration, release / 5);
    let pending = noise ? 1 : partials.length;
    const cleanup = () => { if (--pending === 0) { envelope.disconnect(); filter.disconnect(); stereo.disconnect(); } };
    const sources = noise ? [null] : partials;
    for (const partial of sources) {
      const source = noise ? context.createBufferSource() : context.createOscillator();
      const amplitude = context.createGain();
      if (noise) { source.buffer = noiseBuffer(context); source.loop = true; amplitude.gain.value = 1; }
      else {
        source.type = type; source.frequency.setValueAtTime(Math.max(15, frequency * partial[0]), at);
        if (endFrequency) source.frequency.exponentialRampToValueAtTime(Math.max(15,endFrequency * partial[0]), at + duration);
        source.detune.value = partial[2] || 0; amplitude.gain.setValueAtTime(partial[1],at);
        if (harmonicDecay && partial[0] > 1) amplitude.gain.setTargetAtTime(.0001,at+attack,harmonicDecay/partial[0]);
      }
      source.connect(amplitude).connect(envelope); voices.add(source);
      let finished = false;
      const finalize = () => {
        if (finished) return;
        finished = true; voices.delete(source); finalizers.delete(source);
        source.onended = null; source.disconnect(); amplitude.disconnect(); cleanup();
      };
      source.onended = finalize; finalizers.set(source, finalize);
      source.start(at); source.stop(end + .025);
    }
  }

  function play(event, at, secondsPerBeat = 1) {
    const { instrument, note = 60, length = .3, gain = 1, pan = 0 } = event;
    const frequency = noteFrequency(note), duration = length * secondsPerBeat;
    const common = { at, duration, frequency, pan };
    if (instrument === 'warmPad') voice({ ...common, gain:.049*gain, partials:[[1,.72,-1.5],[1,.28,1.5],[2,.09]], attack:1.35, release:1.6, cutoff:720 });
    else if (instrument === 'glassPad') voice({ ...common, gain:.035*gain, partials:[[1,.8],[2,.09],[3,.025]], attack:1.8, release:1.7, cutoff:1050 });
    else if (instrument === 'softStrings') voice({ ...common, gain:.06*gain, partials:[[1,.7,-1],[1,.3,1],[2,.12],[3,.05],[4,.02]], attack:.85, release:1.4, cutoff:760 });
    else if (instrument === 'warmBell') voice({ ...common, gain:.075*gain, partials:[[1,.82],[2.002,.095],[3.98,.012]], attack:.012, decay:1.25, harmonicDecay:.13, release:.7, cutoff:1900 });
    else if (instrument === 'waterBell') voice({ ...common, gain:.08*gain, partials:[[1,.76],[2.005,.13],[3,.025]], attack:.026, decay:1.8, harmonicDecay:.2, release:.9, cutoff:1800 });
    else if (instrument === 'feltPiano') {
      voice({ ...common, gain:.105*gain, partials:[[1,.72],[2,.2],[3,.075],[4,.025]], attack:.008, decay:1.3, harmonicDecay:.13, release:.5, cutoff:2100 });
      voice({ at,duration:.014,noise:true,gain:.004*gain,attack:.006,release:.025,cutoff:600,filterType:'bandpass',pan });
    } else if (instrument === 'softPluck') voice({ ...common, gain:.12*gain, partials:[[1,.67],[2,.23],[3,.08]], attack:.01, decay:.72, harmonicDecay:.08, release:.18, cutoff:1750 });
    else if (instrument === 'mutedPluck') voice({ ...common, gain:.11*gain, partials:[[1,.7],[2,.24],[3,.055],[4,.02]], attack:.008, decay:.36, harmonicDecay:.06, release:.12, cutoff:1400 });
    else if (instrument === 'pizzicato') voice({ ...common, gain:.16*gain, partials:[[1,.68],[2,.22],[3,.08],[4,.025]], attack:.005, decay:.34, harmonicDecay:.06, release:.11, cutoff:1850 });
    else if (instrument === 'roundBass') voice({ ...common, gain:.16*gain, partials:[[1,.85],[2,.13]], attack:.018, decay:.65, harmonicDecay:.12, release:.15, cutoff:520 });
    else if (instrument === 'waterDrop') voice({ at,duration:.05,frequency, endFrequency:frequency*.85, gain:.035*gain,attack:.008,decay:.09,release:.12,cutoff:1200,pan });
    else if (instrument === 'softKick') voice({ at,duration:.12,frequency:85,endFrequency:48,gain:.16*gain,attack:.014,decay:.18,release:.09,cutoff:270,pan });
    else if (instrument === 'softTap') voice({ at,duration:.045,noise:true,gain:.05*gain,attack:.008,decay:.07,release:.05,cutoff:900,filterType:'bandpass',q:.45,pan });
    else if (instrument === 'pad') voice({ ...common, gain:.033*gain, type:'sine', partials:[[1,.55,-4],[1,.55,4],[2,.18]], attack:.55, release:1.2, cutoff:1800 });
    else if (instrument === 'drone') voice({ ...common, gain:.065*gain, partials:[[1,.8],[2,.2],[3,.08]], attack:.4, release:.7, cutoff:900 });
    else if (instrument === 'bass') voice({ ...common, gain:.105*gain, type:'triangle', partials:[[1,.8],[.5,.2]], attack:.016, release:.16, cutoff:750 });
    else if (instrument === 'bell') voice({ ...common, gain:.055*gain, partials:[[1,.7],[2.005,.17],[3.99,.045]], attack:.012, release:.65, cutoff:4200 });
    else if (instrument === 'pluck') voice({ ...common, gain:.075*gain, partials:[[1,.73],[2,.18],[3,.045]], attack:.006, release:.18, cutoff:2400 });
    else if (instrument === 'reed') voice({ ...common, gain:.065*gain, type:'triangle', partials:[[1,.85],[2,.12]], attack:.018, release:.09, cutoff:2500 });
    else if (instrument === 'lead') voice({ ...common, gain:.065*gain, type:'triangle', partials:[[1,.65,-3],[1,.35,3],[2,.08]], attack:.028, release:.14, cutoff:2300 });
    else if (instrument === 'lowDrum') voice({ at, duration:.18, frequency:105, endFrequency:44, gain:.14*gain, release:.15, cutoff:600, pan });
    else if (instrument === 'snare') {
      voice({ at, duration:.09, noise:true, gain:.095*gain, release:.1, cutoff:1700, filterType:'bandpass', q:.6, pan });
      voice({ at, duration:.065, frequency:180, endFrequency:125, gain:.04*gain, release:.07, pan });
    } else if (instrument === 'brush') voice({ at, duration:.12, noise:true, gain:.036*gain, release:.16, attack:.035, cutoff:1500, filterType:'bandpass', pan });
    else if (instrument === 'shaker') voice({ at, duration:.025, noise:true, gain:.034*gain, release:.04, cutoff:4100, filterType:'highpass', pan });
    else if (instrument === 'wood') voice({ at, duration:.025, frequency:frequency*1.3, gain:.045*gain, release:.075, partials:[[1,1],[1.5,.18]], pan });
  }

  function effect(name, at) {
    const ping = (note, time, length, gain=.8) => play({ instrument:'bell',note,length,gain },time);
    if (name === 'type') {
      voice({ at,duration:.008,noise:true,gain:.035,release:.018,cutoff:1900,filterType:'bandpass',q:1.2 });
      voice({ at:at+.006,duration:.008,frequency:160,gain:.012,release:.025,cutoff:500 });
    } else if (name === 'click') {
      voice({ at,duration:.014,frequency:540,gain:.033,release:.045 });
      voice({ at:at+.018,duration:.012,frequency:810,gain:.018,release:.035 });
    } else if (name === 'attack') {
      voice({ at,duration:.12,noise:true,gain:.042,attack:.045,release:.08,cutoff:1350,filterType:'bandpass',pan:-.2 });
    } else if (name === 'hit' || name === 'finisher') {
      const final = name === 'finisher';
      voice({ at,duration:final?.14:.065,noise:true,gain:final?.14:.1,release:final?.22:.08,cutoff:1200,filterType:'bandpass' });
      voice({ at,duration:final?.23:.12,frequency:final?130:155,endFrequency:final?38:63,gain:final?.2:.14,release:.18,cutoff:1200 });
      if (final) voice({ at:at+.055,duration:.08,noise:true,gain:.055,release:.25,cutoff:2600,filterType:'bandpass' });
    } else if (name === 'block') {
      voice({ at,duration:.04,frequency:740,gain:.065,partials:[[1,.6],[1.51,.25],[2.01,.12]],release:.32,cutoff:3000 });
      voice({ at,duration:.025,noise:true,gain:.055,release:.08,cutoff:2200,filterType:'bandpass' });
    } else if (name === 'victory') {
      [62,65,69,74,77].forEach((note,i)=>ping(note,at+i*.14,.7,.9));
    } else if (name === 'heal') {
      [64,71,76,79].forEach((note,i)=>ping(note,at+i*.09,.9,.75));
    } else if (name === 'charm') {
      [67,74,79].forEach((note,i)=>play({instrument:'warmBell',note,length:.5,gain:.36},at+i*.085));
    } else if (name === 'dive') {
      voice({ at,duration:.25,noise:true,gain:.09,attack:.025,release:.45,cutoff:950,filterType:'bandpass' });
      [0,.1,.22].forEach((offset,i)=>voice({ at:at+offset,duration:.14,frequency:360+i*140,endFrequency:160+i*40,gain:.035,release:.08,cutoff:1200 }));
    } else if (name === 'defeat') [57,53,50].forEach((note,i)=>ping(note,at+i*.2,.8,.7));
    else if (name === 'gift') [67,74,79].forEach((note,i)=>ping(note,at+i*.1,.5,.6));
  }
  function stop(at = context.currentTime) {
    for (const source of voices) { try { source.stop(Math.max(at,context.currentTime)); } catch { /* already finished */ } }
  }
  function dispose() {
    if (disposed) return;
    disposed = true; stop();
    // A suspended/closed context may never dispatch ended for future notes.
    for (const finalize of [...finalizers.values()]) finalize();
    input.disconnect(); dry.disconnect(); toneFilter.disconnect(); wet.disconnect(); reverb.disconnect();
  }
  return { input, play, effect, stop, dispose, get voiceCount() { return voices.size; } };
}
