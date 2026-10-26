// Every future reveal within a location belongs here, not just its opening frame.
// Paths are relative to public/assets, preserving GitHub Pages subfolders.
export const ABILITY_ART = {
  lucky: 'scenes/v3/lucky-shield.png',
  heal: 'scenes/v3/apprentice-cast.png',
  tail: 'scenes/v4/rusalka-chibi-attack.png',
  charm: 'scenes/v4/smith-chibi-charm.png',
};
const forest = 'battle/forest-muted-a-v1.png';
const moth = 'moth-narrator-v1.png';
const portrait = 'portraits/lucky-dialogue-v1.png';
const allies = 'scenes/v2/portraits-allies.png';
const battle = [forest, portrait, 'battle/hero-v1.png', 'scenes/v2/lucky-victory.png',
  'scenes/v2/rusalka-charm.png', ...Object.values(ABILITY_ART)];
const groups = {
  intro: [forest, moth, 'scenes/v2/lucky-teacher.png', 'scenes/grandfather-states-v1.png',
    'scenes/v2/grandfather-urn.png', 'scenes/v2/lucky-hiker.png'],
  clearing: [...battle, 'map-sprites/map-v8.png', 'scenes/v2/minion-map.png',
    'scenes/v2/minion-battle.png', 'map-sprites/blud-idle-v1.png', 'battle/blud-v1.png',
    'scenes/v2/lucky-teacher.png', 'scenes/v2/lucky-shield-diagram.png'],
  river: [...battle, allies, 'scenes/river-map-v1.png', 'map-sprites/smith-idle-v1.png',
    'map-sprites/rusalka-idle-v1.png', 'scenes/smith-reactions-v1.png',
    'scenes/rusalka-shocked-v1.png', 'scenes/v2/rusalka-win.png', 'scenes/v2/rusalka-dive.png',
    'scenes/v3/rusalka-battle.png', 'scenes/v3/weight-wind-diagram.png', 'scenes/v2/lucky-teacher.png'],
  mountain: [...battle, allies, moth, 'scenes/mountain-map-v1.png', 'scenes/v3/mountain-battle.png',
    'map-sprites/elder-idle-v1.png', 'map-sprites/apprentice-idle-v1.png', 'map-sprites/upyr-idle-v1.png',
    'scenes/upyr-cloaked-elder-v1.png', 'scenes/upyr-revealed-v1.png', 'scenes/v3/altar-map.png'],
  credits: [moth, 'scenes/v3/mountain-battle.png', 'scenes/v3/credits-sunrise.png',
    'scenes/credits-proposal-v1.png', 'scenes/credits-baseball-v1.png'],
  library: [moth, portrait, allies, 'battle/hero-v1.png', 'scenes/grandfather-states-v1.png',
    ...['cast-first','cast-full','blud','blud-early','rusalka','rusalka-early','upyr','upyr-early','smith'].map(name => `scenes/designs/${name}.png`)],
};
export const SCENE_ASSETS = Object.fromEntries(Object.entries(groups).map(([key, files]) => [key, [...new Set(files)]]));
export const MAP_ASSET_GROUPS = new Set(['clearing', 'river', 'mountain']);

export function assetGroupForScene(chapter, visual) {
  // The farewell after Blud already shows the river before its chapter begins.
  if (['river','river-empty','rusalka-dive','knockback','smith-proud','smith-flirt','smith-bruised','rusalka-closeup','rusalka-win','weight','tail'].includes(visual)) return 'river';
  if (chapter === 'intro') return 'intro';
  if (['movement','tutorial','lucky-gift'].includes(chapter)) return 'clearing';
  if (['river','smith','rusalka'].includes(chapter)) return 'river';
  if (['mountain','upyr','ending'].includes(chapter)) return 'mountain';
  return chapter === 'credits' ? 'credits' : 'library';
}
