import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {mkdtemp, mkdir, readFile, rm, stat, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname, extname, join, normalize, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist/bouquet-simulator/browser');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const STORAGE_KEY = 'bouquet-studio.current-bouquet.v1';
const DEFAULTS = {frames: 180, fps: 30, size: 1080};
const START_ANGLE_DEGREES = 18;

const REPRESENTATIVE_BOUQUET = {
  schemaVersion: 2,
  rotation: 0,
  vaseId: 'classic',
  vaseMaterialId: 'stoneware',
  flowers: [
    flower('peony-left', 'garden-rose', -15, -16, 5, 1.02, 0.12, 0.12, 0.08),
    flower('peony-right', 'garden-rose', 13, -16, 4, 0.92, 0.72, 0.08, -0.1),
    flower('daisy-left', 'meadow-daisy', -18, -15, -9, 0.9, 0.24, -0.06, 0.15),
    flower('daisy-right', 'meadow-daisy', 18, -15, -8, 0.84, 0.88, -0.05, -0.16),
    flower('lilac-center', 'lilac', 0, -17, 17, 1.02, 0.41, 0.12, 0),
    flower('gypsophila-back', 'neue-blume', -8, -16, 20, 0.88, 0.63, 0.1, 0.08),
    flower('lily-front', 'neue-blume-4', 8, -16, -15, 0.94, 0.35, -0.07, -0.06),
  ],
};

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
};

function flower(instanceId, definitionId, x, y, z, scale, seed, leanX, leanZ) {
  return {instanceId, definitionId, x, y, z, scale, seed, leanX, leanZ, nodeOffsets: {}};
}

function readOptions(arguments_) {
  const options = {...DEFAULTS, output: join(ROOT, 'public/media')};
  for (const argument of arguments_) {
    const [name, value] = argument.split('=', 2);
    if (name === '--frames') options.frames = positiveInteger(value, name);
    else if (name === '--fps') options.fps = positiveInteger(value, name);
    else if (name === '--size') options.size = positiveInteger(value, name);
    else if (name === '--output') options.output = resolve(ROOT, value);
    else throw new Error(`Unbekannte Option: ${argument}`);
  }
  return options;
}

