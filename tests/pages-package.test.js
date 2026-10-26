import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, readdir, rm, symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { packagePages } from '../scripts/package-pages.mjs';

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'desna-pages-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const baseline = path.join(root, 'baseline');
  const alternative = path.join(root, 'alternative');
  const output = path.join(root, 'site');
  for (const directory of [baseline, alternative]) await mkdir(path.join(directory, 'assets'), { recursive: true });
  await writeFile(path.join(baseline, 'index.html'), '<!doctype html><head></head><body>Alpha 2</body>');
  await writeFile(path.join(baseline, 'assets', 'old.bin'), Buffer.from([0, 1, 254, 255]));
  await writeFile(path.join(alternative, 'index.html'), '<!doctype html><head></head><body>Alternative</body>');
  await writeFile(path.join(alternative, 'assets', 'ui.js'), 'export const ready = true;');
  await writeFile(path.join(alternative, 'ui-lab.html'), '<!doctype html><html><head><script type="module" src="./assets/ui.js"></script></head><body>UI Lab</body></html>');
  await writeFile(path.join(alternative, 'ui-kit.html'), '<!doctype html><head><link rel="stylesheet" href="./assets/ui.css"></head><body>Reference</body>');
  return { root, baseline, alternative, output };
}

test('Pages packaging preserves the existing root and creates two UI routes sharing alternative assets', async (t) => {
  const { baseline, alternative, output } = await fixture(t);
  const originalRoot = await readFile(path.join(baseline, 'index.html'));
  const originalLab = await readFile(path.join(alternative, 'ui-lab.html'));
  const result = await packagePages(baseline, alternative, output);
  assert.equal(result.baselineFiles, 2);
  assert.deepEqual(await readFile(path.join(output, 'index.html')), originalRoot);
  assert.deepEqual(await readFile(path.join(output, 'assets', 'old.bin')), Buffer.from([0, 1, 254, 255]));
  assert.deepEqual(await readFile(path.join(baseline, 'index.html')), originalRoot);
  assert.deepEqual(await readFile(path.join(alternative, 'ui-lab.html')), originalLab);
  assert.deepEqual(await readFile(path.join(output, 'alternative', 'ui-lab.html')), originalLab);
  assert.equal(await readFile(path.join(output, '.nojekyll'), 'utf8'), '');
  const lab = await readFile(path.join(output, 'ui-kit', 'index.html'), 'utf8');
  const reference = await readFile(path.join(output, 'ui-kit', 'reference', 'index.html'), 'utf8');
  assert.match(lab, /<head>\s*<base href="\.\.\/alternative\/"\s*\/>\s*<script/);
  assert.match(reference, /<head>\s*<base href="\.\.\/\.\.\/alternative\/"\s*\/>\s*<link/);
  const labBase = new URL('../alternative/', 'https://example.github.io/desna-rpg/ui-kit/');
  assert.equal(new URL('./assets/ui.js', labBase).href, 'https://example.github.io/desna-rpg/alternative/assets/ui.js');
  assert.equal(new URL('./?font=hybrid', labBase).href, 'https://example.github.io/desna-rpg/alternative/?font=hybrid');
});

test('a nonempty output is rejected without changing its contents or either input', async (t) => {
  const { baseline, alternative, output } = await fixture(t);
  await mkdir(output);
  await writeFile(path.join(output, 'keep.txt'), 'existing site');
  await assert.rejects(packagePages(baseline, alternative, output), /not empty/);
  assert.deepEqual(await readdir(output), ['keep.txt']);
  assert.equal(await readFile(path.join(output, 'keep.txt'), 'utf8'), 'existing site');
});

test('input/output overlap and symlink output are rejected before copying', async (t) => {
  const { root, baseline, alternative, output } = await fixture(t);
  await assert.rejects(packagePages(baseline, alternative, path.join(baseline, 'published')), /separate/);
  await assert.rejects(packagePages(baseline, alternative, root), /separate/);
  await symlink(baseline, output, 'dir');
  await assert.rejects(packagePages(baseline, alternative, output), /symlink/);
  assert.deepEqual((await readdir(baseline)).sort(), ['assets', 'index.html']);
});

test('incomplete input and reserved baseline routes fail without creating output', async (t) => {
  const { baseline, alternative, output } = await fixture(t);
  await rm(path.join(alternative, 'ui-lab.html'));
  await assert.rejects(packagePages(baseline, alternative, output), /Required build file is missing/);
  await assert.rejects(readdir(output), { code: 'ENOENT' });
  await writeFile(path.join(alternative, 'ui-lab.html'), '<head></head>');
  await mkdir(path.join(baseline, 'ui-kit'));
  await assert.rejects(packagePages(baseline, alternative, output), /reserved path/);
  await assert.rejects(readdir(output), { code: 'ENOENT' });
});

test('existing baseline .nojekyll and an explicitly empty output are preserved', async (t) => {
  const { baseline, alternative, output } = await fixture(t);
  await writeFile(path.join(baseline, '.nojekyll'), 'existing marker');
  await mkdir(output);
  await packagePages(baseline, alternative, output);
  assert.equal(await readFile(path.join(output, '.nojekyll'), 'utf8'), 'existing marker');
});
