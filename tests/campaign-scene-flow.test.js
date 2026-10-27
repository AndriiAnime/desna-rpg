import test from 'node:test';
import assert from 'node:assert/strict';
import { CHAPTERS, SPEAKERS } from '../src/content/campaign-scenes.js';

test('the first encounter introduces both opponents before Lucky explains combat', () => {
  const tutorial = CHAPTERS.find(chapter => chapter.id === 'tutorial');
  assert.deepEqual(tutorial.beats.slice(0, 3).map(beat => beat.speaker), ['minion', 'hero', 'lucky']);
  assert.deepEqual(tutorial.beats.slice(0, 2).map(beat => beat.text.uk), ['Тут твій кінець.', 'Ми ще подивимось.']);
  assert.ok(tutorial.beats.slice(0, 3).every(beat => beat.visual === 'tutorial-arena'));
  const battles = tutorial.beats.filter(beat => beat.action === 'battle');
  assert.equal(battles.length, 1, 'The added conversation must not start an extra battle');
  assert.equal(battles[0].enemy, 'tutorial');
  assert.ok(tutorial.beats.indexOf(battles[0]) > 2, 'Instruction follows the exchange, before attack choices');
});

test('Rusalka throws only the hero on the solo visit and both actors after the smith joins', () => {
  const solo = CHAPTERS.find(chapter => chapter.id === 'river').beats.find(beat => beat.id === 'river-first-knockback');
  const smith = CHAPTERS.find(chapter => chapter.id === 'smith');
  const duo = smith.beats.find(beat => beat.id === 'smith-double-knockback');
  assert.deepEqual(solo.targets, ['hero']);
  assert.deepEqual(duo.targets, ['hero', 'smith']);
  assert.equal(solo.visual, 'knockback');
  assert.equal(duo.visual, 'knockback');
  assert.ok(smith.beats.findIndex(beat => beat.action === 'follow-smith') < smith.beats.indexOf(duo));
});

test('every story speaker has a Ukrainian and English display name', () => {
  for (const chapter of CHAPTERS) {
    for (const beat of chapter.beats) {
      assert.ok(SPEAKERS[beat.speaker]?.uk, `${beat.id}: missing Ukrainian speaker name`);
      assert.ok(SPEAKERS[beat.speaker]?.en, `${beat.id}: missing English speaker name`);
    }
  }
});
