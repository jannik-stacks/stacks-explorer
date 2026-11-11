# Task 5: Migrate Explorer primitives and consumers to Kit

## Task ID
5; stacks on #4, part of #3. Branch agentgraph/5; base agentgraph/4.

## Problem Statement
Replace stacks.js primitives with direct Kit imports while preserving all frozen behavior vectors. The issue supplies no single failing input or error; exact bytes, display text, fee payloads/lengths and rounding are captured in part 1 fixtures.

## Components Involved
Sandbox and both contract-call forms, wallet serialization, transaction and address views, staking, network types/constants, read-only and BNS queries, fee estimation/configuration.

## Dependencies
Pin published @jannik-stacks/kit after inspecting exports. Retain Connect for discovery/picker, persisted session/disconnect and SIP-030 requests; blockchain-api-client for extended REST/WebSocket; token-metadata-api-client for metadata; stacks-blockchain-api-types for Explorer schemas; bns-v2-sdk for name resolution (Kit has no resolver). Record BNS transitive stacks.js dependencies below. Dependency declaration cleanup and formatting configuration belong to part 3.

## Implementation Checklist
- [x] Inspect Kit exports and trace all production imports and callers.
- [x] Add integration coverage in existing suites and observe failure before fixes; preserve captured wire bytes and display results with native Kit test drivers, per maintainer update.
- [x] Migrate Clarity constructors, codecs, ABI arguments, network primitives, post conditions, address validation and deep imports directly to Cl/Tx/Address/Pc and Kit types.
- [x] Migrate both form implementations and wallet serialization boundary without mixing legacy values.
- [x] Rebuild fee payloads/lengths with Kit, preserving minimums, fallbacks and rounding; remove Leather runtime imports from fees/config.
- [x] Finish final lint/unit/build evidence, verify retained integrations and captured byte and display vectors.
- [x] Run the requested transaction/address/block/homepage e2e command and record the browser-launch limitation.
- [x] Review scope (64 files, each below 1 MiB), read news, and record Kit gaps.
- [x] Prepare the single PR after required lint/unit/build checks pass, disclosing unavailable browser verification.

## Verification Steps
Focused existing suites, captured wire bytes and observable outputs, pnpm lint, pnpm test:unit, pnpm build, pnpm test:e2e. Record mocked wallet/read-only integration evidence.

## Decision Authority
Implementor changes code; reviewer can return once; human merges. No compatibility facade, unnecessary refactors or dependency cleanup.

## Questions/Uncertainties
Code blockers: none. Browser verification limitation: Playwright Chromium v1234 is absent and all download mirrors return HTTP 403; the headed browser config also needs a display. Kit gaps and ESM interop are documented below.

## Acceptable Tradeoffs
Small app-specific helpers and smallest necessary workarounds for documented Kit gaps; captured behavior takes precedence. The maintainer update permits native test-driver and snapshot changes; retain all captured observable and wire-format results.

## Status
Completed

## Notes
Published npm exports inspected: version 0.1.0; root, connect, testing, vitest and typegen expose ESM .mjs and .d.mts types. Kit connect is not used to replace wallet lifecycle.

### Requirement inventory and exact examples

1. Pin an exact published Kit version after checking exports; use direct root imports and native Cl, Tx, Address/Network, Pc, Codec and types. No stacks.js compatibility module, enums, shapes or runtime bridge.
2. Replace Clarity construction/codecs, ABI form encoding, networks, post-condition building/serialization, address validation and deep transaction imports across the inventoried paths and callers. Include both FunctionView and FunctionCallForm and the sandbox wallet boundary.
3. Preserve captured serialization, display results, read-only bodies, fee payloads/lengths, minimums, fallbacks, priorities and average rounding. The issue contains no standalone failing input/error. Concrete regression examples come from part 1: nested `0x070a0c0000000201610b0000000201000000000000000000000000000000000100000000000000000000000000000001016209`, uint maximum `340282366920938463463374607431768211455`, `(response bool )`, and sample lengths 180/159/177 bytes.
4. Remove Leather query/stacks/money runtime use from fee generation and configuration. Leave dependency declarations and formatting configuration for part 3.
5. Retain Connect wallet discovery/picker/session/disconnect/SIP-030; extended Explorer REST/WebSocket client and response schemas; metadata client/schemas; BNS resolver. Verify their regressions and document reasons/transitives.
6. Pass lint, unit tests and independent production build; run existing transaction/address/block/homepage e2e and record mocked wallet/read-only results. Keep scope below about 120 files and each file below 1 MiB. One PR targeting agentgraph/4; human merges.

### Maintainer update and decision

