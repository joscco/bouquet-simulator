import {createServer} from 'node:http';
import {rename, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const port = 4300;
const defaultsFile = resolve('src/app/core/data/default-flowers.ts');
const temporaryFile = `${defaultsFile}.tmp`;
const maximumBodySize = 5 * 1024 * 1024;

createServer(async (request, response) => {
  if (request.method !== 'PUT' || request.url !== '/api/defaults') {
    sendJson(response, 404, {error: 'Nicht gefunden.'});
    return;
  }

  try {
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
