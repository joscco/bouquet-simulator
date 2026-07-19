import {createServer} from 'node:http';
import {mkdir, readFile, rename, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const port = 4300;
const defaultsFile = resolve('src/app/core/data/default-flowers.ts');
const temporaryFile = `${defaultsFile}.tmp`;
const previewsDirectory = resolve('public/previews');
const previewManifestFile = resolve(previewsDirectory, 'manifest.json');
const previewSourceFile = resolve('src/app/core/data/default-flower-previews.ts');
const maximumBodySize = 5 * 1024 * 1024;

createServer(async (request, response) => {
  if (request.method !== 'PUT') {
    sendJson(response, 404, {error: 'Nicht gefunden.'});
    return;
  }

  try {
    if (request.url === '/api/default-preview') {
      const preview = JSON.parse(await readBody(request));
      await writePreview(preview);
      sendJson(response, 200, {saved: preview.id, file: `public/previews/${preview.filename}`});
      return;
    }
    if (request.url !== '/api/defaults') {
      sendJson(response, 404, {error: 'Nicht gefunden.'});
      return;
    }
    const definitions = JSON.parse(await readBody(request));
    validateDefinitions(definitions);
    const source = [
      "import type {FlowerDefinition} from '../models/flower.models';",
      '',
      '// Wird über den lokalen Blumen-Editor erzeugt. Änderungen bitte im Editor speichern.',
      `export const DEFAULT_FLOWERS: FlowerDefinition[] = ${JSON.stringify(definitions, null, 2)};`,
      '',
    ].join('\n');
    await writeFile(temporaryFile, source, 'utf8');
    await rename(temporaryFile, defaultsFile);
    sendJson(response, 200, {saved: definitions.length, file: 'src/app/core/data/default-flowers.ts'});
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : 'Defaults konnten nicht gespeichert werden.',
    });
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Defaults-Server: http://127.0.0.1:${port}`);
});

async function writePreview(value) {
  if (
    !value
    || typeof value.id !== 'string'
    || !value.id
    || typeof value.filename !== 'string'
    || !/^[a-z0-9_-]+\.png$/.test(value.filename)
    || typeof value.dataUrl !== 'string'
    || !value.dataUrl.startsWith('data:image/png;base64,')
    || typeof value.preview?.key !== 'string'
    || typeof value.preview?.url !== 'string'
  ) {
    throw new Error('Die Preview-Daten sind ungültig.');
  }
  await mkdir(previewsDirectory, {recursive: true});
  const manifest = await readPreviewManifest();
  manifest[value.id] = value.preview;
  const base64 = value.dataUrl.slice(value.dataUrl.indexOf(',') + 1);
  await writeFile(resolve(previewsDirectory, value.filename), Buffer.from(base64, 'base64'));
  await writeFile(previewManifestFile, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  const source = [
    '// Wird zusammen mit den Default-PNGs vom lokalen Defaults-Server erzeugt.',
    `export const DEFAULT_FLOWER_PREVIEWS: Readonly<Record<string, {key: string; url: string}>> = ${JSON.stringify(manifest, null, 2)};`,
    '',
  ].join('\n');
  await writeFile(previewSourceFile, source, 'utf8');
}

async function readPreviewManifest() {
  try {
    const parsed = JSON.parse(await readFile(previewManifestFile, 'utf8'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maximumBodySize) throw new Error('Die Defaults-Datei ist zu groß.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function validateDefinitions(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('Es wurden keine Blumendefinitionen übergeben.');
  }
  for (const definition of value) {
    if (
      !definition
      || definition.schemaVersion !== 2
      || typeof definition.id !== 'string'
      || !definition.id
      || !Array.isArray(definition.nodes)
    ) {
      throw new Error('Eine Blumendefinition ist ungültig.');
    }
  }
}

function sendJson(response, status, body) {
  response.writeHead(status, {'content-type': 'application/json; charset=utf-8'});
  response.end(JSON.stringify(body));
}
