# TechHaven — P2-SEC-01: Content Security Policy (CSP) Design Gate

**Document Version:** 1.0.0  
**Status:** COMPLETE (Design Gate Passed)  
**Date:** September 19, 2026  
**Target:** Production (Vercel Frontend + Railway Express API) & Local Development  

---

## 1. Executive Summary

A comprehensive, read-only security audit of the TechHaven (EgyHardware) codebase was conducted to establish a strict, production-ready Content Security Policy (CSP). 

Key architecture discoveries:
1. **Zero Direct Supabase Browser Usage**: The React single-page application interacts exclusively with the backend Express API (`/api/*`). No `@supabase/supabase-js` client is bundled into the client runtime.
2. **Clean Production Script Bundle**: The production Vite build emits zero inline executable scripts (`<script>...</script>`). All JavaScript is served as modular bundles (`/assets/*.js`) with `type="module" crossorigin`.
3. **No Unsafe Execution Primitives**: The frontend codebase contains **zero** instances of `eval()`, `new Function()`, `WebWorker`, `Blob` URLs, or executable `dangerouslySetInnerHTML`. The only `dangerouslySetInnerHTML` instance is a non-executable Schema.org JSON-LD data block (`type="application/ld+json"`).
4. **Controlled External Origins**: External network and asset dependencies are strictly bounded to Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`), image CDNs (`images.unsplash.com`, `placehold.co`, `via.placeholder.com`, Supabase Storage), and Paymob checkout frames (`accept.paymob.com`).
5. **Inline Styles**: React JSX elements utilize inline `style={{ ... }}` objects across UI components, requiring either `style-src 'self' 'unsafe-inline'` or `style-src-attr 'unsafe-inline'`.

---

## 2. Current CSP / Security Header State

### 2.1 Express Server Helmet Configuration
Located in `server/index.js` (lines 77–82):
```javascript
app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: false,
  frameguard: { action: 'deny' },
  xContentTypeOptions: true,
}));
```

### 2.2 Analysis of Current Behavior
- **CSP Disabled**: `contentSecurityPolicy: false` explicitly disables CSP injection from the Express layer.
- **X-Frame-Options**: `frameguard: { action: 'deny' }` emits `X-Frame-Options: DENY` on API responses.
- **MIME Sniffing**: `xContentTypeOptions: true` emits `X-Content-Type-Options: nosniff`.
- **Frontend Hosting Header Gap**: No CSP headers or `<meta http-equiv="Content-Security-Policy">` tags currently exist in `index.html` or `vite.config.js`.

---

## 3. Actual Resource Origin Inventory

Every external domain in the application was traced from source code, static fixtures, API configurations, and build outputs:

| Resource Type | Origin / Domain | Purpose / Location in Code |
| :--- | :--- | :--- |
| **Frontend Root** | `'self'` | Vite build assets, HTML, SVGs, favicon |
| **Backend API** | `'self'`, `http://localhost:4000`, `http://127.0.0.1:4000`, `https://*.railway.app`, `https://api.techhaven.eg` | Express REST API endpoints (`src/lib/api.js`) |
| **Fonts (CSS)** | `https://fonts.googleapis.com` | Cairo, Inter, JetBrains Mono stylesheets (`index.html`, `src/index.css`) |
| **Fonts (Binaries)** | `https://fonts.gstatic.com` | `.woff2` font files downloaded by Google Fonts CSS |
| **Product Images** | `'self'` | Local product catalog images (`/images/*.jpg`, `store.json`) |
| **Favicon / Icons** | `data:` | Inline SVG favicon (`index.html` line 5) |
| **External Images** | `https://images.unsplash.com` | Product thumbnails & customer review avatars (`Home.jsx`, `PCBuilder.jsx`, `Orders.jsx`, `CartDrawer.jsx`) |
| **Placeholder Images** | `https://placehold.co`, `https://via.placeholder.com` | Fallback thumbnails when product images fail to load (`Compare.jsx`, `Checkout.jsx`, `Orders.jsx`) |
| **Supabase Storage** | `https://*.supabase.co`, `https://*.supabase.in` | Public buckets for user/product uploads when Supabase cloud storage is enabled |
| **Payment Gateway** | `https://accept.paymob.com` | Paymob payment iframe / redirect checkout (`server/routes/payments.js`, `Settings.jsx`) |
| **WhatsApp Links** | `https://wa.me` | Anchor tags (`<a href="https://wa.me/...">`) for B2B/support (governed by navigation, not CSP connect-src) |

