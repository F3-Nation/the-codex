# Critical Security and Code Review

This document captures the most important security and code quality issues identified in the current codebase, with concrete fixes and file references.

## Critical (fix immediately)

- **Token storage in localStorage (XSS → account takeover)**
  - Risk: Storing OAuth `access_token` and `refresh_token` in `localStorage` allows any XSS to steal tokens and compromise accounts.
  - Code refs:
    - `src/app/callback/page.tsx` lines 101–104 (token set in localStorage)
  - Fix:
    - Do not persist tokens in the browser. Instead, complete the OAuth callback on the server and set a signed, HTTP-only, `Secure` cookie (short-lived) to represent the session. The client should only store minimal display info, not tokens.
    - Create or extend a same-origin endpoint to set/refresh the session cookie after token exchange.

- **Admin actions lack authorization**
  - Risk: All server actions under `src/app/admin/actions.ts` call DB operations without verifying authentication or role; any client can invoke them.
  - Code refs:
    - `src/app/admin/actions.ts` (all exported actions)
    - `src/app/admin/page.tsx` (client page not gated)
  - Fix:
    - Add a server-side guard (e.g., `requireAdmin()`) called at the top of every admin action to enforce authenticated `role === 'admin'`.
    - Protect the `/admin` route via middleware that validates the same server-side session and redirects if unauthorized.

- **SQL injection risk in bulk insert string concatenation**
  - Risk: Building `VALUES ('${entryId}', '${tag.id}')` strings for `entry_tags` can be exploited if IDs are not strictly controlled.
  - Code refs:
    - `src/lib/api.ts` lines ~533–535, ~884–892
  - Fix:
    - Use parameterized multi-row insert:
      ```ts
      const placeholders = tagIds.map((_, i) => `($1, $${i + 2})`).join(',');
      await client.query(
        `INSERT INTO entry_tags (entry_id, tag_id)
         VALUES ${placeholders}
         ON CONFLICT (entry_id, tag_id) DO NOTHING`,
        [entryId, ...tagIds]
      );
      ```
    - Or use `UNNEST($2::text[])` to insert from an array.

- **XSS via unsafe HTML rendering**
  - Risk: Rendering arbitrary HTML with `dangerouslySetInnerHTML` without sanitization.
  - Code refs:
    - `src/components/shared/AILinkedText.tsx` line ~27
  - Fix:
    - Remove the component if unused, or sanitize HTML server-side (e.g., DOMPurify with SSR) before rendering. Prefer rendering React nodes over raw HTML where possible.

- **Info leakage in UI on error**
  - Risk: The Exicon page renders environment diagnostics (e.g., `DATABASE_URL` indicators) to end users on failure.
  - Code refs:
    - `src/app/exicon/page.tsx` lines ~137–142 (and related console logs)
  - Fix:
    - Remove env details from UI; log only on the server. Show a generic error to users.

## High

- **Public debug API exposes env hints**
  - Risk: `/api/debug` reveals deployment environment details that aid attackers.
  - Code refs:
    - `src/app/api/debug/route.ts`
  - Fix:
    - Disable entirely in production (return 404) or require admin authorization.

- **HTML attribute injection risk in mention utils**
  - Risk: Only quotes are escaped for `data-entry-description`; other dangerous characters aren’t.
  - Code refs:
    - `src/lib/utils.ts` around attribute construction of `data-entry-description`
  - Fix:
    - Fully escape `&`, `<`, `>`, `"`, and `'` for all attribute values, or avoid string-built HTML; use React nodes instead.

- **CORS/origin mismatch**
  - Risk: Inconsistent dev origin across middleware and headers may cause misconfiguration or accidental permissiveness.
  - Code refs:
    - `middleware.ts` (dev fallback `'https://localhost:3000'`)
    - `next.config.ts` headers (dev `'https://localhost:3001'`)
  - Fix:
    - Unify and drive allowed origin from a single env variable for dev/prod.

- **Production DB SSL config too permissive**
  - Risk: `rejectUnauthorized: false` disables TLS verification.
  - Code refs:
    - `src/lib/db.ts` line ~29
  - Fix:
    - Provide CA bundle and enforce verification (e.g., `ssl: { ca: process.env.PG_CA, rejectUnauthorized: true }`) or use managed service defaults.

## Medium

- **Missing Content Security Policy (CSP)**
  - Risk: Increases impact of any future XSS.
  - Fix:
    - Add a CSP header (e.g., via `next.config.ts` `headers()` or middleware). Prefer nonces or hashes for any inline scripts.

- **Chart CSS injection surface**
  - Risk: `dangerouslySetInnerHTML` used to inject CSS variables. Today it’s config-controlled; ensure it never sources user input.
  - Code refs:
    - `src/components/ui/chart.tsx`
  - Fix:
    - Validate/whitelist color inputs and keep config server-controlled.

- **Firebase Admin key env var mismatch**
  - Risk: Misconfiguration can lead to runtime errors.
  - Code refs:
    - `src/lib/firebaseAdmin.ts` expects `MY_APP_FIREBASE_ADMIN_KEY`
    - `apphosting.yaml` defines `FIREBASE_ADMIN_SDK_KEY`
  - Fix:
    - Align variable names and update usage accordingly.

## Minor

- **Excessive env logging**
  - Risk: Noisy logs and potential leakage in aggregated logs.
  - Code refs:
    - `src/lib/db.ts` lines ~9–15
  - Fix:
    - Restrict to development (`if (process.env.NODE_ENV !== 'production') ...`).

- **External links**
  - Status: `rel="noopener noreferrer"` is already used with `target="_blank"` where present.

## Recommended edits (summary)

- Replace client-side token storage with server-managed HTTP-only session cookies; remove `localStorage` usage in `src/app/callback/page.tsx`.
- Add server-side `requireAdmin()` checks in all `src/app/admin/actions.ts` functions and gate `/admin` via middleware.
- Parameterize all bulk inserts in `src/lib/api.ts` (`entry_tags`), removing string-built `VALUES` clauses.
- Remove UI environment diagnostics from `src/app/exicon/page.tsx` error fallback.
- Restrict or remove `src/app/api/debug/route.ts` in production.
- Sanitize or remove `src/components/shared/AILinkedText.tsx` and avoid raw HTML generation in utils.
- Unify CORS origins and improve DB SSL configuration.
- Add a CSP and validate any injected CSS configs.

## Notes

- Many of these fixes are small and localized (parameterization, guards, and config). The highest-risk items are token handling, missing admin authorization, and unsafe SQL string construction. 