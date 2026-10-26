#!/usr/bin/env node
import { constants } from 'node:fs';
import { copyFile, lstat, mkdir, readdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const requiredBaseline = ['index.html'];
const requiredAlternative = ['index.html', 'ui-lab.html', 'ui-kit.html'];
const reservedDirectories = ['alternative', 'ui-kit'];

async function inspectTree(directory) {
  const entries = [];
  async function visit(relative = '') {
    for (const entry of await readdir(path.join(directory, relative), { withFileTypes: true })) {
      const name = path.join(relative, entry.name);
      if (entry.isDirectory()) await visit(name);
      else if (entry.isFile()) entries.push(name);
      else throw new Error(`Only regular files and directories can be published: ${path.join(directory, name)}`);
    }
  }
  await visit();
  return entries.sort();
}

const isWithin = (parent, child) => {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
};

async function requireFiles(directory, required) {
  for (const file of required) {
    const stats = await lstat(path.join(directory, file)).catch(() => null);
    if (!stats?.isFile()) throw new Error(`Required build file is missing: ${path.join(directory, file)}`);
  }
}

function withDocumentBase(html, href) {
  if (/<base\b/i.test(html)) throw new Error('The UI entry already contains a <base> element; refusing to change its URL semantics.');
  if (!/<head(?:\s[^>]*)?>/i.test(html)) throw new Error('The UI entry must contain a <head> element.');
  return html.replace(/<head(?:\s[^>]*)?>/i, (head) => `${head}\n    <base href="${href}" />`);
}

async function copyTree(source, target, files) {
  for (const relative of files) {
    const destination = path.join(target, relative);
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(path.join(source, relative), destination, constants.COPYFILE_EXCL);
  }
}

const digest = async (file) => createHash('sha256').update(await readFile(file)).digest('hex');

/** Build one complete Pages artifact; never erase or mutate either source build. */
export async function packagePages(baselineDist, alternativeDist, outputDirectory) {
  const baseline = await realpath(baselineDist);
  const alternative = await realpath(alternativeDist);
  for (const source of [baseline, alternative]) {
    if (!(await lstat(source)).isDirectory()) throw new Error(`Build input is not a directory: ${source}`);
  }
  // Requiring an existing parent resolves symlinks before any output is created.
  const requestedOutput = path.resolve(outputDirectory);
  const output = path.join(await realpath(path.dirname(requestedOutput)), path.basename(requestedOutput));
  const existingOutput = await lstat(output).catch((error) => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (existingOutput && (!existingOutput.isDirectory() || existingOutput.isSymbolicLink())) {
    throw new Error(`Output must be a new or empty directory, not a file or symlink: ${output}`);
  }
  if ([baseline, alternative].some((source) => isWithin(source, output) || isWithin(output, source))) {
    throw new Error('Output must be separate from both input directories; nested paths are not allowed.');
  }
  if (existingOutput && (await readdir(output)).length) throw new Error(`Output directory is not empty: ${output}`);

  await requireFiles(baseline, requiredBaseline);
  await requireFiles(alternative, requiredAlternative);
  const [baselineFiles, alternativeFiles] = await Promise.all([inspectTree(baseline), inspectTree(alternative)]);
  for (const reserved of reservedDirectories) {
    const occupied = await lstat(path.join(baseline, reserved)).catch((error) => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    if (occupied) throw new Error(`Baseline already uses reserved path '${reserved}'; refusing to overwrite it.`);
  }
  // Validate both pages before copying anything into the output.
  const lab = withDocumentBase(await readFile(path.join(alternative, 'ui-lab.html'), 'utf8'), '../alternative/');
  const reference = withDocumentBase(await readFile(path.join(alternative, 'ui-kit.html'), 'utf8'), '../../alternative/');

  if (!existingOutput) await mkdir(output);
  await copyTree(baseline, output, baselineFiles);
  await copyTree(alternative, path.join(output, 'alternative'), alternativeFiles);
  await mkdir(path.join(output, 'ui-kit', 'reference'), { recursive: true });
  await writeFile(path.join(output, 'ui-kit', 'index.html'), lab, { flag: 'wx' });
  await writeFile(path.join(output, 'ui-kit', 'reference', 'index.html'), reference, { flag: 'wx' });
  if (!baselineFiles.includes('.nojekyll')) await writeFile(path.join(output, '.nojekyll'), '', { flag: 'wx' });

  // A Pages upload replaces the whole site, so explicitly prove that the old root survived.
  for (const file of baselineFiles) {
    if (await digest(path.join(baseline, file)) !== await digest(path.join(output, file))) {
      throw new Error(`Baseline preservation check failed: ${file}`);
    }
  }
  return { output, baselineFiles: baselineFiles.length, alternativeFiles: alternativeFiles.length, routes: ['/', '/alternative/', '/ui-kit/', '/ui-kit/reference/'] };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length !== 3) {
    console.error('Usage: node scripts/package-pages.mjs <baselineDist> <alternativeDist> <outputDirectory>');
    process.exitCode = 1;
  } else {
    try { console.log(JSON.stringify(await packagePages(...args), null, 2)); }
    catch (error) { console.error(error.message); process.exitCode = 1; }
  }
}