---

## 4. Inline and Dynamic Execution Findings

| Pattern / API | Findings in Codebase | CSP Impact | Remediation / Assessment |
| :--- | :--- | :--- | :--- |
| **`eval()`** | **0 instances** | Supports `script-src` without `'unsafe-eval'` | No exceptions needed. |
| **`new Function()`** | **0 instances** | Supports strict script execution | No exceptions needed. |
| **Inline `<script>` (JS)** | **0 instances** | Supports `script-src 'self'` | Production Vite build creates zero inline JS. |
| **`dangerouslySetInnerHTML`** | **1 instance**: `src/pages/ProductDetail.jsx` (line 458) | Emits `<script type="application/ld+json">` | Valid SEO structured data. Not executable JS. Safe under standard CSP. |
| **Inline `style={{}}`** | **Heavily used** (>40 JSX files) | Requires `'unsafe-inline'` in `style-src` or `style-src-attr` | Necessary for dynamic React styling (e.g. progress bars, dynamic colors). |
| **Inline `<style>` tags** | **0 instances** in `src/` | Pure `.css` files and CSS Modules | No dynamic `<style>` injection detected. |
| **Web Workers** | **0 instances** | Supports `worker-src 'self'` | No workers spawned. |
| **`Blob:` / `data:` JS** | **0 instances** | Supports strict `script-src` | No dynamic script blobs. |
| **`<iframe>`** | **0 instances** in React DOM | `frame-src` bounded to Paymob | Paymob modal/iframe if embedded in checkout. |

---

## 5. Production Build Findings

Inspection of Vite output (`dist/` directory generated via `npm run build`):
- **Entrypoint**: `dist/index.html` contains:
  - `<script type="module" crossorigin src="/assets/index-*.js"></script>`
  - `<link rel="modulepreload" crossorigin href="/assets/vendor-*.js">`
  - `<link rel="stylesheet" crossorigin href="/assets/index-*.css">`
- **Code Splitting**: Rollup chunks cleanly separate `vendor-react`, `vendor-state`, `vendor-ui`, and `chunk-admin`.
- **No Injected Scripts**: Vite injects no inline scripts into the production HTML.
- **Source Maps**: Disabled in production (`sourcemap: false` in `vite.config.js`).

---

## 6. Supabase / API CSP Requirements

1. **Client Isolation**: The client browser communicates **strictly with the TechHaven API** (`API_BASE = import.meta.env.VITE_API_URL || '/api'`).
2. **Supabase Connectivity**: All Supabase database queries, authentication validations, and storage operations are executed server-side in Node.js (`server/lib/supabase.js`).
3. **Public Storage Images**: When products reference images stored in Supabase Storage, the browser downloads image files directly from `https://*.supabase.co`. Therefore, `img-src` must include `https://*.supabase.co https://*.supabase.in`.
4. **Connect Source**: `connect-src` only requires `'self'` and the configured backend API domain (e.g., Railway URL or custom API domain).

---

## 7. Recommended Production CSP

### 7.1 Strict Production Policy

```http
Content-Security-Policy: 
  default-src 'self';
  script-src 'self';
  style-src 'self' https://fonts.googleapis.com 'unsafe-inline';
  font-src 'self' https://fonts.gstatic.com data:;
  img-src 'self' data: https://images.unsplash.com https://placehold.co https://via.placeholder.com https://*.supabase.co https://*.supabase.in;
  connect-src 'self' https://*.railway.app https://api.techhaven.eg;
  frame-src 'self' https://accept.paymob.com;
  frame-ancestors 'none';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  manifest-src 'self';
  upgrade-insecure-requests;
```

### 7.2 Directive-by-Directive Breakdown

