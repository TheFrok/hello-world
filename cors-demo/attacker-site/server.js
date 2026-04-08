/**
 * Attacker Site - Port 3003
 * Demonstrates how a malicious origin exploits CORS misconfigurations.
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');

http.createServer((req, res) => {
  const filePath = path.join(__dirname, 'index.html');
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(fs.readFileSync(filePath));
}).listen(3003, () => {
  console.log('Attacker site running on http://localhost:3003');
});
