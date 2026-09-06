import { execFileSync } from 'node:child_process';
import { copyFile, lstat, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
const blockedDirectories = new Set([
  '.git', 'node_modules', 'dist', 'coverage', 'test-results', 'playwright-report',
  '.idea', '.vscode',
]);
const excluded = (file) => {
  const parts = file.split('/');
  const name = parts.at(-1);
  return parts.some((part) => blockedDirectories.has(part))
    || (name.startsWith('.env') && name !== '.env.example')
    || /\.(?:zip|mp4|mov|mkv|webm|avi|log|tsbuildinfo)$/i.test(name)
    || ['.DS_Store', 'Thumbs.db'].includes(name);
};

// Git's ignore rules exclude local files; also exclude secrets and build outputs
// if they were accidentally tracked. Copy regular files only.
const files = [];
for (const file of new Set(git('ls-files', '--cached', '--others', '--exclude-standard', '-z').split('\0'))) {
  if (!file || excluded(file)) continue;
  const stat = await lstat(join(root, file)).catch((error) => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (stat?.isSymbolicLink()) throw new Error('Review symbolic link before packaging: ' + file);
  if (stat?.isFile()) files.push(file);
}
files.sort();

const artifactPath = (file) => {
  if (file === 'docs/requirements/traceability.csv') return '3/traceability.csv';
  for (const [from, to] of [
    ['docs/submission/1/', '1/'],
    ['docs/requirements/', '1/requirements/'],
    ['docs/architecture/', '2/'],
    ['docs/testing/', '3/'],
    ['docs/scrum/', '4/'],
    ['docs/submission/5/', '5/'],
    ['docs/submission/7/', '7/'],
  ]) {
    if (file.startsWith(from)) return to + file.slice(from.length);
    if (file === from.slice(0, -1)) return to.slice(0, -1);
  }
  return null;
};

// Copies in 1–5 and 7 link to their packaged destinations. Folder 6 preserves
// the original repository layout so its README and source remain self-contained.
const rewriteLinks = (text, source, target) => text.replace(
  /(!?\[[^\]]*\]\()(<[^>]+>|[^)\s]+)(\))/g,
  (match, start, raw, end) => {
    const href = raw.startsWith('<') ? raw.slice(1, -1) : raw;
    if (/^(?:[a-z][a-z\d+.-]*:|\/|#)/i.test(href)) return match;
    const boundary = href.search(/[?#]/);
    const name = boundary < 0 ? href : href.slice(0, boundary);
    const suffix = boundary < 0 ? '' : href.slice(boundary);
    const resolved = posix.normalize(posix.join(posix.dirname(source), decodeURI(name)));
    if (resolved.startsWith('../')) return match;
    const destination = artifactPath(resolved) ?? '6/' + resolved;
    const relative = posix.relative(posix.dirname(target), destination) || '.';
    return start + encodeURI(relative) + suffix + end;
  },
);

await mkdir(join(root, 'dist'), { recursive: true });
const output = await mkdtemp(join(root, 'dist', 'submission-'));
for (let number = 1; number <= 7; number++) {
  await mkdir(join(output, String(number)));
}

for (const file of files) {
  const source = join(root, file);
  const release = join(output, '6', file);
  await mkdir(dirname(release), { recursive: true });
  await copyFile(source, release);
  const artifact = artifactPath(file);
  if (!artifact) continue;
  const target = join(output, artifact);
  await mkdir(dirname(target), { recursive: true });
  if (file.endsWith('.md')) {
    await writeFile(target, rewriteLinks(await readFile(source, 'utf8'), file, artifact), 'utf8');
  } else {
    await copyFile(source, target);
  }
}

const status = git('status', '--porcelain');
await writeFile(join(output, '7', 'package-record.txt'), [
  'ConnectSphere submission preparation record',
  'Prepared: ' + new Date().toISOString(),
  'Repository: ' + git('remote', 'get-url', 'origin').trim(),
  'Local HEAD: ' + git('rev-parse', 'HEAD').trim(),
  'Source files copied into folder 6: ' + files.length,
  'Working tree: ' + (status.trim() ? 'contains uncommitted changes (copied as they are on disk)' : 'clean'),
  '',
  'This is a snapshot for review, not a completed submission or test result.',
  'Check docs/submission/checklist.md and complete pending evidence before final packaging.',
  '',
  'Working-tree status at preparation:',
  status.trimEnd() || '(clean)',
  '',
].join('\n'), 'utf8');

console.log('Prepared draft submission folders 1–7 at:');
console.log(output);
console.log('Review the checklist, then ZIP the seven numbered folders together.');
console.log('Evidence completeness, test outcomes and instructor access require team review.');
