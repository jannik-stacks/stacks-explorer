# Task ID: 1 — Replace stacks.js with Stacks Kit

## Problem Statement
Replace stacks.js dependencies with `@jannik-stacks/kit`, preserving today's behavior with test vectors recorded against the installed stacks.js version before migration. Retain packages only where Kit has no replacement and explain each exception in the PR. The issue supplies no specific input, error, or UI text.

## Components Involved
Clarity encoding/decoding and display; sandbox and transaction contract forms; post-condition validation and serialization; BNS/NFT decoding; staking reward reads; network constants; wallet integration; fee estimation types; package manifest and lockfile.

## Dependencies
Kit 0.1.0; existing Jest suites; pnpm. Kit's wallet picker itself requires `@stacks/connect`. Kit omits legacy `/extended/v1` API routes and public generated API types, token metadata clients/types, and lint/format configurations.

## Implementation Checklist
- [x] Inventory stacks.js imports and trace affected consumers.
- [x] Extend existing tests with fixed wire/display/parameter vectors and run against stacks.js.
- [x] Switch supported operations to Kit, preserving test vectors.
- [x] Remove replaced and unused direct packages; document exceptions.
- [x] Run affected tests, full unit tests, lint, and production build.
- [x] Check diff against requirements and read `/news/news.md`.

## Verification Steps
Run existing Clarity parsing, function result, post-condition, network, and staking suites before and after migration. Run `CI=1 pnpm run test:unit`, `pnpm lint`, and `pnpm build`. Inspect remaining stacks dependencies and imports.

## Decision Authority
Implementor: implementation and compatibility choices. Human: merge. Engine: commit, push, and PR creation.

## Questions/Uncertainties
Blocking: none.
Non-blocking: Kit is ESM-only and uses different presentation conventions; preserve Explorer display conventions and Jest compatibility. Existing wallet and Leather dependencies may retain transitive stacks.js packages.

## Acceptable Tradeoffs
Keep packages with no Kit equivalent. Preserve existing form and display contracts with focused compatibility utilities where Kit lacks equivalent presentation functions.

## Status
Completed

## Notes
No unrelated wallet behavior or UI changes. Baseline vectors must remain unchanged after migration (dependency import paths may change). No test should be required to fail against the old dependency: this issue explicitly requires characterization tests that pass before switching; migration failures establish compatibility gaps.

Baseline: 153 tests in six suites passed with stacks.js after adding 68 fixed wire, display, JSON, ABI, and post-condition vectors. The same tests passed with Kit. Initial migration failed because Jest could not resolve Kit's import-only ESM entry; mapping its published entry and transpiling its ESM dependencies resolved that failure.

Retained packages: `@stacks/connect` provides persisted wallet sessions and the picker that Kit itself uses as an optional peer; `@stacks/blockchain-api-client` covers legacy endpoints missing from Kit; `@stacks/stacks-blockchain-api-types` supplies named generated API types absent from Kit's exports; `@stacks/token-metadata-api-client` has no Kit metadata counterpart; `@stacks/eslint-config` and `@stacks/prettier-config` have no Kit tooling counterparts. Wallet, Leather fee estimation, and BNS dependencies still require stacks.js transitively; their existing transaction version override remains.

Kit's raw HTTP client was evaluated but not adopted: type checking showed it omits dozens of legacy endpoints, including `/extended/v1/tx/`. Existing API clients are unchanged.

Final verification:
- Affected suites: 9 passed, 209 tests passed.
- Exact engine command `CI=1 pnpm run test:unit`: 119 suites passed; 1,395 tests passed, 2 skipped; 5 snapshots passed.
- `pnpm lint`: passed, with six existing hook warnings.
- `pnpm exec tsc --noEmit --incremental false`: passed after Chakra type generation.
- `pnpm build`: passed compilation, type checking, static generation, and build tracing using `NODE_OPTIONS=--max-old-space-size=4096` and local Next font responses in /scratch. The normal attempt could not fetch Google Fonts in this sandbox; the first local-font retry exhausted Node's default 2 GB heap. No build workaround was added to the repo.
- Earlier concurrent verification hit an existing staking pagination test timeout; the final full suite passed without a concurrent build. No unrelated test changes were made.
- Diff checked against the issue: baseline assertions unchanged after migration; no supported stacks.js direct dependencies remain; retained packages explained above; no unrelated UI or wallet changes.
- Read /news/news.md before finishing: nothing new.

Unrelated observation for PR: `useUser.connectWallet` still throws `No STX address found in response` after it finds and stores an STX address. Left unchanged.
