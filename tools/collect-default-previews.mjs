import {mkdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const debugUrl = process.argv[2] ?? 'http://127.0.0.1:9222';
const pages = await fetch(`${debugUrl}/json/list`).then((response) => response.json());
const page = pages.find((candidate) => candidate.type === 'page' && candidate.url.includes('localhost:4200'));
if (!page?.webSocketDebuggerUrl) throw new Error('Keine laufende Bouquet-Studio-Seite in Chrome gefunden.');

const previews = await evaluate(page.webSocketDebuggerUrl, `
  (async () => {
    if (!window.__renderDefaultFlowerPreviews) throw new Error('Preview-Generator ist nicht verfügbar.');
    return window.__renderDefaultFlowerPreviews();
  })()
`);
if (!Array.isArray(previews) || !previews.length) throw new Error('Chrome hat keine Previews erzeugt.');

const directory = resolve('public/previews');
await mkdir(directory, {recursive: true});
const manifest = {};
for (const preview of previews) {
  if (!preview?.id || !preview?.key || !preview?.dataUrl?.startsWith('data:image/png;base64,')) {
    throw new Error('Chrome hat ungültige Preview-Daten geliefert.');
  }
  const filename = `${safeFilename(preview.id)}.png`;
  const base64 = preview.dataUrl.slice(preview.dataUrl.indexOf(',') + 1);
  await writeFile(resolve(directory, filename), Buffer.from(base64, 'base64'));
  manifest[preview.id] = {key: preview.key, url: `/previews/${filename}`};
}
await writeFile(resolve(directory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
await writeFile(
  resolve('src/app/core/data/default-flower-previews.ts'),
  [
    '// Wird zusammen mit den Default-PNGs vom lokalen Defaults-Server erzeugt.',
    `export const DEFAULT_FLOWER_PREVIEWS: Readonly<Record<string, {key: string; url: string}>> = ${JSON.stringify(manifest, null, 2)};`,
    '',
  ].join('\n'),
  'utf8',
);
console.log(`${previews.length} Default-Previews wurden erzeugt.`);

function safeFilename(id) {
  return id.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-') || 'preview';
}

function evaluate(webSocketUrl, expression) {
  return new Promise((resolvePromise, reject) => {
    const socket = new WebSocket(webSocketUrl);
    const requestId = 1;
    socket.addEventListener('open', () => socket.send(JSON.stringify({
      id: requestId,
      method: 'Runtime.evaluate',
      params: {expression, awaitPromise: true, returnByValue: true},
    })));
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id !== requestId) return;
      socket.close();
      const exception = message.result?.exceptionDetails;
      if (exception) {
        reject(new Error(exception.exception?.description ?? exception.text ?? 'Preview-Erzeugung fehlgeschlagen.'));
        return;
      }
      resolvePromise(message.result?.result?.value);
    });
    socket.addEventListener('error', () => reject(new Error('Chrome DevTools konnte nicht angesprochen werden.')));
  });
}
