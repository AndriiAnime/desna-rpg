/** Original decorative signs for the game's three locations. */
export function amuletMarkup(location = 'clearing') {
  const shapes = {
    clearing: '<path d="M50 17v65M50 31 31 47h13L27 63h46L56 47h13ZM35 77h30"/>',
    river: '<path d="M50 18C39 34 32 40 32 51a18 18 0 0 0 36 0c0-11-7-17-18-33ZM24 75q13-10 26 0t26 0M24 84q13-10 26 0t26 0"/>',
    mountain: '<path d="m19 75 31-53 31 53ZM36 47l14 8 14-8M50 13V6M32 19l-5-7M68 19l5-7M35 85h30"/>',
  };
  const key = Object.hasOwn(shapes, location) ? location : 'clearing';
  return `<svg class="location-amulet location-amulet--${key}" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="50" cy="50" r="46"/><circle cx="50" cy="50" r="41" stroke-dasharray="2 8"/>${shapes[key]}</svg>`;
}