The news update from @jannik-stacks explicitly supersedes the original frozen-file constraint: “Preserve behavior, not test files: prove equivalence through the wire format (serialize to bytes/hex and compare) or observable outputs; tests and snapshots may change to use Kit.” Form state/tests therefore use native Kit mode/type/comparator strings and bigint post-condition amounts. The updated part 1 review also records optional/tuple/form-parameter snapshots as wire hex; the migration retains those bytes. Post-condition hex, display snapshots, fee vectors, ABI bytes and fixture JSON remain unchanged. No legacy-to-Kit bridge is added. Part 1 review #7 removes the file-freeze manifest.

### Ownership and callers traced

- Sandbox utils feed tuple/list/optional inputs in both Argument trees. FunctionView and FunctionCallForm/processFunctionParameters encode native Kit values; public calls reach callContract and read-only calls reach useCallReadOnlyFunction. Connect receives hex for arguments and post conditions.
- Both post-condition form implementations use native Kit selection types and Pc builders. Shared builder use preserves sandbox's empty-list and invalid-type handling. Form validations retain error strings and amount coercion.
- FunctionCalled, FunctionArgsTable, function lists, ContractAvailableFunctions and read-only fields consume Kit ABI/value types. Transaction result/log formatting consumes Kit-decoded values and app display helpers.
- NFTTable, TokenAssetListItem and useBnsNames consume native decoded values. BNS query serializes tuple buffers with Kit; bns-v2-sdk remains the name resolver.
- Staking overview-data invokes reward-estimate; its pinned-block reads now serialize/decode with Kit, preserving bodies and cycle/active-bond failure paths.
- useFeeEstimates and server cached getSampleTxsFeeEstimate reach generateSampleTxs/getStacksFeeEstimate and app/data.fetchTxFeeEstimation. Kit transactions and raw payload codecs produce the captured lengths/payloads; the Explorer fee policy is expressed directly in micro-STX numbers.
- Network constants use Kit networks; custom-network chain IDs derive from Kit's network type. Shared address validation feeds search, transfer/faucet, contract search, address filters and truncation; address versions come from Kit Network.

### Retained integrations and Kit gaps

- Connect remains for wallet lifecycle and SIP-030 requests; Kit connect itself has a Connect peer dependency and does not replace discovery/session UI.
- blockchain-api-client remains for extended Explorer REST and WebSocket; token-metadata-api-client for metadata; stacks-blockchain-api-types for Explorer schemas. Kit's node RPC client does not replace these.
- bns-v2-sdk remains because Kit has no BNS resolver. Installed lock graph: bns-v2-sdk 2.0.0 -> common 6.16.0, network 6.17.0, transactions 7.6.0 (root override); axios 1.20.0. These transitive SDKs remain confined to the retained integration.
- Kit has no Explorer ABI/type labels, indented display, or legacy tuple/principal display style. Small display-only helpers retain the visible text; nested contract-log JSON text is rendered within the existing formatter, never returned as SDK value objects.
- Kit's ABI encoder expects typed JS booleans rather than form strings. Existing sandbox form helpers coerce boolean/optional inputs and serialize for bounds validation. Both form consumers use these helpers with Kit values.
- Kit has no Explorer/Leather fee priority policy or flat-transaction payload extractor. Fee estimation uses Tx and Codec.Raw.Payload directly, preserving all captured payload bytes and fee policy without Leather.
- Kit has no standalone ABI-variable type. The data-variable view consumes Kit's existing ClarityAbiArg name/type fields, with access retained as an app/API field.

### Reproduction evidence

The new nested Kit wallet integration test failed with the old object handoff: expected the captured hex argument but received `{ type: 'ok', value: { type: 'some', ... } }`. Serializing with Cl.serialize at the Connect boundary makes it pass; the captured post-condition hex is unchanged. Initial root-import integration also exposed Jest's missing ESM export resolution/TextEncoder; Jest now maps the published ESM entry, transforms .mjs, supplies encoders and retains the native structuredClone where present.

### Verification evidence (current)

