import { spawn } from 'node:child_process';

const port = process.env.PORT || '10000';
const server = spawn(process.execPath, [
  'node_modules/next/dist/bin/next', 'start', '--hostname', '0.0.0.0', '--port', port,
], { stdio: 'inherit' });

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.kill(signal));
}
server.on('exit', (code, signal) => process.exit(signal ? 1 : code ?? 1));
