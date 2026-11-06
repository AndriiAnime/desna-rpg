import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { copyFile, mkdir, readFile, readdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [sourceArg, oldBetaArg, outputArg, cardArg] = process.argv.slice(2);
if (!cardArg) throw Error('Usage: node build-routes.mjs <source> <verified-beta2-dist> <new-output> <card.png>');
const source = await realpath(sourceArg);
const legacy = await realpath(oldBetaArg);
const output = path.resolve(outputArg);
const card = await realpath(cardArg);
const latest = path.join(output, 'beta3');
const testing = path.join(output, 'testing-1');
const oldBase = '/desna-rpg/beta2/';
const newBase = '/desna-rpg/beta3/';
const artDirectory = 'assets/scenes/beta3/';
const fileHash = async filename => createHash('sha256').update(await readFile(filename)).digest('hex');
const sorted = (a, b) => a < b ? -1 : a > b ? 1 : 0;
async function files(root, relative = '') {
  const found = [];
  for (const ent of await readdir(path.join(root, relative), {withFileTypes: true})) {
    const name = relative ? relative + '/' + ent.name : ent.name;
    if (ent.isDirectory()) found.push(...await files(root, name));
    else if (ent.isFile()) found.push(name);
    else throw Error('Non-regular file: ' + name);
  }
  return found.sort(sorted);
}
const shared = [];
const fresh = [];
for (const name of await files(path.join(source, 'public'))) {
  if (name.startsWith('reviews/bugfix-20261106b/') || name.split('/').includes('.DS_Store')) continue;
  if (name.startsWith(artDirectory)) { fresh.push(name); continue; }
  const originalHash = await fileHash(path.join(source, 'public', name));
  if (originalHash !== await fileHash(path.join(legacy, name))) throw Error('Existing release asset has changed: ' + name);
  shared.push(name);
}
await mkdir(output);
await mkdir(testing);
process.chdir(source);
const {build} = await import(pathToFileURL(path.join(source, 'node_modules/vite/dist/node/index.js')));
const releaseUrls = {
  name: 'desna-immutable-shared-assets',
  enforce: 'pre',
  transform(code, id) {
    if (!id.startsWith(path.join(source, 'src') + path.sep) || !id.endsWith('.js')) return;
    // Assets from earlier versions have immutable, verified public addresses.
    // A new scene ID stays valid when prefixed by the old asset root in the
    // existing preload, audio, Phaser and visual-novel rendering code.
    const next = code
      .replace(/import\.meta\.env(?:\?\.|\.)BASE_URL/g, JSON.stringify(oldBase))
      .replaceAll('scenes/beta3/', '../../beta3/assets/scenes/beta3/')
      .replace(/((?:src|href)=["'])\.\/(assets|reviews)\//g, '$1' + oldBase + '$2/');
    return next === code ? undefined : {code: next, map: null};
  },
};
const knownPublic = new Set(shared.concat(fresh));
await build({
  root: source, configFile: path.join(source, 'vite.config.js'), configLoader: 'native', base: newBase,
  plugins: [releaseUrls], build: {outDir: latest, emptyOutDir: false, copyPublicDir: false},
  experimental: {
    renderBuiltUrl(filename, {type}) {
      if (type !== 'public') return;
      if (!knownPublic.has(filename)) throw Error('Unverified public resource: ' + filename);
      return (filename.startsWith(artDirectory) ? newBase : oldBase) + filename;
    },
  },
});
for (const name of fresh) {
  await mkdir(path.dirname(path.join(latest, name)), {recursive: true});
  await copyFile(path.join(source, 'public', name), path.join(latest, name), constants.COPYFILE_EXCL);
}
for (const html of (await readdir(latest)).filter(name => name.endsWith('.html'))) {
  const content = await readFile(path.join(latest, html), 'utf8');
  if (/<base\b/i.test(content)) throw Error('Entry must retain its own navigation root: ' + html);
  await copyFile(path.join(latest, html), path.join(testing, html), constants.COPYFILE_EXCL);
}
await copyFile(card, path.join(testing, 'stas-card.png'), constants.COPYFILE_EXCL);
if (await fileHash(path.join(testing, 'stas-card.png')) !== await fileHash(card)) throw Error('Stas card checksum mismatch');
console.log(JSON.stringify({sharedFiles: shared.length, newArtwork: fresh, entries: await readdir(testing)}, null, 2));
