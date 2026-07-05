import {spawn} from 'node:child_process';

const node = process.execPath;
const api = spawn(node, ['tools/defaults-server.mjs'], {stdio: 'inherit'});
const angular = spawn(
  node,
  ['node_modules/@angular/cli/bin/ng.js', 'serve', '--proxy-config', 'proxy.conf.json'],
  {stdio: 'inherit'},
);

let stopping = false;
function stop(signal = 'SIGTERM') {
  if (stopping) return;
  stopping = true;
  api.kill(signal);
  angular.kill(signal);
}

process.on('SIGINT', () => stop('SIGINT'));
process.on('SIGTERM', () => stop('SIGTERM'));
api.on('exit', (code) => {
  if (!stopping && code !== 0) {
    console.error(`Defaults-Server wurde mit Code ${code} beendet.`);
    stop();
  }
});
angular.on('exit', (code) => {
  if (!stopping) {
    process.exitCode = code ?? 0;
    stop();
  }
});
