/**
 * Builds `client.js` from `src/client.jsx`.
 *
 * The browser half is one CommonJS bundle wrapped in the DSH Client module
 * loader's factory form. `react` stays external and resolves from the page's
 * shared module table; nothing else is imported.
 *
 * esbuild is never installed in this directory: the script uses a local
 * devDependency when it exists and otherwise reuses the copy that the sibling
 * strudel-player-plugin already has on disk.
 *
 * Usage: node build.mjs
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const outDir = join(root, '.build');
const bodyPath = join(outDir, 'client.body.cjs');

const platform = process.platform;
const arch = process.arch;
const executable = platform === 'win32' ? 'esbuild.exe' : 'esbuild';

const candidates = [
  join(root, 'node_modules', '@esbuild', `${platform}-${arch}`, executable),
  join(root, '..', 'strudel-player-plugin', 'node_modules', '@esbuild', `${platform}-${arch}`, executable),
  join(root, '..', 'strudel-player-plugin', 'node_modules', '@esbuild', 'win32-x64', 'esbuild.exe'),
];

const binary = candidates.find(candidate => existsSync(candidate));
if (binary === undefined) {
  throw new Error(
    'esbuild was not found. Expected one of:\n'
    + candidates.map(candidate => `  ${candidate}`).join('\n')
    + '\nInstall the devDependency (npm install --ignore-scripts) or keep ../strudel-player-plugin on disk.',
  );
}

const args = [
  'src/client.jsx',
  '--bundle',
  '--format=cjs',
  '--platform=browser',
  '--target=es2020',
  '--minify',
  '--external:react',
  '--jsx=transform',
  '--jsx-factory=React.createElement',
  '--jsx-fragment=React.Fragment',
  '--legal-comments=inline',
  '--log-level=warning',
  `--outfile=${bodyPath}`,
];

await mkdir(outDir, { recursive: true });

await new Promise((resolve, reject) => {
  const child = spawn(binary, args, { cwd: root, stdio: 'inherit' });
  child.on('error', (error) => {
    reject(new Error(`Could not run esbuild at ${binary}: ${error.message}`));
  });
  child.on('exit', (code) => {
    if (code === 0) resolve();
    else reject(new Error(`esbuild exited with code ${code}`));
  });
});

const body = await readFile(bodyPath, 'utf8');
const banner = '/*! Reader Conversation View for DeepSeek Harness. */\n';
const client = `${banner}window.__ModuleLoader__.load({
  id: ${JSON.stringify(pkg.name)},
  factory(require) {
    const module = { exports: {} };
    const exports = module.exports;
${body}
    return module.exports;
  },
});
`;

await writeFile(join(root, 'client.js'), client, 'utf8');
const bytes = Buffer.byteLength(client);
console.log(`esbuild: ${binary}`);
console.log(`client.js written (${(bytes / 1024).toFixed(0)} KiB)`);