| Directive | Value | Security Justification |
| :--- | :--- | :--- |
| `default-src` | `'self'` | Restricts all unspecified directives to same-origin. |
| `script-src` | `'self'` | **Strict**: No `'unsafe-inline'`, no `'unsafe-eval'`. Blocks XSS script execution. |
| `style-src` | `'self' https://fonts.googleapis.com 'unsafe-inline'` | Permits local CSS bundles, Google Fonts CSS, and React inline styles. |
| `font-src` | `'self' https://fonts.gstatic.com data:` | Permits Google Fonts binary font downloads (`.woff2`). |
| `img-src` | `'self' data: https://images.unsplash.com https://placehold.co https://via.placeholder.com https://*.supabase.co https://*.supabase.in` | Permits local assets, SVG favicon, Unsplash catalog images, placeholders, and Supabase CDN. |
| `connect-src` | `'self' https://*.railway.app https://api.techhaven.eg` | Permits API fetch requests to backend endpoints. |
| `frame-src` | `'self' https://accept.paymob.com` | Permits Paymob checkout iframes. |
| `frame-ancestors` | `'none'` | Prevents UI redressing / clickjacking attacks. |
| `object-src` | `'none'` | Disables Flash, Java applets, and legacy plugin vectors. |
| `base-uri` | `'self'` | Prevents malicious `<base>` tag injection. |
| `form-action` | `'self'` | Prevents form submission redirection to external phishing endpoints. |
| `manifest-src` | `'self'` | Permits PWA manifest loading. |
| `upgrade-insecure-requests` | *(flag)* | Enforces HTTPS for all subresource requests in production. |

---

## 8. Development CSP Considerations

During local development with Vite (`npm run dev`), the local environment has different technical requirements:
- **Vite HMR**: Requires WebSocket connection to `ws://localhost:5173` and `ws://127.0.0.1:5173`.
- **React Fast Refresh / Source Maps**: Vite development builds may evaluate code chunks requiring `'unsafe-eval'` in `script-src`.
- **Local API Proxy**: Requests to `http://localhost:4000` and `http://127.0.0.1:4000`.

### Development Policy:
```http
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' https://fonts.googleapis.com 'unsafe-inline';
  font-src 'self' https://fonts.gstatic.com data:;
  img-src 'self' data: https://images.unsplash.com https://placehold.co https://via.placeholder.com https://*.supabase.co https://*.supabase.in;
  connect-src 'self' ws://localhost:5173 ws://127.0.0.1:5173 http://localhost:4000 http://127.0.0.1:4000;
  frame-src 'self' https://accept.paymob.com;
  object-src 'none';
  base-uri 'self';
```

---

## 9. Exceptions and Their Justification

1. **`'unsafe-inline'` in `style-src`**:
   - *Reason*: React uses dynamic inline styles (`style={{ color: ..., width: ... }}`) extensively across catalog filters, admin analytics charts, and responsive UI components.
   - *Security Risk*: Low. Unlike `script-src 'unsafe-inline'`, `style-src 'unsafe-inline'` cannot execute arbitrary JavaScript in modern browsers.
2. **`data:` in `img-src` & `font-src`**:
   - *Reason*: Favicon is defined inline as SVG `data:image/svg+xml,...` in `index.html`.
   - *Security Risk*: Negligible for image/font contexts.
3. **External CDNs in `img-src`**:
   - *Reason*: TechHaven catalog relies on curated hardware images hosted on Unsplash and placeholder services.

---

## 10. Report-Only → Enforcement Rollout

```
┌────────────────────────┐     ┌────────────────────────┐     ┌────────────────────────┐     ┌────────────────────────┐
│        PHASE A         │ ──> │        PHASE B         │ ──> │        PHASE C         │ ──> │        PHASE D         │
│ Report-Only Deployment │     │ Violation Triage & Log │     │  Code/Origin Fixing    │     │ Full CSP Enforcement   │
└────────────────────────┘     └────────────────────────┘     └────────────────────────┘     └────────────────────────┘
```

