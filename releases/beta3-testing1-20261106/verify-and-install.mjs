import { readFile, writeFile, readdir, lstat, mkdir, copyFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

const [site, release, oldManifestPath, expectedManifestPath] = process.argv.slice(2);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
async function inventory(dir, prefix = '') {
  let result = [];
  for (const entry of await readdir(path.join(dir, prefix), {withFileTypes:true})) {
    const name = prefix ? prefix + '/' + entry.name : entry.name;
    if (entry.isDirectory()) result.push(...await inventory(dir, name));
    else if (entry.isFile()) {
      const file = await readFile(path.join(dir, name));
      result.push({path: name, bytes: file.length, sha256: sha(file)});
    } else throw Error('Unexpected non-regular entry: ' + name);
  }
  return result.sort((a, b) => a.path.localeCompare(b.path, 'en'));
}
const legacyBytes = await readFile(oldManifestPath);
const oldManifest = JSON.parse(legacyBytes);
const oldRebuild = JSON.parse(await readFile(path.join(site, 'release-manifest.json')));
if (JSON.stringify(oldRebuild.releases) !== JSON.stringify(oldManifest.releases)) throw Error('Previously published route checksums differ');
function fingerprint(files) {
  return {files: files.length, bytes: files.reduce((sum,f) => sum + f.bytes, 0), treeSha256: sha(JSON.stringify(files))};
}
const rootArtifacts = new Set(['alternative', 'beta1', 'beta2', 'ui-kit', '.nojekyll', 'release-manifest.json']);
const rootFiles = (await inventory(site)).filter(file => !rootArtifacts.has(file.path.split('/')[0]));
const legacyRoutes = [['alpha2', rootFiles], ['beta1', await inventory(path.join(site, 'alternative'))],
  ['beta1', await inventory(path.join(site, 'beta1'))], ['beta2', await inventory(path.join(site, 'beta2'))]];
for (const [key, files] of legacyRoutes) {
  const actual = fingerprint(files), expected = oldManifest.releases[key];
  if (actual.files !== expected.files || actual.bytes !== expected.bytes || actual.treeSha256 !== expected.treeSha256) {
    throw Error('Legacy files differ from the published version: ' + key + ' ' + JSON.stringify(actual));
  }
}
const routeNames = ['beta3','testing-1'];
for (const route of routeNames) {
  const existing = await lstat(path.join(site, route)).catch(error => error.code === 'ENOENT' ? undefined : Promise.reject(error));
  if (existing || !(await lstat(path.join(release, route))).isDirectory()) throw Error('Missing input or occupied output route ' + route);
}
const current = await inventory(release);
const identity = {files: current.length, bytes: current.reduce((sum,f) => sum + f.bytes, 0), sha256: sha(JSON.stringify(current))};
if (expectedManifestPath) {
  const expected = JSON.parse(await readFile(expectedManifestPath));
  if (JSON.stringify(identity) !== JSON.stringify(expected)) throw Error('Rebuilt release differs from the independently verified copy: ' + JSON.stringify(identity));
}
if (!current.every(f => routeNames.includes(f.path.split('/')[0]))) throw Error('Release contains a file outside its two allowed routes');
for (const route of routeNames) await mkdir(path.join(site, route));
for (const file of current) {
  const target = path.join(site, file.path);
  await mkdir(path.dirname(target), {recursive:true});
  await copyFile(path.join(release, file.path), target, constants.COPYFILE_EXCL);
  if (sha(await readFile(target)) !== file.sha256) throw Error('Installed file checksum mismatch: ' + file.path);
}
// This legacy artifact emits a build timestamp. Restore the historical manifest
// only after all three game inventories match the previously published hashes.
await writeFile(path.join(site, 'release-manifest.json'), legacyBytes);
console.log(JSON.stringify(identity, null, 2));
