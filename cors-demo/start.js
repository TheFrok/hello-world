/**
 * Launches all three servers concurrently.
 * Usage: node start.js
 */

const { fork } = require('child_process');
const path      = require('path');

const servers = [
  { label: 'vulnerable-server', script: path.join(__dirname, 'vulnerable-server/server.js') },
  { label: 'legitimate-site',   script: path.join(__dirname, 'legitimate-site/server.js')   },
  { label: 'attacker-site',     script: path.join(__dirname, 'attacker-site/server.js')     },
];

console.log('='.repeat(60));
console.log('  CORS Vulnerability Demo');
console.log('='.repeat(60));

servers.forEach(({ label, script }) => {
  const child = fork(script, [], { stdio: 'inherit' });
  child.on('error', (err) => console.error(`[${label}] Error: ${err.message}`));
  child.on('exit',  (code) => code && console.error(`[${label}] Exited with code ${code}`));
});

console.log('\nAll servers starting...\n');
console.log('  Vulnerable API  →  http://localhost:3001');
console.log('  Legitimate site →  http://localhost:3002');
console.log('  Attacker site   →  http://localhost:3003\n');
console.log('Open the attacker site in your browser and run the attacks.');
console.log('Use DevTools → Network tab to inspect CORS headers.\n');
console.log('Press Ctrl+C to stop all servers.');
