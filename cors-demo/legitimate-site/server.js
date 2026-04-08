/**
 * Legitimate Site - Port 3002
 * This is the authorized origin that the vulnerable API is "meant" to serve.
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');

http.createServer((req, res) => {
  const filePath = path.join(__dirname, 'index.html');
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(fs.readFileSync(filePath));
}).listen(3002, () => {
  console.log('Legitimate site running on http://localhost:3002');
});
