# Security and local runtime follow-up — 29 October 2026

## Kokkuvõte

Kõik kolm eelmises auditietapis alles jäänud turvahoiatust on kõrvaldatud: `pnpm audit --json` tagastab null leidu ja lõppkoodi 0. Kohaliku eelvaate ühendusekatkestus on taasesitatud ning parandatud. Pikem kontroll läbis 53 päringut ilma tõrketa, sealhulgas 30 päringut täpselt viiesekundilise intervalliga. Kõik 135 automaattesti läbivad. Autentimist ega mudelikõnede korduskatseid ei muudetud.

Töö on kohalikul harul `audit/desktop-2026-10-29`, koos esimese etapi parandustega. Avaldamist, kaug-repositooriumi muutmist, ligipääsude muutmist ega tasulisi mudelikõnesid ei tehtud. See dokument asendab [esimese auditi](DESKTOP-AUDIT-2026-10-29.md) kolme allesjäänud hoiatuse ja kohaliku proksi piirangu kirjeldused.

## Dependency corrections

| Finding | Final correction | Compatibility evidence |
| --- | --- | --- |
| esbuild 0.18.20 under Drizzle's abandoned esm-loader | Remove only `drizzle-kit@0.31.10>@esbuild-kit/esm-loader` through the documented pnpm `-` override. The published Drizzle bundle does not import it and already uses tsx. No audit entry is ignored. | Generate a real SQLite migration from a temporary TypeScript schema/config; verify the resulting `CREATE TABLE` statement. The existing empty application database schema is unchanged; no database is connected or migrated. |
| Zod 3.25.76 under the React hooks lint plugin | Resolve the plugin's Zod dependency to 4.6.6 and zod-validation-error to 4.0.2. Both satisfy the installed plugin 7.1.1's published dependency ranges and its v4 imports. | Actually run ESLint on a valid component, a conditional hook and an invalid ref read. Valid code passes and both invalid cases produce the expected rules. This verifies the compiler integration rather than merely loading a package. |
| Satori 0.16.0 bundled into @vercel/og | Update Vinext's OG dependency to @vercel/og 1.0.3, which includes Satori 0.33.5 and Resvg 2.4.1. Vinext itself remains 1.0.0-beta.5. | Render an actual PNG through Vinext's ImageResponse wrapper, including ET/FR/DE glyphs; validate PNG signature and dimensions. A crafted color containing SVG markup is escaped instead of inserting a script element. |

The new OG Node bundle exposed a packaging defect during the compatibility test: bundled HarfBuzz tried a dynamic CommonJS `fs` import from ESM and could not resolve its sibling WASM. The version-specific `patches/@vercel__og@1.0.3.patch` delegates HarfBuzz initialization to its published CommonJS package through the existing Satori dependency. Its native `__dirname` and bundled `hb.wasm` then resolve correctly. The SVG security fix is retained; no global `require` shim or validation exception is introduced. This patch affects the Node entrypoint only. It does not add an OG route to the application or claim full Cloudflare OG feature acceptance.

Cloudflare tools are updated together: Vite plugin 1.64.0, Wrangler 4.151.1, Workers types 5.20261006.1 and the matching Miniflare 5.20261012.1-beta / workerd 1.20261012.1 runtime. Versions were checked against registry metadata and are older than the existing seven-day minimum release age. The latest one-day-old releases were not selected. Release-age, lockfile verification and build-script policies remain enabled. The pnpm lockfile records both patches and their hashes; a frozen install passed.

## Reproduced proxy failure and fix

