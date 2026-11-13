# Task 4: Pin Explorer behavior before Stacks Kit migration

## Task ID
4 (part of #3; independent of #1)

## Problem Statement
Capture deterministic behavior vectors against installed stacks.js without changing production behavior or adding Kit.

## Components Involved
Function-called formatting; sandbox parsing, ABI forms and wallet requests; post conditions; BNS/read-only queries; staking reads; fee estimates; network URLs and chain IDs.

## Dependencies
Installed @stacks/transactions 7.6.0, @stacks/common 7.0.2, @stacks/network 7.0.2. No dependency changes.

## Implementation Checklist
- [x] Replace runtime SDK imports/mocks in all eight named tests with captured literals.
- [x] Pin integers (signed/unsigned boundaries), booleans, strings, buffers, principals, nested containers, prefixed/bare hex, malformed inputs, success detection and contract logs.
- [x] Pin ABI coercion/validation, STX/FT/NFT/staking/PoX bytes and modes.
- [x] Pin BNS bytes, read-only bodies, staking arguments/results, wallet serialization/defaults/rejections.
- [x] Pin three fee payloads, lengths, parsing/defaults/clamps/rounding/averages on mainnet/testnet/devnet; custom URLs and chain IDs.
- [x] Record fixture provenance and the behavior contract; retain API/WebSocket regression coverage.
- [x] Run focused tests, lint, all unit tests, build; inspect scope and file sizes.

## Verification Steps
Run the existing tests with SDK mocks removed to expose assertions based on fabricated SDK output. Capture expected values by executing repository functions against installed dependencies, then assert literal outputs offline. Run pnpm lint, pnpm test:unit, pnpm build. No live services or wallets.

## Decision Authority
Implementor chooses fixture organization; human merges. Production behavior and dependencies remain unchanged.

## Questions/Uncertainties
Blocking: none. Non-blocking: existing mocked expectations may differ from actual SDK output; preserve actual behavior in each scenario.

## Acceptable Tradeoffs
Literal SDK-shaped inputs are acceptable; no runtime SDK oracle in vector expectations. Mock only transport/wallet boundaries. Approximately 20–30 files, fewer than 120; each below 1 MiB.

## Status
Completed

## Notes
Issue supplies categories rather than one concrete failing input/error. The initial reproduction removes SDK decoding mocks in the existing function-called test. Root package.json and pnpm-lock.yaml must remain unchanged. Capturing vectors is development-only; capture scripts stay in /scratch.

### Requirement inventory and ownership

The issue provides no single error message or executable failing example. Its exact targets are the eight named test files; all eight remain present. Requirements are:

1. Capture current stacks.js; do not add Kit or change production code, package.json or pnpm-lock.yaml.
2. Replace generated inputs and SDK mocks in function-called-utils, function-call-post-condition-utils, prettyFunctionResult, PostConditionForm, parseHexClarityValue, reward-estimate, buildUrl and post-condition-mode-utils tests; preserve failures.
3. Pin signed/unsigned boundaries, bool, ASCII/UTF-8, buffers, standard/contract principals, nested tuples/lists/options/responses, bare/prefixed hex, malformed inputs, result success and contract logs.
4. Pin ABI coercion and validation, STX/FT/NFT/staking/PoX post-condition bytes and allow/deny/originator modes, BNS argument bytes, read-only bodies, staking arguments/results and wallet defaults/serialization/rejection handling.
5. Pin all three fee payloads and lengths, response parsing/defaults/clamps/rounding/averages on mainnet/testnet/devnet, custom URLs and chain IDs.
6. Retain API/WebSocket regression tests; preserve dependency-independent behavior vectors and provenance; keep files below 1 MiB and scope near 20–30 files, below about 120.
7. Pass lint, all unit tests and build; record evidence and finish the workplan. One PR on agentgraph/4 targeting main, independent of #1.

Ownership/call paths inspected:

- FunctionCalled renders prettyFunctionResult; legacy formatting helpers consume API result hex/repr. Contract log examples flow through the same Clarity formatting. FunctionCallForm uses function-call-function-params-utils for initial values, validation, tuple/list/optional/memo coercion and public calls.
- Sandbox FunctionView duplicates ABI form coercion using sandbox/utils; Argument and ListArgumentInput (sandbox and redesign) use getTuple. ReadOnlyField uses useCallReadOnlyFunction and parseReadOnlyResponse. Query serializes argument bytes into POST bodies.
- Sandbox transfer PageClient and deploy LeftSection call walletTransactions; both FunctionView and redesign public calls use callContract. Wallet request boundary preserves CV arguments and serializes post-condition objects.
- BNS history serializes name/namespace into an NFT-history query; fetchBnsAddress consumes the latest recipient and handles failures.
- Staking overview-data calls reward-estimate, which pins reads to one block and serializes cycle/bond options and responses; existing delayed/rollover/incomplete-set failures remain.
- useFeeEstimates and server cached getSampleTxsFeeEstimate use fetchSampleTxsFeeEstimate; it generates transfer/call/deploy transactions, fetches through app/data.fetchTxFeeEstimation and stacksAPIFetch, parses with Leather, then averages. No serialization is mocked.
- Network constants define public/devnet chain IDs; network-utils selects API and wallet network strings; buildUrl carries custom/subnet/localhost query parameters.

### Reproduction

Removing decoding mocks in the existing function-called-utils test produced 8 failed / 18 passed tests. Examples included `Invalid byte sequence` for placeholder `0x070a...`, a success result reused for the failure assertion, and expected `(response bool)` versus actual `(response bool )`. The test fixtures now supply valid literal bytes and preserve actual output. No production correction is part of this issue.

### Initial verification evidence (before review #7)

- `pnpm lint`: passed (six existing React hook warnings; no errors; Prettier passed).
- `CI=1 pnpm run test:unit`: passed, 123 suites, 1,452 tests passed, 2 existing skips, 104 snapshots passed. Includes unchanged API/WebSocket client tests.
- Focused tests: passed; original function-called scenarios plus captured values, ABI forms, wallet transport, fee vectors, BNS/read-only and staking. Initial red run recorded above.
- Scope review: 27 files, largest 23,150 bytes; 23 frozen tests/fixtures with verified SHA-256 hashes. No production source or dependency/version changes. All eight requested tests remain; no transactions/common/network imports or mocks in frozen tests.
- Build environment: Google Fonts transport returns HTTP 403 in this sandbox. The local-only `/scratch/google-fonts.cjs` supplies Next's `NEXT_FONT_GOOGLE_MOCKED_RESPONSES` using existing Matter font bytes for Inter/Instrument Sans. No font fixture or build output is committed. Build output is symlinked to `/scratch/next-build`.
- The sandbox exposes 14 host CPUs but has a 1.5 CPU / 6 GiB quota. Default build runs hit exit 137; the verification build uses `CIRCLE_NODE_TOTAL=2` (one Next worker) and `NODE_OPTIONS=--max-old-space-size=2816` to fit the quota. These are invocation-only settings.

- `CIRCLE_NODE_TOTAL=2 NODE_OPTIONS=--max-old-space-size=2816 NEXT_FONT_GOOGLE_MOCKED_RESPONSES=/scratch/google-fonts.cjs pnpm build`: passed (exit 0); compilation, TypeScript, 21 static-page generation steps, build tracing and standalone output completed. Plain unrestricted Google Fonts fetching remains unverified in this sandbox; production font configuration is unchanged.

### Review #7: behavior contract, not a file freeze

Requirements: replace SDK-shaped Clarity expectations in optional/tuple coercion, processFunctionParameters and wallet functionArgs with wire hex or display outputs. Keep vector inputs and expected bytes/outputs stable while permitting tests, drivers and snapshots to change for Kit. Remove the file-freeze manifest. Production code and dependencies remain unchanged.

- [x] Convert affected assertions through repository serialization at a mocked transport boundary.
- [x] Replace object snapshots and remove file-freeze rules.
- [x] Run focused tests, lint, all unit tests and build; review expected bytes.

Review verification so far: the updated drivers failed against 15 old SDK-object snapshots (13 tests), then all 109 focused tests passed after capturing hex. A development-only comparison serialized the old captured objects and confirmed all 15 replacement snapshots retain exactly the same bytes; other snapshots are unchanged. No vector input fixture changed. `pnpm lint` passed with the same six existing warnings. `CI=1 pnpm run test:unit` passed: 123 suites, 1,452 tests, 104 snapshots, 2 existing skips.

Final review verification: `pnpm exec tsc --noEmit`, `pnpm lint` and `CI=1 pnpm run test:unit` passed after correcting the overloaded wallet mock parameter type. Unit totals remain 123 suites, 1,452 passed tests, 104 snapshots and 2 existing skips. `CIRCLE_NODE_TOTAL=2 NODE_OPTIONS=--max-old-space-size=2816 NEXT_FONT_GOOGLE_MOCKED_RESPONSES=/scratch/google-fonts.cjs pnpm build` passed (exit 0), including TypeScript, static pages, tracing and standalone output. The font responses and resource settings are invocation-only, as in the initial verification. Production source and dependencies are unchanged. Review #7 is addressed: preserve the behavior vectors, allow test/driver/snapshot adaptation for Kit, and impose no file-hash freeze.

### Boundary inventory requirement (2026-11-13)

Problem: every runtime stacks.js-derived value crossing persistence, display, URL/cache-key, signing, serialization, wallet or API boundaries needs a file/line/flow inventory and linked proof. Stored-data compatibility has priority. Components: SDK runtime import sites; transitive BNS/Leather paths; wallet hook/storage; network cookies; ABI widgets/forms; NFT/BNS decoding; retained clients and cache keys. Dependencies and production behavior stay unchanged.

- [x] Commit an exhaustive source-site and downstream-boundary inventory with linked tests.
- [x] Add a completeness check that fails for missing/moved SDK sites, missing boundary entries or absent proof tests.
- [x] Prove existing public wallet-cache bytes reload, network mismatch/disconnect behavior, and stored network/recent-result/cache compatibility. Record evidence for absence of application-owned mnemonic encryption/decryption and stored signed transactions.
- [x] Cover missing ABI display/submission, NFT/BNS URL/cache/API outputs, contract logs and retained-client request boundaries using wire or shown/stored outputs.
- [x] Run focused tests, lint, full unit suite and build; finish the inventory and workplan.

Authority: implement the new complete behavior contract; human merges. No blocking questions. Inventory locations may be regenerated as source moves; inputs and observable expected behavior remain stable. Test drivers may adapt for Kit.

The maintainer-supplied `stacks-kit-migration/check-coverage.mjs` is committed verbatim. Its inventory includes SDK packages, c32check and Leather/BNS wrappers: 168 tracked import sites, 46 grouped entries (including explicit cookie/session consumers), no missing sites or proofs. The supporting AST ledger records 327 runtime SDK references in 34 production files and 100 downstream boundaries, each with source line, flow and real-test selector. An empty ledger failed the unit check before proofs were populated; the draft maintainer inventory also failed with 42 missing proofs. Both checks now run from the unit suite.

Persistence audit: Explorer owns public-address hex JSON, a wallet-network URL marker, network cookies and recent BNS-result JSON. Literal pre-migration wallet/query cache fixtures are loaded by real code. Wallet connect/store/reload, mismatched-network disconnect, malformed stored bytes, cookie restore/write and actual custom-network discovery are covered. No application-owned mnemonic encryption/decryption, private-key persistence or stored signed-transaction loading exists; no unsupported decryption claim is made.

Missing-boundary vectors now exercise both ABI widget trees over every shared fixture type, both actual submission forms, read-only shown ok/err output, data-variable labels/output, all post-condition codes and principal kinds, all captured NFT values and URL/cache forms, BNS API/fallback serialization, logs, cache hydration/prefill, real wallet RPC serialization, and retained HTTP/WebSocket clients. Tests substitute transport, wallet-provider, navigation, geometry and editor-host interfaces; production codecs, clients and storage execute. Known current NFT rounding, wallet-connection logging, and read-only error display are preserved in tests and documented.

The expanded requirement brings the full PR to 55 files, all below 1 MiB and below the 120-file ceiling. Production code, root package.json and pnpm-lock.yaml are unchanged. Test drivers and source locations may evolve for Kit; vector inputs and expected wire/display/stored output remain the contract.

Final boundary verification: `node stacks-kit-migration/check-coverage.mjs --force` passes (168 tracked, 0 missing, 0 proof problems). `pnpm lint` passes with the same six existing hook warnings. Final `CI=1 pnpm run test:unit` passes: 131 suites, 1,662 passed tests, 293 snapshots, 2 existing skips (43.198s). An intervening full run exposed the existing `page-loaders.test.tsx` timestamp comparison flake (1ms between independent Date.now calls); it passed on the unchanged full rerun. That unrelated behavior was not modified.

`CIRCLE_NODE_TOTAL=2 NODE_OPTIONS=--max-old-space-size=2816 NEXT_FONT_GOOGLE_MOCKED_RESPONSES=/scratch/google-fonts.cjs pnpm build` passed, including TypeScript, static pages, tracing and standalone output. Build output was symlinked into /scratch and local font responses were supplied only for verification; no checkout configuration or production behavior changed. `git diff --check` passes. The required checker matches the supplied source verbatim.

### Cache-key proof and duplicate-route review

- [x] Execute useFeeEstimates and useDataVarValue with real QueryClient caches and transport-only mocks; assert their exact keys and cached outputs.
- [x] Replace unrelated selectors at those inventory boundaries with the hook-specific proofs.
- [x] Deduplicate retained-route vectors by route and remove duplicate snapshots, preserving all distinct request outputs.
- [x] Run focused tests, lint, full unit tests, coverage checks and build; finish workplan.

These tests belong in the existing cache-boundaries suite. Production hooks and serialization stay unchanged.

The new hook proofs use real QueryClient caches and mocked fetch only. Fee keys are asserted on mainnet, testnet and a local custom API; data-variable keys separate contract, variable, chain ID and API URL while concurrent consumers keep each cache entry alive. A temporary mutation adding API URL to the fee key and removing chain ID from the data-variable key made all four new cases fail; production files were then restored. The focused three-suite run passed 50 tests and 32 snapshots.

Retained routes are deduplicated by their actual callback input (route), with stable route-only test names. All 30 distinct expected request snapshots are retained unchanged; 26 identical duplicate snapshots were removed after comparing their payloads. Both downstream hook inventory rows now reference their own cache-key tests; fee/data-variable producer entries also link these proofs.

Review verification completed: `pnpm lint` passes (six existing hook warnings); `CI=1 pnpm run test:unit` passes 131 suites, 1,640 tests and 267 snapshots, with two existing skips (44.051s). The maintainer coverage check passes with 168 tracked imports and zero missing sites/proof problems; the detailed inventory guard passes in the suite. `CIRCLE_NODE_TOTAL=2 NODE_OPTIONS=--max-old-space-size=2816 NEXT_FONT_GOOGLE_MOCKED_RESPONSES=/scratch/google-fonts.cjs pnpm build` passes, including TypeScript, static pages and tracing; build output remains in /scratch. The PR still contains 55 files, all below 1 MiB. Production code and dependencies remain unchanged.
