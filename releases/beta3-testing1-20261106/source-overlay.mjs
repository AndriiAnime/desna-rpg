import { gzipSync, gunzipSync } from 'node:zlib';
import { readFile, writeFile, realpath, mkdir, lstat, unlink } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [command, helpers, baselineArg, extra, output] = process.argv.slice(2);
const {inventory, treeDigest, digest, sourcePathAllowed} = await import(pathToFileURL(await realpath(helpers)));
const root = await realpath(baselineArg);
const base = await inventory(root);
const oldHash = treeDigest(base);
if (oldHash !== '0068f03238f8a2a11b8f74a964316f7eb0b46b460e7e9b91490e6164fabc590f') throw Error('Baseline does not match the verified Beta 2 source: ' + oldHash);
const old = new Map(base.map(f => [f.path, f.sha256]));
if (command === 'freeze') {
  const currentRoot = await realpath(extra);
  const current = await inventory(currentRoot);
  const changed = [];
  const present = new Set(current.map(f => f.path));
  for (const file of current) {
    if (old.get(file.path) === file.sha256) continue;
    const bytes = await readFile(path.join(currentRoot, file.path));
    if (digest(bytes) !== file.sha256) throw Error('Source changed while packaging: ' + file.path);
    changed.push({...file, data: bytes.toString('base64')});
  }
  const removed = base.filter(f => !present.has(f.path)).map(f => f.path);
  const meta = {format: 1, baseline: oldHash, target: treeDigest(current), files: current.length};
  if (treeDigest(await inventory(currentRoot)) !== meta.target) throw Error('Source changed while packaging');
  await writeFile(output, gzipSync(Buffer.from(JSON.stringify({...meta, changed, removed})), {level: 9}), {flag: 'wx'});
  console.log(JSON.stringify({...meta, changed: changed.map(f => f.path), removed}, null, 2));
} else if (command === 'apply') {
  const overlay = JSON.parse(gunzipSync(await readFile(extra), {maxOutputLength: 512 * 1024 * 1024}));
  if (overlay.format !== 1 || overlay.baseline !== oldHash) throw Error('Invalid source overlay');
  const touched = new Set();
  for (const name of overlay.changed.map(f => f.path).concat(overlay.removed)) {
    if (!sourcePathAllowed(name) || touched.has(name)) throw Error('Unsafe source path: ' + name);
    touched.add(name);
    let ancestor = root;
    for (const component of name.split('/').slice(0,-1)) {
      ancestor = path.join(ancestor, component);
      const stat = await lstat(ancestor).catch(error => error.code === 'ENOENT' ? undefined : Promise.reject(error));
      if (stat && (!stat.isDirectory() || stat.isSymbolicLink())) throw Error('Unsafe source parent: ' + name);
    }
  }
  for (const f of overlay.changed) {
    const bytes = Buffer.from(f.data, 'base64');
    if (f.bytes !== bytes.length || f.sha256 !== digest(bytes)) throw Error('File checksum mismatch: ' + f.path);
    const destination = path.join(root, f.path);
    await mkdir(path.dirname(destination), {recursive: true});
    await writeFile(destination, bytes, {flag: old.has(f.path) ? 'w' : 'wx'});
  }
  for (const f of overlay.removed) { if (!old.has(f)) throw Error('Unknown removed file ' + f); await unlink(path.join(root, f)); }
  const result = await inventory(root);
  if (result.length !== overlay.files || treeDigest(result) !== overlay.target) throw Error('Restored release differs from its frozen source');
  console.log(JSON.stringify({files: result.length, sha256: overlay.target}));
} else throw Error('Expected freeze or apply command');
