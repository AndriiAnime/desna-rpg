import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { readFile, writeFile, readdir, mkdir, lstat, unlink, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SOURCE_DIRECTORIES = ['public', 'scripts', 'src', 'tests', 'tools'];
export const SOURCE_TOP_FILES = ['.gitignore', '.nvmrc', 'package.json', 'package-lock.json'];
export const digest = bytes => createHash('sha256').update(bytes).digest('hex');
export const sorted = values => values.sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
export const sourcePathAllowed = value => typeof value === 'string' && value.length > 0
  && !value.includes('\\') && !value.startsWith('/') && !value.split('/').some(part => part === '.' || part === '..' || part === '')
  && (SOURCE_DIRECTORIES.some(root => value.startsWith(`${root}/`))
    || SOURCE_TOP_FILES.includes(value) || (!value.includes('/') && /\.(?:html|js|mjs)$/.test(value)));

export async function inventory(root) {
  const files = [];
  async function visit(relative) {
    const entries = await readdir(path.join(root, relative), { withFileTypes: true });
    for (const entry of entries) {
      const name = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (relative || SOURCE_DIRECTORIES.includes(name)) await visit(name);
      } else if (entry.isFile()) {
        if (!sourcePathAllowed(name)) continue;
        const bytes = await readFile(path.join(root, name));
        files.push({ path: name, bytes: bytes.length, sha256: digest(bytes) });
      } else if (relative || sourcePathAllowed(name)) throw new Error(`Refusing non-regular source entry: ${name}`);
    }
  }
  await visit('');
  return files.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}
export const treeDigest = files => digest(JSON.stringify(files));

async function rejectSymlinkParents(root, relative) {
  let current = root;
  for (const component of relative.split('/').slice(0, -1)) {
    current = path.join(current, component);
    const stat = await lstat(current).catch(error => error.code === 'ENOENT' ? null : Promise.reject(error));
    if (stat && (!stat.isDirectory() || stat.isSymbolicLink())) throw new Error(`Unsafe target parent: ${relative}`);
  }
}

export async function restoreOverlay(bundleDirectory, destination) {
  const root = await realpath(destination);
  const manifest = JSON.parse(await readFile(path.join(bundleDirectory, 'beta2-bugfix-release.json'), 'utf8'));
  if (manifest.schemaVersion !== 1 || manifest.format !== 'desna-source-overlay-json-gzip') throw new Error('Unsupported overlay format');
  const baseline = await inventory(root);
  if (treeDigest(baseline) !== manifest.baselineTreeSha256) throw new Error('Baseline source tree does not match the frozen Beta 2 source');
  const chunks = [];
  for (const [index, part] of manifest.parts.entries()) {
    if (part.file !== `beta2-bugfix-overlay.json.gz.part-${String(index).padStart(3, '0')}`) throw new Error('Unexpected archive part name/order');
    const bytes = await readFile(path.join(bundleDirectory, part.file));
    if (bytes.length !== part.bytes || digest(bytes) !== part.sha256) throw new Error(`Overlay part checksum mismatch: ${part.file}`);
    chunks.push(bytes);
  }
  const archive = Buffer.concat(chunks);
  if (archive.length !== manifest.overlayBytes || digest(archive) !== manifest.overlaySha256) throw new Error('Overlay archive checksum mismatch');
  const payload = JSON.parse(gunzipSync(archive, { maxOutputLength: 1024 * 1024 * 1024 }).toString('utf8'));
  if (payload.schemaVersion !== 1 || payload.baselineTreeSha256 !== manifest.baselineTreeSha256 || payload.targetTreeSha256 !== manifest.targetTreeSha256) throw new Error('Overlay metadata mismatch');
  if (payload.files.length !== manifest.changedFiles || payload.removed.length !== manifest.removedFiles) throw new Error('Overlay file count mismatch');
  const old = new Map(baseline.map(file => [file.path, file]));
  const seen = new Set();
  const decoded = [];
  for (const file of payload.files) {
    if (!sourcePathAllowed(file.path) || seen.has(file.path)) throw new Error(`Unsafe or duplicate overlay path: ${file.path}`);
    seen.add(file.path);
    if ((old.get(file.path)?.sha256 ?? null) !== file.previousSha256) throw new Error(`Previous file checksum mismatch: ${file.path}`);
    const bytes = Buffer.from(file.base64, 'base64');
    if (bytes.length !== file.bytes || digest(bytes) !== file.sha256) throw new Error(`Overlay content checksum mismatch: ${file.path}`);
    await rejectSymlinkParents(root, file.path);
    decoded.push([file, bytes]);
  }
  for (const file of payload.removed) {
    if (!sourcePathAllowed(file.path) || seen.has(file.path) || old.get(file.path)?.sha256 !== file.previousSha256) throw new Error(`Unsafe deletion: ${file.path}`);
    seen.add(file.path);
    await rejectSymlinkParents(root, file.path);
  }
  // All old/new contents and every path are checked before mutating the restored copy.
  for (const file of payload.removed) await unlink(path.join(root, file.path));
  for (const [file, bytes] of decoded) {
    const target = path.join(root, file.path);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes);
  }
  const restored = await inventory(root);
  if (restored.length !== manifest.targetFiles || treeDigest(restored) !== manifest.targetTreeSha256) throw new Error('Restored source tree checksum mismatch');
  return { targetFiles: restored.length, changedFiles: decoded.length, removedFiles: payload.removed.length, targetTreeSha256: manifest.targetTreeSha256 };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.argv[2]) throw new Error('Usage: node restore-beta2-bugfix.mjs <restored-frozen-beta2-source>');
  console.log(JSON.stringify(await restoreOverlay(path.dirname(fileURLToPath(import.meta.url)), process.argv[2]), null, 2));
}
