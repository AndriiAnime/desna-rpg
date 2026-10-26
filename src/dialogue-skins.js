import './dialogue-skins.css';
import { amuletMarkup } from './location-amulets.js';

export const DIALOGUE_SKINS = Object.freeze(['veil', 'drift', 'orbit']);
const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));

/** Reusable presentation only. The scene player owns timing, input and typewriting. */
export function dialogueSkinMarkup({ variant = 'veil', speaker = '', text = '', language = 'uk', nextLabel, animated = true, location = 'clearing' } = {}) {
  const skin = DIALOGUE_SKINS.includes(variant) ? variant : 'veil';
  const lang = language === 'en' ? 'en' : 'uk';
  const next = nextLabel ?? (lang === 'en' ? 'Continue' : 'Далі');
  return `<section class="scene-dialogue scene-dialogue--${skin}${skin === 'drift' && animated ? ' scene-dialogue--animated' : ''}" lang="${lang}">
    <div class="scene-dialogue-surface" aria-hidden="true"><i class="scene-dialogue-motif"></i><i class="scene-dialogue-grain"></i><span class="scene-dialogue-amulet">${amuletMarkup(location)}</span></div>
    <div class="scene-dialogue-nameplate"><span>${escapeHTML(speaker)}</span></div>
    <p class="scene-dialogue-text">${escapeHTML(text)}</p>
    <span class="scene-dialogue-next">${escapeHTML(next)}<i aria-hidden="true">▸</i></span>
  </section>`;
}