function positiveInteger(value, name) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${name} erwartet eine positive Ganzzahl.`);
  return parsed;
}

function createStaticServer(root) {
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', 'http://localhost');
      const requested = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.(\/|\\|$))+/, '');
      let file = join(root, requested === '/' ? 'index.html' : requested);
      const info = await stat(file).catch(() => null);
      if (!info?.isFile()) file = join(root, 'index.html');
      response.writeHead(200, {
        'Content-Type': MIME_TYPES[extname(file)] ?? 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      response.end(await readFile(file));
    } catch (error) {
      response.writeHead(500, {'Content-Type': 'text/plain; charset=utf-8'});
      response.end(error instanceof Error ? error.message : 'Unbekannter Serverfehler');
    }
  });
}

async function listen(server) {
  await new Promise((resolvePromise, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolvePromise);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Der Vorschau-Server hat keinen Port erhalten.');
  return address.port;
}

async function unusedPort() {
  const server = createServer();
  const port = await listen(server);
  await new Promise((resolvePromise) => server.close(resolvePromise));
  return port;
}

async function waitForJson(url, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return await response.json();
    } catch {
      // Chrome has not opened the debugging port yet.
    }
    await delay(100);
  }
  throw new Error(`Zeitüberschreitung beim Warten auf ${url}`);
}

class CdpClient {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.nextId = 1;
    this.pending = new Map();
  }

  async connect() {
    await new Promise((resolvePromise, reject) => {
      this.socket.addEventListener('open', resolvePromise, {once: true});
      this.socket.addEventListener('error', reject, {once: true});
    });
    this.socket.addEventListener('message', ({data}) => {
      const message = JSON.parse(data);
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolvePromise, reject) => {
      this.pending.set(id, {resolve: resolvePromise, reject});
      this.socket.send(JSON.stringify({id, method, params}));
    });
  }

  close() {
    this.socket.close();
  }
}

async function waitForExpression(client, expression, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const evaluation = await client.send('Runtime.evaluate', {expression, returnByValue: true});
    if (evaluation.result?.value) return;
    await delay(100);
  }
  throw new Error(`Die Anwendung wurde nicht rechtzeitig bereit: ${expression}`);
}

async function evaluate(client, expression) {
  const evaluation = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (evaluation.exceptionDetails) {
    throw new Error(evaluation.exceptionDetails.exception?.description ?? 'Fehler im Browser-Kontext.');
  }
  return evaluation.result?.value;
}

async function run(command, arguments_) {
  await new Promise((resolvePromise, reject) => {
    const child = spawn(command, arguments_, {cwd: ROOT, stdio: 'inherit'});
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`${command} wurde mit Code ${code ?? 'unbekannt'} beendet.`));
    });
  });
}

function delay(milliseconds) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

async function main() {
  const options = readOptions(process.argv.slice(2));
  await stat(join(DIST, 'index.html'));
  await stat(CHROME);
  await mkdir(options.output, {recursive: true});

  const workspace = await mkdtemp(join(tmpdir(), 'bouquet-turntable-'));
  const frames = join(workspace, 'frames');
  const profile = join(workspace, 'chrome-profile');
  await mkdir(frames, {recursive: true});

  const server = createStaticServer(DIST);
  const serverPort = await listen(server);
  const debuggingPort = await unusedPort();
  const chrome = spawn(CHROME, [
    '--headless=new',
    `--remote-debugging-port=${debuggingPort}`,
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--hide-scrollbars',
    '--disable-dev-shm-usage',
    '--enable-webgl',
    '--use-angle=swiftshader',
    `--window-size=${options.size},${options.size}`,
    'about:blank',
  ], {stdio: 'ignore'});
  const chromeExited = new Promise((resolvePromise) => chrome.once('exit', resolvePromise));

  let client;
  try {
    await waitForJson(`http://127.0.0.1:${debuggingPort}/json/version`);
    const target = await fetch(`http://127.0.0.1:${debuggingPort}/json/new?about:blank`, {method: 'PUT'})
      .then((response) => response.json());
    client = new CdpClient(target.webSocketDebuggerUrl);
    await client.connect();
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: options.size,
      height: options.size,
      screenWidth: options.size,
      screenHeight: options.size,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await client.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `localStorage.clear(); localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(JSON.stringify(REPRESENTATIVE_BOUQUET))});`,
    });
    await client.send('Page.navigate', {url: `http://127.0.0.1:${serverPort}/`});
    await waitForExpression(client, `Boolean(document.querySelector('canvas') && document.querySelector('#rotation input'))`);

    await evaluate(client, `(() => {
      document.querySelector('app-view-switcher')?.setAttribute('hidden', '');
      document.querySelector('app-bouquet-side-panel')?.setAttribute('hidden', '');
      const canvasComponent = document.querySelector('app-bouquet-canvas');
      if (!canvasComponent) throw new Error('Strauß-Canvas fehlt.');
      canvasComponent.style.left = '-64px';
      canvasComponent.style.right = 'auto';
      canvasComponent.style.width = 'calc(100% + 64px)';
      document.body.style.background = '#f8f7f2';
      const canvasHost = canvasComponent.querySelector('div');
      if (!canvasHost) throw new Error('Canvas-Host fehlt.');
      const bounds = canvasHost.getBoundingClientRect();
      canvasHost.dispatchEvent(new WheelEvent('wheel', {
        deltaY: -120,
        clientX: bounds.left + bounds.width / 2,
        clientY: bounds.top + bounds.height / 2,
        bubbles: true,
        cancelable: true,
      }));
      return new Promise((resolvePromise) => setTimeout(
        () => requestAnimationFrame(() => requestAnimationFrame(resolvePromise)),
        500,
      ));
    })()`);

    for (let frame = 0; frame < options.frames; frame += 1) {
      const degrees = START_ANGLE_DEGREES + frame * 360 / options.frames;
      await evaluate(client, `(() => {
        const input = document.querySelector('#rotation input');
        if (!(input instanceof HTMLInputElement)) throw new Error('Drehregler fehlt.');
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        setter?.call(input, ${degrees});
        input.dispatchEvent(new Event('input', {bubbles: true}));
        return new Promise((resolvePromise) => requestAnimationFrame(() => requestAnimationFrame(resolvePromise)));
      })()`);
      const screenshot = await client.send('Page.captureScreenshot', {
        format: 'png',
        fromSurface: true,
        captureBeyondViewport: false,
      });
      await writeFile(join(frames, `frame-${String(frame).padStart(4, '0')}.png`), Buffer.from(screenshot.data, 'base64'));
      if ((frame + 1) % Math.max(1, Math.floor(options.frames / 10)) === 0 || frame + 1 === options.frames) {
        console.log(`Frames: ${frame + 1}/${options.frames}`);
      }
    }

    const inputPattern = join(frames, 'frame-%04d.png');
    const mp4 = join(options.output, 'bouquet-turntable.mp4');
    const webm = join(options.output, 'bouquet-turntable.webm');
    const poster = join(options.output, 'bouquet-turntable-poster.webp');
    await run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'warning', '-framerate', String(options.fps), '-i', inputPattern,
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4]);
    await run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'warning', '-framerate', String(options.fps), '-i', inputPattern,
      '-c:v', 'libvpx-vp9', '-crf', '31', '-b:v', '0', '-pix_fmt', 'yuv420p', '-row-mt', '1', '-deadline', 'good', webm]);
    await run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'warning', '-i', join(frames, 'frame-0000.png'),
      '-frames:v', '1', '-c:v', 'libwebp', '-quality', '88', poster]);
    console.log(`Turntable exportiert nach ${options.output}`);
  } finally {
    client?.close();
    chrome.kill('SIGTERM');
    await Promise.race([chromeExited, delay(3_000)]);
    await new Promise((resolvePromise) => server.close(resolvePromise));
    await rm(workspace, {recursive: true, force: true, maxRetries: 5, retryDelay: 200});
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
