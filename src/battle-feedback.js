import './battle-feedback.css';
import { BATTLE_FEEDBACK_TYPES, BATTLE_FEEDBACK_VARIANTS, BATTLE_FEEDBACK_LABELS } from './content/battle-presentation.js';
export { BATTLE_FEEDBACK_TYPES, BATTLE_FEEDBACK_VARIANTS, BATTLE_FEEDBACK_LABELS };

export const checkedFeedbackVariant = value => BATTLE_FEEDBACK_VARIANTS.includes(value) ? value : 'muted';

/** All labels come from our closed dictionary; no caller content becomes HTML. */
export function battleFeedbackMarkup({ type = 'hit', language = 'uk', variant = 'muted', amount } = {}) {
  const safeType = BATTLE_FEEDBACK_TYPES.includes(type) ? type : 'hit';
  const label = (BATTLE_FEEDBACK_LABELS[language] || BATTLE_FEEDBACK_LABELS.uk)[safeType];
  const damage = Number.isFinite(amount) && amount > 0 ? `<span class="battle-impact-amount">−${Math.floor(amount)} <small>HP</small></span>` : '';
  return `<span class="battle-impact battle-impact--${safeType} battle-impact--${checkedFeedbackVariant(variant)}"><span class="battle-impact-label">${label}</span>${damage}</span>`;
}

export function battleTurnMarkup({ side = 'hero', language = 'uk', variant = 'muted' } = {}) {
  const safeSide = side === 'enemy' ? 'enemy' : 'hero';
  const label = (BATTLE_FEEDBACK_LABELS[language] || BATTLE_FEEDBACK_LABELS.uk)[`${safeSide}Turn`];
  return `<span class="battle-turn-label battle-turn-label--${safeSide} battle-turn-label--${checkedFeedbackVariant(variant)}"><span aria-hidden="true" class="battle-turn-rule"></span><span>${label}</span><span aria-hidden="true" class="battle-turn-rule"></span></span>`;
}
