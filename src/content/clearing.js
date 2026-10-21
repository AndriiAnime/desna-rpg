import { CLEARING_NAVIGATION } from "./clearing-navigation.js";

/** Pixel coordinates follow the approved 1402 × 1122 clearing artwork.
 * User-drawn borders are authoritative; road axes remain useful for art/debug overlays.
 */
export const CLEARING = {
  width: 1402,
  height: 1122,
  step: 12,
  footprint: 6,
  clickSnapRadius: 45,
  spawn: { x: 930, y: 438 },
  enemy: { id: "blud", name: "Блуд", x: 1106, y: 826, radius: 40 },
  // The boulder is baked into the background: include its visible left flank
  // so the hero cannot appear to stand on the rock while walking toward it.
  rock: { x: 1105, y: 455, radiusX: 80, radiusY: 52 },
  navigation: CLEARING_NAVIGATION,
  roads: [
    {
      id: "forest-entrance",
      radius: 28.8,
      points: [[730, 275], [760, 326], [790, 371], [834, 432]],
    },
    {
      id: "blocked-shortcut",
      radius: 32.4,
      points: [[834, 432], [930, 438], [1004, 446], [1074, 467], [1135, 486], [1191, 518], [1288, 532]],
    },
    {
      id: "western-descent",
      radius: 34.8,
      points: [[834, 432], [798, 505], [769, 568], [735, 608], [654, 652], [535, 697], [409, 738], [283, 768], [199, 788]],
    },
    {
      id: "lower-loop",
      radius: 36,
      points: [[199, 788], [218, 847], [271, 914], [336, 944], [397, 941], [528, 909], [664, 874], [792, 837], [903, 795], [994, 762]],
    },
    {
      id: "eastern-descent",
      radius: 32.4,
      points: [[1191, 518], [1151, 566], [1115, 613], [1080, 660], [1042, 710], [994, 762]],
    },
    {
      id: "bridge",
      radius: 30,
      points: [[994, 762], [1050, 795], [1106, 826], [1165, 861], [1235, 898]],
    },
  ],
};
