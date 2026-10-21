import './battle-icons.css';

/** Pixel silhouettes with a separate, left-hand weapon rotating around its grip. */
export function battleChoiceIcon(action, zone) {
  const defend = action === 'defend';
  const body = zone === 'body';
  const target = `<path class="${body ? 'battle-icon-muted' : 'battle-icon-target'}" d="M35 4h8v3h3v8h-3v3h-8v-3h-3V7h3z"/><path class="${body ? 'battle-icon-target' : 'battle-icon-muted'}" d="M36 18h6v3h2v2h2v14H32V23h2v-2h2z"/>`;

  // The pivot is the grip (0,0), translated to the empty space left of the person.
  // At contact, the head blade tip is (32.05,13.22); body tip is (31.87,28.89).
  // Their approach arcs remain left of x=32, the silhouette's outer edge.
  const tip = body ? 23 : 26;
  const pivotY = body ? 36 : 27;
  const contactY = body ? 29 : 13;
  const tool = defend
    ? `<g transform="translate(6 ${body ? 19 : 3})"><g class="battle-icon-shield"><path d="M0 0h17v14h-3v4h-3v3H6v-3H3v-4H0z"/><path class="battle-icon-cutout" d="M3 3h11v9h-3v4H6v-4H3z"/><path d="M7 3h3v14H7zM3 8h11v3H3z"/></g></g>`
    : `<path class="battle-icon-swing-arc" d="${body ? 'M16 14 A23 23 0 0 1 32 29' : 'M18 2 A26 26 0 0 1 32 13'}"/><g transform="translate(10 ${pivotY})"><g class="battle-icon-blade battle-icon-blade--${body ? 'body' : 'head'}"><path class="battle-icon-grip" d="M-5 -1h9v2h-9zM-7 -2h3v4h-3zM3 -5h3V5H3z"/><path d="M6 -2H${tip - 4}v1h2v1h2l-2 1h-2v1H6z"/><path class="battle-icon-blade-edge" d="M7 -1h${tip - 12}v1H7z"/></g></g><g class="battle-icon-contact" transform="translate(32 ${contactY})"><path d="M-2 -5h2v3h-2zM-5 -1h3v2h-3zM0 3h2v3H0z"/></g>`;
  return `<svg class="battle-choice-icon battle-choice-icon--${defend ? 'defend' : 'attack'}" viewBox="0 0 50 42" aria-hidden="true" focusable="false" shape-rendering="crispEdges">${target}${tool}</svg>`;
}
