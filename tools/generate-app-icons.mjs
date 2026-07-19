import {spawnSync} from 'node:child_process';
import {copyFile, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';

const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const source = resolve('public/icons/bouquet-studio.svg');
const temporaryDirectory = await mkdtemp(join(tmpdir(), 'bouquet-studio-icons-'));
const master = join(temporaryDirectory, 'bouquet-studio-1024.png');

try {
  run(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--default-background-color=00000000',
    '--window-size=1024,1024',
    `--screenshot=${master}`,
    new URL(`file://${source}`).href,
  ]);

  for (const size of [16, 32, 180, 192, 512, 1024]) {
    const target = resolve(`public/icons/bouquet-studio-${size}.png`);
    if (size === 1024) await copyFile(master, target);
    else run('sips', ['-z', String(size), String(size), master, '--out', target]);
  }

  await copyFile(resolve('public/icons/bouquet-studio-192.png'), resolve('public/icon.png'));
  const faviconPng = await readFile(resolve('public/icons/bouquet-studio-32.png'));
  const favicon = pngIco(faviconPng, 32);
  await writeFile(resolve('public/bouquet-studio.ico'), favicon);
  await writeFile(resolve('public/favicon.ico'), favicon);
} finally {
  await rm(temporaryDirectory, {recursive: true, force: true});
}

function run(command, arguments_) {
  const result = spawnSync(command, arguments_, {stdio: 'inherit'});
  if (result.status !== 0) throw new Error(`${command} ist mit Status ${result.status} fehlgeschlagen.`);
}

function pngIco(png, size) {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header.writeUInt8(size === 256 ? 0 : size, 6);
  header.writeUInt8(size === 256 ? 0 : size, 7);
  header.writeUInt8(0, 8);
  header.writeUInt8(0, 9);
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(header.length, 18);
  return Buffer.concat([header, png]);
}
