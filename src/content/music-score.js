/** V3: quiet, sparse, original phrases with a different instrument family per scene. */
export const MUSIC_MIX = Object.freeze({ master: .8, music: .9, fadeSeconds: .85 });
export const MUSIC_THEMES = Object.freeze({
  title: { name: 'Прах і тиша · камерна', bpm: 58, beats: 4, bars: 16, roots: [50,50,46,46,53,53,48,45], room: .16, colour: 'mist' },
  clearing: { name: 'Стежка між деревами · струни', bpm: 82, beats: 4, bars: 16, roots: [50,55,46,48,50,53,48,45], room: .07, colour: 'wood' },
  river: { name: 'Вода перед світанком · відблиски', bpm: 70, beats: 4, bars: 16, roots: [52,48,55,50,52,55,57,47], room: .2, colour: 'water' },
  mountain: { name: 'Курган під снігом · тиша', bpm: 62, beats: 4, bars: 16, roots: [45,45,46,46,41,41,43,40], room: .17, colour: 'cold' },
  comedy: { name: 'Неперевершений красень · піцикато', bpm: 104, beats: 3, bars: 16, roots: [48,48,53,55,48,57,50,55], room: .05, colour: 'theatre' },
  battle: { name: 'Не озирайся · пульс', bpm: 112, beats: 4, bars: 16, roots: [50,50,46,48,50,53,46,45], room: .06, colour: 'danger' },
});
export function normalizeMusicMode(mode) {
  if (mode === 'field') return 'clearing';
  return Object.hasOwn(MUSIC_THEMES, mode) ? mode : 'clearing';
}

// Explicitly placed notes leave breathing space. No reed, wind or sustained lead.
const PHRASES = {
  title: [ [[.7,12],[3.2,7]], [], [[1.3,10]], [[2.8,7]], [[.5,12]], [], [[1.5,7]], [[2.3,13]] ],
  clearing: [ [[0,12],[1.25,7],[3,15]], [[.5,10],[2.5,7]], [[0,12],[1.75,15],[3.25,7]], [[1,10],[2.5,5]],
    [[0,12],[2,7],[3.25,15]], [[.75,10],[2.5,12]], [[0,7],[2.25,10]], [[1,8],[3,7]] ],
  river: [ [[.4,12],[2.8,7]], [[1.5,10]], [[.8,7]], [[2.1,12]], [[.5,15]], [[1.8,7],[3.1,10]], [[.9,7]], [] ],
  mountain: [ [[.75,12]], [], [[1.5,7]], [[3,12]], [[.5,15]], [], [[2.25,7]], [[1.25,11]] ],
  comedy: [ [[0,12],[1.5,16],[2.3,7]], [[.5,12],[2,7]], [[0,12],[1,14],[2.5,7]], [[.5,11],[2,7]],
    [[0,16],[1.5,12],[2.5,7]], [[.5,12],[1.5,7],[2.5,15]], [[0,14],[1.5,9]], [[.5,11],[2,7]] ],
  battle: [ [[.5,12],[2.5,7]], [[1.25,15],[3.25,12]], [[.75,12],[2.75,7]], [[1.5,10]],
    [[.5,15],[2.25,12]], [[1.5,7],[3,10]], [[.5,12],[2.5,7]], [[1.5,8],[3,7]] ],
};

export function musicBar(mode, index) {
  mode = normalizeMusicMode(mode);
  const theme = MUSIC_THEMES[mode], bar = ((index % theme.bars) + theme.bars) % theme.bars;
  const root = theme.roots[Math.floor(bar / 2)], events = [];
  const add = (instrument, note, beat, length, gain = 1, pan = 0) => events.push({ instrument, note, beat, length, gain, pan });
  if (mode === 'title') {
    if (bar % 2 === 0) [0,7].forEach((n,i)=>add('warmPad',root-12+n,0,7.5,.9,i? .26:-.26));
  } else if (mode === 'clearing') {
    add('roundBass',root-12,0,1.15,.62);
    if (bar % 2 === 0) add('softPluck',root+3,2.5,.8,.38,-.3);
    if (bar % 2 === 1) add('wood',root,3,.08,.2,.25);
  } else if (mode === 'river') {
    if (bar % 2 === 0) [0,7,10].forEach((n,i)=>add('glassPad',root-12+n,0,7.6,.62,(i-1)*.35));
    // Sparse quiet water droplets, never a continuous hiss or a bright shaker.
    if (bar % 4 === 1) add('waterDrop',root+12,3.2,.18,.22,.45);
    if (bar % 4 === 3) add('waterDrop',root+7,.7,.2,.18,-.4);
  } else if (mode === 'mountain') {
    if (bar % 2 === 0) [0,7].forEach((n,i)=>add('softStrings',root-12+n,0,7.4,.76,i? .28:-.28));
    if (bar % 4 === 2) add('feltPiano',root,3,.8,.3,-.35);
  } else if (mode === 'comedy') {
    add('pizzicato',root-12,0,.38,.78);
    [1,2].forEach(beat=>[4,7].forEach((n,i)=>add('pizzicato',root+n,beat,.25,.3,i? .2:-.2)));
    if (bar % 2 === 0) add('wood',root+7,2.5,.06,.28,-.3);
    if (bar % 4 === 3) add('softTap',0,2.5,.1,.25,.3);
  } else if (mode === 'battle') {
    [0,1.5,2.75].forEach((beat,i)=>add('roundBass',root-12+[0,7,0][i],beat,.45,.85));
    [0,2].forEach(beat=>add('softKick',0,beat,.2,.55));
    [1,3].forEach(beat=>add('softTap',0,beat,.12,.32));
    if (bar % 4 === 3) add('softPluck',root+3,3.5,.22,.3,-.2);
  }
  const settings = {
    title:['warmBell',.9,.72], clearing:['softPluck',.72,.83], river:['waterBell',1.4,.75],
    mountain:['feltPiano',1.25,.8], comedy:['pizzicato',.32,.72], battle:['mutedPluck',.35,.72],
  }[mode];
  for (const [beat,note] of PHRASES[mode][bar%8]) {
    // Answer phrases move down, so repeated loops never climb into a piercing register.
    const answer = bar >= 8 && bar % 3 === 0 ? -5 : 0;
    add(settings[0],Math.min(74,root+note+answer),beat,settings[1],settings[2],Math.sin(bar*1.2+beat)*.18);
  }
  return events;
}
