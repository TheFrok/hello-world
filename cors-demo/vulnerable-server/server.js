/**
 * Vulnerable API Server - Port 3001
 *
 * CORS MISCONFIGURATIONS DEMONSTRATED:
 *   1. /api/data-reflect  — reflects any Origin header back (trusts all origins)
 *   2. /api/data-wildcard — uses Access-Control-Allow-Origin: * with credentials
 *   3. /api/data-null     — trusts the "null" origin (file:// / sandboxed iframes)
 *   4. /api/data-secure   — correctly configured endpoint (for comparison)
 */

const http = require('http');
const url  = require('url');

// Simulated sensitive data (imagine this is behind auth)
const SENSITIVE_DATA = {
  user: 'alice',
  email: 'alice@internal-company.com',
  apiKey: 'sk-secret-1234567890abcdef',
  balance: '$12,450.00',
};

// Session cookie that would be sent automatically by the browser
const SESSION_COOKIE = 'session=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.secret';

function setCorsHeaders(res, origin, mode) {
  switch (mode) {
    case 'reflect':
      // BAD: reflects whatever Origin the client sends
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      break;

    case 'wildcard-credentials':
      // BAD: wildcard + credentials is rejected by browsers, but shows intent
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      break;

    case 'null':
      // BAD: trusts the special "null" origin
      if (origin === 'null' || !origin) {
        res.setHeader('Access-Control-Allow-Origin', 'null');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }
      break;

    case 'secure':
      // GOOD: only allow a specific, trusted origin
      const ALLOWED = 'http://localhost:3002';
      if (origin === ALLOWED) {
        res.setHeader('Access-Control-Allow-Origin', ALLOWED);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Vary', 'Origin');
      }
      // If origin is not allowed, no CORS headers → browser blocks response
      break;
  }
}

function jsonResponse(res, statusCode, body) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body, null, 2));
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const origin    = req.headers['origin'];

  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}  Origin: ${origin || '(none)'}`);

  // Handle pre-flight
  if (req.method === 'OPTIONS') {
    const path = parsedUrl.pathname;
    if (path.includes('reflect'))             setCorsHeaders(res, origin, 'reflect');
    else if (path.includes('wildcard'))       setCorsHeaders(res, origin, 'wildcard-credentials');
    else if (path.includes('null'))           setCorsHeaders(res, origin, 'null');
    else if (path.includes('secure'))         setCorsHeaders(res, origin, 'secure');
    res.writeHead(204);
    res.end();
    return;
  }

  // Routes
  switch (parsedUrl.pathname) {

    case '/api/data-reflect':
      setCorsHeaders(res, origin, 'reflect');
      // Simulates an endpoint that is authenticated via cookies
      res.setHeader('Set-Cookie', SESSION_COOKIE + '; HttpOnly; SameSite=None; Secure=false');
      jsonResponse(res, 200, {
        vulnerability: 'Origin Reflection',
        description: 'Server reflects any Origin back — any site can read this.',
        echoed_origin: origin,
        sensitive: SENSITIVE_DATA,
      });
      break;

    case '/api/data-wildcard':
      setCorsHeaders(res, origin, 'wildcard-credentials');
      jsonResponse(res, 200, {
        vulnerability: 'Wildcard + Credentials',
        description: 'Wildcard with credentials is invalid per spec, browsers block it.',
        sensitive: SENSITIVE_DATA,
      });
      break;

    case '/api/data-null':
      setCorsHeaders(res, origin, 'null');
      jsonResponse(res, 200, {
        vulnerability: 'Null Origin Trust',
        description: 'Server trusts the "null" origin — exploitable via sandboxed iframes.',
        echoed_origin: origin,
        sensitive: SENSITIVE_DATA,
      });
      break;

    case '/api/data-secure':
      setCorsHeaders(res, origin, 'secure');
      jsonResponse(res, 200, {
        note: 'Correctly configured — only http://localhost:3002 can read this.',
        public_info: 'Nothing sensitive is leaked to unauthorized origins.',
      });
      break;

    case '/':
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Vulnerable API Server running.\nEndpoints: /api/data-reflect  /api/data-wildcard  /api/data-null  /api/data-secure\n');
      break;

    default:
      jsonResponse(res, 404, { error: 'Not found' });
  }
});

server.listen(3001, () => {
  console.log('Vulnerable API server listening on http://localhost:3001');
  console.log('Endpoints:');
  console.log('  GET /api/data-reflect   — VULNERABLE: reflects Origin');
  console.log('  GET /api/data-wildcard  — VULNERABLE: wildcard + credentials');
  console.log('  GET /api/data-null      — VULNERABLE: trusts null origin');
  console.log('  GET /api/data-secure    — SAFE: whitelist-only');
});
