# CORS Vulnerability Demo

An educational, self-contained demo showing common CORS misconfigurations and how they are exploited.

## Architecture

| Server | Port | Role |
|---|---|---|
| `vulnerable-server` | 3001 | API with four endpoints — three misconfigured, one correct |
| `legitimate-site`   | 3002 | Authorized consumer of the API |
| `attacker-site`     | 3003 | Malicious site that exploits the misconfigurations |

## Quick Start

```bash
cd cors-demo
node start.js
```

Then open:
- **http://localhost:3003** — attacker site (run exploits here)
- **http://localhost:3002** — legitimate site (for comparison)

Use your browser's **DevTools → Network tab** to inspect the CORS request/response headers.

---

## Vulnerabilities Demonstrated

### 1. Origin Reflection (`/api/data-reflect`)

**Misconfiguration:**
```
Access-Control-Allow-Origin: <echoes request Origin>
Access-Control-Allow-Credentials: true
```

**Why it's dangerous:**  
The server reads the `Origin` header from the request and mirrors it verbatim.  
Any origin — including `http://localhost:3003` (the attacker) — is accepted.  
Combined with `credentials: include`, the attacker's fetch silently forwards the  
victim's cookies and reads the authenticated response.

**Fix:** Maintain an explicit allowlist and check against it:
```js
const ALLOWED = new Set(['https://app.example.com']);
if (ALLOWED.has(req.headers.origin)) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
  res.setHeader('Vary', 'Origin');
}
```

---

### 2. Wildcard + Credentials (`/api/data-wildcard`)

**Misconfiguration:**
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Credentials: true
```

**Why it's dangerous (in intent):**  
The developer intended to allow all origins with full credential access.  
Browsers reject this combination per the CORS spec, which prevents credentialed  
exfiltration — but unauthenticated `fetch` without `credentials: include` can  
still read the response. Sensitive public endpoints are still exposed.

**Fix:** Never combine `*` with `Allow-Credentials: true`. Use an explicit origin list.

---

### 3. Null Origin Trust (`/api/data-null`)

**Misconfiguration:**
```
Access-Control-Allow-Origin: null
Access-Control-Allow-Credentials: true
```

**Why it's dangerous:**  
Browsers send `Origin: null` from sandboxed iframes (those without  
`allow-same-origin`) and from `file://` pages. An attacker can host a page that  
creates a sandboxed iframe; the iframe makes the request with `Origin: null`,  
the server permits it, and the data is exfiltrated back to the attacker via  
`postMessage`.

**Fix:** Never add `null` to your origin allowlist.

---

### 4. Secure Endpoint (`/api/data-secure`) — the correct baseline

**Configuration:**
```
# Only set headers when origin matches
Vary: Origin
Access-Control-Allow-Origin: http://localhost:3002   ← exact match only
Access-Control-Allow-Credentials: true
```

Requests from `http://localhost:3003` receive **no** CORS headers, so the browser  
enforces the same-origin policy and blocks the response.

---

## Key Takeaways

| Rule | Why |
|---|---|
| Use an explicit allowlist, never reflect | Reflection defeats the purpose of CORS |
| Never combine `*` with `credentials: true` | Browsers block it, but intent is still wrong |
| Never trust `null` origin | Trivially exploitable via sandboxed iframes |
| Always set `Vary: Origin` | Prevents cache poisoning when using per-origin headers |
| Reject preflight for unknown origins | Defence-in-depth; don't just ignore the OPTIONS request |