Cloudflare documents a [five-second keep-alive race](https://github.com/cloudflare/workers-sdk/issues/14641) in the local proxy chain. An old pooled connection can be reused just as KJ closes it. A separate [origin-comparison correction](https://github.com/cloudflare/workers-sdk/pull/14593) fixes misleading error classification but does not prevent every request drop.

The original Wrangler 4.92.0 failed one of 34 test requests in this workspace. Updating Wrangler alone still failed two of 34. Setting `Connection: close` inside the Worker proxy did not fully fix the client-facing socket: the longer run still failed three of 52 requests. The Worker response header did not reliably reach the client, so that incomplete approach was not treated as a successful fix.

The final local transport has two parts:

1. `patches/wrangler@4.151.1.patch` asks the proxy's internal fetch to close ordinary HTTP connections and preserves WebSocket upgrades. Existing upstream GET/HEAD behavior remains intact; no POST retry is added.
2. `lib/local-worker-proxy.mjs` places a small Node HTTP transport in front of the private Wrangler listener. Node controls the client-facing `Connection: close`; each request to Wrangler uses `agent: false` and a fresh connection. Bodies stream without parsing or rewriting. Host, Origin, authentication headers, response codes, headers and streams are preserved. HTTP upgrades tunnel bidirectionally. A failed upstream connection returns a bounded local error once; it does not replay a request.

`scripts/run-local-worker.mjs` launches Wrangler's supported CLI entrypoint and the local transport. The public browser address defaults to `http://127.0.0.1:8787`, preserving a stable origin for browser-local work. The private Worker gets an ephemeral port. `--port <number>` selects the browser port; `--port 0` is available for isolated tests. Registry paths are unique per process by default and separate from Vite's development registry. Explicit runtime paths supplied by the caller remain respected. Both listeners bind to loopback. The child runtime and transport stop together.

The old workerd native abort on port 5174 becomes a clear unavailable-address error with the updated toolchain. The normal preview no longer needs the private Worker to bind that fixed port. A requested browser port is handled by Node, which reports the listening error explicitly; the normal browser port is not silently changed because that would hide browser-local saved work under another origin.

## Validation

Environment remains native Windows / PowerShell, Node v24.19.0, pnpm 11.25.0, portable profile. Changes are based on the same initial commit `198f90931c7b92cc787609f46c1cb98751c28cb2`; no user edits were reset.

| Check | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | Passed with both checked-in patch files. |
| `pnpm audit --json` | Exit 0; zero info/low/moderate/high/critical findings. |
| `pnpm test` | 135 passed, 0 failed, 0 skipped. |
| `pnpm typecheck` | Passed. |
| `pnpm build` + `pnpm check:secrets` | Passed with the updated Cloudflare tools and dependency patches; 131 built files scanned. |
| `git diff --check` | Passed. |
| Full compiled application through the local transport | Browser loaded and hydrated the workspace, assets and SVG. Unauthenticated Generate returned the expected sign-in error and preserved the current process. No browser warning/error was captured in that smoke check. |
| Local proxy behavior tests | Body/Unicode/Host/Origin/identity/status preservation; both HTTP hops close; dropped upstream returns one error without a second POST; WebSocket upgrade and bidirectional bytes pass. |
| Boundary/cadence integration test | 53/53 responses matched expected JSON and status, including 30 at aligned 5,000 ms intervals. Includes anonymous 401, cross-origin 403, invalid input 400 and missing-key 503. No retry was used by the test to hide a failure. |
| Final compiled preview at the default browser port | Started at `http://127.0.0.1:8787`, browser workspace hydrated, and another 25/25 HTTP probes passed. Explicit port 5174 produced a clear `EADDRINUSE` diagnostic and a nonzero exit, without a native runtime abort. |

The reusable command is `pnpm check:runtime <printed-local-url>`. It accepts only HTTP loopback addresses. It first confirms configuration through the authenticated local test boundary; a valid synthetic description is sent only if no key is bound. If a key is configured, the cadence test uses invalid input that fails before any provider call. `RUNTIME_CHECK_SAMPLES=30` extends the default 12 cadence samples. Synthetic identity headers emulate the platform boundary only in this local check; they are not a replacement for hosted authentication.

Ignored local evidence: `.sites-runtime/dependency-audit-final.json`, `tests-security-followup.log`, `build-security-followup.log`, `runtime-before-check.log`, `runtime-updated-check.log`, `runtime-patched-check.log` (the unsuccessful header-only experiment), `runtime-fixed-check.log` (53 requests, zero failures), `runtime-final-check.log` (25/25), and `runtime-port-diagnostic.log`. These logs contain synthetic test data rather than real customer inputs or credentials.

## Maintenance and limits

Both dependency patches are explicit, version-scoped and covered by behavioral checks. Review and remove them when upstream fixes are available; updating Wrangler or OG must re-run the runtime/compatibility checks. The local transport adds a loopback hop and closes ordinary HTTP sockets, trading local connection reuse for predictable behavior. Long-running response bodies stream normally and WebSocket upgrades remain supported. Hosted Worker code and production access policy do not use this transport or the Wrangler preview patch.

A clean live Vite run and local compiled preview remain different modes. Compile before starting the compiled preview; avoid rewriting its build directory while it is running. The prior audit's real-model quality, business acceptance, unusual source-file and maximum-size diagram checks remain separate work. This follow-up establishes the tested security dependency state and fixes the reproduced local transport fault; it is not a claim that every future runtime or network failure is impossible.

Relevant primary references: [pnpm removal overrides](https://pnpm.io/settings/dependency-resolution#overrides), [React lint plugin dependency ranges](https://github.com/react/react/blob/main/packages/eslint-plugin-react-hooks/package.json), [Drizzle loader issue](https://github.com/drizzle-team/drizzle-orm/issues/5481), and [Satori SVG escaping advisory](https://github.com/advisories/GHSA-wx4j-mvgx-mqwp).
