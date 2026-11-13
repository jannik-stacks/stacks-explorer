# Task 6: Remove obsolete dependencies and audit exceptions

## Task ID
#6, part 3/3 of #3; stacks on #5. Branch agentgraph/6; base agentgraph/5.

## Problem Statement
The app already uses Kit, but obsolete direct SDK/Leather declarations and ESLint dependency ownership remain. Finish dependency pruning without changing captured behavior or formatting policy.

## Components Involved
Root package.json and pnpm-lock.yaml, ESLint dependency ownership, Jest migration leftovers, final dependency inventory under docs/.

## Dependencies
Part-2 app migration and part-1 behavior vectors must pass before removal. Retain Connect, Explorer API/metadata clients and schemas, BNS resolution, and the Prettier policy exception.

## Implementation Checklist
- [x] Inventory requirements, exact examples and dependency/import ownership.
- [x] Run existing part-1 behavior vectors before pruning.
- [x] Remove unused SDK/Leather/eslint-config declarations and obsolete migration leftovers; explicitly own configured parser/plugins.
- [x] Review transactions override and document retained paths/versions.
- [x] Record pnpm why for every remaining @stacks/* package and audit source/tests/config/manifest/lockfile.
- [x] Verify clean frozen install, focused vectors, lint, full unit suite, standalone type checks and build; rerun e2e and record the maintainer-approved browser exception.
- [x] Review final diff against requirements, read news, complete workplan and propose one PR.

## Verification Steps
Run existing behavior suites before and after removal; no dependency-audit test exists to extend and no issue-specific failing input is supplied, so do not introduce a new test category. Run clean pnpm install --frozen-lockfile with lifecycle scripts enabled, pnpm lint, CI=1 pnpm run test:unit, pnpm build, and pnpm test:e2e. Record actual results and environment limitations.

## Decision Authority
Implementor makes minimal dependency/documentation changes; reviewer may return once; human merges. Engine commits/pushes/opens PR.

## Questions/Uncertainties
No implementation blockers. Browser coverage is unavailable because the sandbox has no browser/display and downloads return HTTP 403. On 2026-11-13, the maintainer explicitly authorized opening the PR with this limitation and a manual page checklist; unit tests, type checks and build must still pass. Font transport uses the invocation-only workaround from part 2.

## Acceptable Tradeoffs
Keep transitive SDKs only for retained functionality without a Kit replacement. Preserve the transactions pin if retained integrations require its existing resolution. Keep formatting policy unchanged; no frozen-test changes or unrelated formatting.

## Status
Completed — clean lifecycle-enabled frozen install passed; browser smoke coverage remains unavailable under the explicit maintainer-approved exception.

## Notes

### Requirements and exact inputs/text
1. Remove unused direct @stacks/auth, common, network, transactions, connect-ui and all unused Leather declarations after part-1 vectors pass.
2. Remove unused @stacks/eslint-config; explicitly declare configured parser/plugins; retain @stacks/prettier-config as tooling with no Kit replacement.
3. Keep justified @stacks/connect, blockchain-api-client, token-metadata-api-client and stacks-blockchain-api-types. Review the transactions override; remove only if unnecessary, otherwise document Connect/BNS constraints without changing their versions.
4. Inventory every remaining @stacks/* package using pnpm why, including actual Connect/BNS dependency paths, common/network/transactions versions, profile and connect-ui. Audit source, tests, configuration, manifest, overrides and lockfile; historical provenance/changelog may remain.
5. Prove clean frozen install, part-1 behavior vectors, lint, unit, build and existing Explorer smoke e2e; record results and confirm the exception list satisfies #3.
6. No adapters/legacy API reconstruction, refactors, new dependencies except required lint ownership, formatting migration, frozen-test edits, vendored artifacts or extra manifest. Keep scope below about 120 files, each below 1 MiB. One PR from agentgraph/6 into agentgraph/5.
7. The issue supplies no exact failing runtime input, error or UI text. Existing vector inputs and expected bytes/outputs remain unchanged; no new regression test is applicable to manifest pruning.

### Ownership traced
Part-2 ownership/callers are recorded in docs/workplans/5-Migrate-Explorer-to-Kit.md. Full-tree import audit confirms no obsolete SDK/Leather imports in source/tests/config. Retained Connect serves useUser and sandbox wallet/deploy/transfer/call paths; API clients serve REST/WebSocket and metadata consumers; API types serve Explorer schemas. useSearchQuery calls bns-v2-sdk.getNameInfo. Existing supported deep imports are Connect types and generated API schemas, not legacy primitive APIs. No obsolete adapter or fixture generator is present.

### Verification evidence

- Before pruning: 11 existing focused behavior suites passed, 244 tests and 99 snapshots (Clarity parsing/display, ABI forms, wallet requests/post conditions, read-only/BNS, staking, networks, addresses and fees). No vectors or frozen tests were edited. No dependency-manifest regression test exists to extend.
- Initial scripts-disabled diagnostic: `CI=1 pnpm install --frozen-lockfile --ignore-scripts` exited 0 (1,638 packages). This alone did not verify the required default installation; the lifecycle-enabled clean install recorded in the review follow-up below supersedes it. No dependencies/build artifacts are committed.
- `pnpm lint` exited 0: six existing React hook warnings, zero errors, Prettier passed.
- `CI=1 pnpm run test:unit` exited 0: 123 suites, 1,454 passed / 2 skipped tests, all 104 snapshots passed.
- Generated the complete `pnpm why` inventory and checked alias resolution; see docs/migrations/stacks-kit-dependencies.md. Removing the transactions override changed no retained Stacks versions.
- Plain `pnpm build` (with one-worker/heap limits) failed solely fetching Inter and Instrument Sans from Google Fonts, as in part 2. The local-only font response uses existing Matter bytes; no font setting or asset is changed.
- Production build exited 0 with `CIRCLE_NODE_TOTAL=2 NODE_OPTIONS=--max-old-space-size=2816 NEXT_FONT_GOOGLE_MOCKED_RESPONSES=/scratch/6-google-fonts.cjs pnpm build`: compiled successfully, TypeScript passed, generated all 21 static pages and completed build tracing. Output is under /scratch through an ignored .next link.
- `pnpm test:e2e --workers=1 --max-failures=1 --output=/scratch/6-e2e-results` reran the existing 23-test Explorer suite with the documented network environment and local font response. It failed before navigation: `browserType.launch: Executable doesn't exist at /scratch/6-browsers/chromium-1234/chrome-linux/chrome`; 22 tests did not run. `pnpm exec playwright install chromium` attempted every mirror and failed with HTTP 403. The headed config also requires a display. Browser/desktop/mobile smoke coverage is unverified, not passed; a runner with Chromium and a display is required. No application failure was reached.
- Final self-review: five changed files; largest is pnpm-lock.yaml (598,222 bytes). Only declarations, lockfile pruning, obsolete Jest transforms and required documentation changed. No source, frozen tests, snapshots, vectors, formatting policy or retained Stacks versions changed. All 15 remaining Stacks package versions are covered by pnpm why and documented reasons/paths. The exception list meets #3's stated policy, including the explicit formatting-tool exception.


### Maintainer-approved browser verification exception (2026-11-13)

The maintainer authorized opening the PR with browser smoke checks explicitly unavailable and manual review pages listed. Browser tests did not reach application navigation; do not describe them as passing. No browser is installed, and Playwright mirrors return HTTP 403. Unit tests, standalone type checks and the production build remain mandatory.

Manual reviewer checklist (desktop and mobile; mainnet/testnet where supported):

- `/`: recent transactions, Pending tab and recent blocks.
- `/transactions`: open filters and toggle each transaction type.
- `/blocks` and `/block/<hash>`: lists and block transaction details.
- `/address/<principal>`: populated and empty addresses; balances and transaction lists.
- `/txid/<txid-or-contract>`: coinbase, transfer, contract call and deployed contract; arguments, results and post conditions. Use the existing e2e vector files for principal/hash/transaction examples.
- `/sandbox/contract-call`, `/sandbox/transfer` and `/sandbox/deploy`: wallet connect/disconnect and request forms; inspect requests without submitting transactions.
- `/tokens` and `/token/<tokenId>`: token metadata and balances; use BNS search to check retained resolution.

### Final verification for the authorized PR (2026-11-13)

- `pnpm lint`: exit 0; six existing hook warnings, Prettier passed.
- `CI=1 pnpm run test:unit`: exit 0; 123 suites, 1,454 passed / 2 skipped tests, all 104 snapshots passed.
- `CIRCLE_NODE_TOTAL=2 NODE_OPTIONS=--max-old-space-size=2816 NEXT_FONT_GOOGLE_MOCKED_RESPONSES=/scratch/6-google-fonts.cjs pnpm build`: exit 0, including TypeScript, all 21 static pages and standalone tracing. No source/font configuration changed.
- `NODE_OPTIONS=--max-old-space-size=2816 pnpm typecheck`: exit 0 (`tsc --noEmit`).
- Current `pnpm why` output still covers all 15 documented Stacks package versions. `git diff --check` passed; final scope is five files, each below 1 MiB. Source, tests and captured vectors remain unchanged.
- The lifecycle-enabled clean frozen install recorded below and documented unsuccessful browser-smoke attempts are the installation/e2e evidence. The maintainer-approved PR explicitly discloses that the sandbox has no browser and provides the manual page checklist above.
- Read /news/news.md before finalizing; no additional updates. Propose one PR from agentgraph/6 into agentgraph/5; human merges.

### Review follow-up: lifecycle-enabled clean installation

The review correctly identified that the earlier `--ignore-scripts` install does not establish the required default frozen installation. Run `pnpm install --frozen-lockfile` in an empty installation directory with the root manifest, lockfile, repository npm configuration and Git context; verify lifecycle execution and record the actual result in both documents. The browser exception does not waive installation checks. No new test category or frozen-test changes are needed for this verification.

Review verification: created `/scratch/6-clean-scripts` with no node_modules, copied the unchanged root package.json, pnpm-lock.yaml, .npmrc and .husky, and initialized a fresh Git repository so Husky could configure hooks. With ignore-scripts unset (config lookup returned `undefined`, no suppression environment variables), ran `CI=1 pnpm --dir /scratch/6-clean-scripts install --frozen-lockfile`. It exited 0 in 26.1 seconds under pnpm 10.33.0, installing 1,638 packages. `prepare` executed `husky install`, generated the hook shims and configured `core.hooksPath = .husky/_`. The existing Husky deprecation warning is non-fatal. Inspection of the installed pnpm CLI confirms it intentionally skips the exact `npx only-allow pnpm` preinstall guard; lifecycle execution was enabled.

pnpm reported its default unapproved dependency-build warning for @sentry/cli@2.58.6, @sentry/node-cpu-profiler@2.4.3, core-js-pure@3.50.0, core-js@3.50.0, esbuild@0.25.12 and unrs-resolver@1.12.2. No build approval policy was changed, and no ignore-scripts flag or override was used. `cmp` confirmed the installed manifest/lockfile are byte-identical to the reviewed files. No installation failure or code/dependency correction was needed. Both documents now record the actual default frozen-install result; the browser exception does not waive any install check.

Only verification documentation changed for this review follow-up; previous lint/unit/typecheck/build evidence remains applicable. `git diff --check` passed, and /news/news.md was read before finalizing.
