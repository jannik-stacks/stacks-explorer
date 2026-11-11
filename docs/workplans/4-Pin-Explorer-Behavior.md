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