### Phase A: Report-Only Header (2 Weeks)
- Deploy header: `Content-Security-Policy-Report-Only: ...; report-uri /api/security/csp-reports; report-to csp-endpoint;`
- Implement lightweight `/api/security/csp-reports` endpoint in Express to log violations with user-agent and blocked-uri.

### Phase B: Analysis & Triage
- Measure violation volume per route.
- Classify browser extensions (e.g. adblockers injecting scripts) vs genuine application asset blocks.

### Phase C: Remediation
- Add missing legitimate CDN origins or refactor any offending inline attributes.

### Phase D: Enforcement
- Switch header from `Content-Security-Policy-Report-Only` to `Content-Security-Policy`.

---

## 11. Validation / Test Matrix

| Flow / Page | Expected Behavior | CSP Directive Involved | Verification Method |
| :--- | :--- | :--- | :--- |
| **Home Page** | Hero carousel, product grids, and fonts render cleanly | `img-src`, `font-src`, `style-src` | Browser console zero CSP errors |
| **Catalog & Filter** | Product list fetches and thumbnail images load | `connect-src`, `img-src` | Verify API JSON & image loading |
| **Product Detail** | JSON-LD schema renders without script execution blocking | `script-src`, `img-src` | Verify SEO schema in DOM inspector |
| **Auth (Login/Register)**| JWT issued, stored in localStorage, redirected | `connect-src` | Verify `/api/auth/login` network call |
| **Cart & Wishlist** | Cart drawer opens, items persist, badges update | `connect-src` | Verify `/api/cart` and `/api/wishlist` |
| **Checkout (COD/Card)** | Order submitted, Paymob config loaded | `connect-src`, `frame-src` | Verify order creation & payment options |
| **PC Builder** | Real-time compatibility checks & parts selection | `connect-src`, `img-src` | Verify `/api/pc-builder/validate` |
| **Admin Dashboard** | Lazy-loaded `chunk-admin` bundle executes | `script-src 'self'` | Verify chunk import on navigation |
| **B2B Quote** | Form submission & WhatsApp redirect | `connect-src`, navigation | Verify `/api/b2b/quote` |
| **Reviews Flow** | Review submission, deletion, and cache invalidation | `connect-src` | Verify `/api/reviews` |

---

## 12. Risks and Compatibility

1. **Vercel vs Railway Deployment**:
   - The frontend is hosted on Vercel (static files), while the backend is hosted on Railway.
   - CSP headers for page loads **must be configured in `vercel.json`** or `index.html` `<meta>` tag, while API security headers remain managed by Helmet in `server/index.js`.
2. **Third-Party CDN Downtime / URL Changes**:
   - If a new external image host is introduced by an admin entering arbitrary product image URLs, `img-src` would block the image unless the URL is from an allowed domain.
   - *Mitigation*: Supabase Storage bucket is the standard production destination for all uploaded product media.
3. **Paymob Hosted Checkout Redirect vs Embedded Iframe**:
   - In live mode, Paymob provides both iframe and redirect URLs. The CSP `frame-src https://accept.paymob.com` ensures compatibility with both models.

---

## 13. Implementation Prerequisites

Prior to moving to implementation (P2-SEC-01 implementation phase):
1. Create `vercel.json` to define production HTTP headers for Vercel edge deployment.
2. Update `server/index.js` Helmet configuration to synchronize API headers.
3. Create `/api/security/csp-reports` endpoint for violation ingestion.
4. Add automated CSP header assertion tests in `scratch/test_csp_headers.mjs`.

---

## 14. Explicit Non-Goals

- Refactoring React inline `style={{}}` attributes to CSS modules (out of scope; allowed via `style-src 'unsafe-inline'`).
- Implementing nonce generation middleware on static HTML served by static CDN/Vercel (static Vercel hosting does not have dynamic SSR per-request nonce injection; `'self'` is optimal and secure).
- Altering production database or store schemas.

---

## 15. Final Design Decision

**Decision:** The TechHaven architecture is fully compatible with a strict, modern Content Security Policy. The policy can safely eliminate `'unsafe-eval'` and `'unsafe-inline'` from `script-src` in production.

**P2-SEC-01 CSP DESIGN = COMPLETE**
