import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(readFileSync(path.join(root, 'beta2-release.json'), 'utf8'));
const digest = buffer => createHash('sha256').update(buffer).digest('hex');
const buffers = manifest.parts.map(part => {
  if (!/^beta2-source\.tar\.gz\.part-\d{3}$/.test(part.file)) throw new Error('Unexpected archive part');
  const bytes = readFileSync(path.join(root, part.file));
  if (bytes.length !== part.bytes || digest(bytes) !== part.sha256) throw new Error(`Invalid part: ${part.file}`);
  return bytes;
});
const archive = Buffer.concat(buffers);
if (archive.length !== manifest.sourceBytes || digest(archive) !== manifest.sourceSha256) throw new Error('Source archive checksum mismatch');
const archivePath = path.join(root, 'beta2-source.tar.gz');
writeFileSync(archivePath, archive, {flag:'wx'});
const destination = path.resolve(process.argv[2] || 'beta2-source');
mkdirSync(destination);
execFileSync('tar', ['-xzf', archivePath, '-C', destination]);
console.log(`Restored Beta 2: ${manifest.sourceFiles} source and asset files; SHA-256 ${manifest.sourceSha256}`);