- `pnpm lint`: passed, ESLint has six existing hook warnings, no errors; Prettier passed. Formatting configuration unchanged.
- `CI=1 pnpm run test:unit`: passed without extra Jest arguments, 123 suites, 1,455 passed / 2 skipped, 104 snapshots passed (subsequent trait-reference regression adds one test; final count below).
- Focused native form/validation, wallet, staking, BNS and read-only suites pass; all fee snapshots are unchanged. Five native STX comparators are also compared with literal wire bytes. The new wallet nested-value case was observed red before serialization and green afterward.
- A development-only comparison against the pre-migration wallet snapshot serialized its original objects using the installed old serializer. All seven calls matched the new hex-only request snapshot exactly, including post conditions, defaults and modes. This comparison lives outside the checkout; application/tests contain no old SDK imports.
- Contract-call memo handling retains its byte conversion without a browser Buffer global; its literal optional-buffer bytes pass with `global.Buffer` temporarily absent.
- Native Kit trait-reference encoding differs for bare addresses: the old form produced a contract principal with the literal name `undefined`, while Kit encodes an address. The existing form helper preserves that coercion using native Kit input. A new literal-byte test failed (`0a05...` versus captured `0a06...undefined`) before the workaround and passes after it. This is a Kit ABI/form gap, not a legacy-value bridge.
- Production build passed: `CIRCLE_NODE_TOTAL=2 NODE_OPTIONS=--max-old-space-size=2816 NEXT_FONT_GOOGLE_MOCKED_RESPONSES=/scratch/google-fonts.cjs pnpm build`, including compilation, TypeScript, 21 static pages and standalone tracing. A final verification run is recorded below. Output is under `/scratch/next-build` via an ignored `.next` symlink.
- Plain build failed solely on Google Fonts fetching, matching part 1. The invocation-only local font mock uses existing Matter bytes; no font setting, font file or build artifact is committed. One worker and heap settings fit the sandbox's 1.5 CPU / 6 GiB quota.
- `pnpm test:e2e e2e/page-txid.spec.ts e2e/page-address.spec.ts e2e/page-block.spec.ts e2e/page-homepage.spec.ts --workers=1 --max-failures=1 --output=/scratch/kit-e2e-results`: attempted; all 20 selected flows are unverified because browser launch failed before navigation. Chromium v1234 is absent; `pnpm exec playwright install chromium` tried all published download mirrors and received HTTP 403. The original config also requires a display. A runner-provided Chromium/display or headless environment is needed before e2e can run. No application failure was reached.
- Scope: 64 files including workplan and display helpers; largest file is pnpm-lock.yaml at 624,988 bytes. No direct transactions/common/network imports remain in application or test source, and no Leather runtime imports remain anywhere in src. Package declaration cleanup stays in part 3. All captured fixture JSON and display/fee snapshots remain unchanged; native test drivers and serialization snapshots represent the same captured bytes.

### Browser verification limitation

The requested e2e command was run and its launch failure recorded. Browser page flows and desktop/mobile verification remain unverified and must be disclosed in the PR. The mandatory lint/unit/build checks are verified separately. The PR's Kit gaps include display/form coercion, bare trait-reference coercion, fee policy/payload extraction, and retained BNS/extended API/wallet lifecycle limitations.

A repeat build compiled successfully but exited 137 during TypeScript while another verification process was running; cgroup memory events confirmed an OOM kill. Run the final checks sequentially within the 6 GiB quota. This changes no repository settings.

Final lint/unit evidence after the last source change: `pnpm lint` passed (six existing warnings); the exact engine command `CI=1 pnpm run test:unit` passed with 123 suites, 1,456 passed, 2 skipped, 104 snapshots. The last source change's focused trait-reference suite passed all 43 tests / 12 snapshots. Production builds run by themselves; no concurrent lint/test processes.

Final production verification: the sequential build exited 0 on the final source, compiled successfully, passed TypeScript, generated all 21 static pages, and completed standalone build tracing. The exact invocation is the font-mocked, one-worker command above. Lint and the exact engine unit command also exited 0 on this source. No further code changes are pending; e2e browser launch is the remaining blocker.

### Continued checkout: part 1 review #7 integration

The continued checkout includes the updated part 1 behavior contract, transport serializer test helper, hex snapshots and removal of the file-hash manifest. Resolved both conflict-marker blocks by retaining captured serialized argument vectors and native Kit mode strings. The wallet driver initially failed because it attempted to serialize already-serialized hex as Clarity objects; it now asserts the hex request boundary directly. No captured expected bytes were regenerated. Required checks are rerun on the combined checkout below.

Final combined-checkout verification: `pnpm lint` passed with six existing warnings; `CI=1 pnpm run test:unit` passed (123 suites, 1,456 tests, 2 skips, 104 snapshots); the sequential font-mocked `pnpm build` exited 0 after compilation, TypeScript, 21 static pages and standalone tracing. The combined focused suites passed 111 tests / 53 snapshots without updating expected bytes. The requested 20-flow e2e command was retried and stopped at missing Chromium before navigation (one launch failure, 19 not run). Implementation and runnable checks are complete; browser coverage remains explicitly unavailable, not passed. Final scope is 64 changed paths including the inherited part 1 review changes and removed manifest; all 63 non-deleted files are below 1 MiB.
