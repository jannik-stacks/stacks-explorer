# Task 5: Preserve NFT buffer token IDs

## Task ID
#5 / PR #8 follow-up.

## Problem Statement
Wire input `0x02000000021234` must yield Explorer token ID `0x1234`, not decimal `1234`. Preserve the metadata search/lookup key and both Gamma links. Keep native Kit values; convert only when Explorer builds its token ID.

## Components Involved
NFTTable decodes holdings, builds bulk metadata keys and passes token IDs to CollectibleCard, which builds both Gamma links. AddressTabs renders NFTTable on the collectibles tab. useBulkFtMetadata sends the keys to metadata search and indexes responses by contract/token ID.

## Dependencies
Existing Kit codec, metadata hook and CollectibleCard; no dependency changes or Kit wrapper.

## Implementation Checklist
- [x] Trace token ID consumers and exact example.
- [x] Observe the wire-input component regression fail before the fix.
- [x] Prefix buffer IDs before numeric-string coercion.
- [x] Verify token ID, metadata search/lookup and both rendered Gamma links; retain numeric IDs.
- [x] Run focused tests, lint and build; review diff/news and record unavailable inventory check.

## Verification Steps
Run the focused NFTTable component suite before/after the fix. No existing suite covers NFTTable; other components have React Testing Library suites, so add the same kind of coverage beside this component. Run lint/build and inventory if available. The engine runs the full unit suite. Browser e2e cannot run in this sandbox; affected flow is address-page collectibles/NFT metadata and outbound Gamma navigation (`e2e/page-address.spec.ts` is existing address-page smoke coverage, with no dedicated collectibles case).

## Decision Authority
Maintainer explicitly requested this fix; human merges PR #8 into agentgraph/4.

## Questions/Uncertainties
None blocking. Inventory files/checker are absent in this checkout at start; engine supplies the checker after its inventory run.

## Acceptable Tradeoffs
An Explorer-specific display conversion at the existing consumer; no Kit changes, adapters or unrelated UI changes.

## Status
Completed

## Notes
Only the outstanding NFT regression is in scope; previous migration/review work is already present. Exact expected metadata key is `<contractId>:0x1234`; Gamma identifier is `<contractId>_0x1234`.

### Verification evidence

- Red: literal buffer wire input produced `1234n` and `metadataImageUrl: undefined`; uint control passed (`/scratch/nft-red.log`).
- Green: final focused `pnpm exec jest --runTestsByPath 'src/app/address/[principal]/redesign/__tests__/NFTTable.test.tsx' --runInBand` passes both tests. Tests use native Kit deserialization and real CollectibleCard rendering, pin the card token ID, metadata search/lookup and both Gamma hrefs. Expected token IDs are literal `0x1234` and `42n`.
- `pnpm lint` passes: six existing hook warnings, formatting passes.
- `pnpm test:unit`: full suite is reserved for the engine check, as requested; only the touched test file was run locally.
- Inventory/checker unavailable: neither `stacks-kit-migration/inventory.json`, the repository checker nor `/scratch/check-coverage.mjs` is present. No inventory entries are changed.
- Browser e2e not run, per sandbox constraint. Affected flow: address collectibles metadata/image resolution and both outbound Gamma links; existing `e2e/page-address.spec.ts` address smoke cases do not exercise collectibles explicitly.
- Existing real CollectibleCard emits a nested-anchor HTML warning; left outside this fix and recorded for the PR.

- Final production build passes (compilation, TypeScript, 21 static pages and standalone tracing): `CIRCLE_NODE_TOTAL=2 NODE_OPTIONS=--max-old-space-size=2816 NEXT_FONT_GOOGLE_MOCKED_RESPONSES=/scratch/google-fonts.cjs pnpm build`. Reused the migration workplan's invocation-only local font mock approach with existing Matter bytes; output is outside the checkout at `/scratch/next-build` via ignored `.next` symlink. The first build caught an unsupported bigint literal in the new test; changed it to the surrounding repo's `BigInt(42)` form, then reran the focused tests, lint and build successfully.
- Final diff review: three files, production change confined to token ID selection; all files below 1 MiB. No dependencies, wrappers or captured vectors changed. News read before completion: nothing new. Full unit/inventory checks remain for the engine; browser verification remains unavailable.

### Inventory retry

The engine supplied `/scratch/check-coverage.mjs` and reported 93 missing sites because the baseline checkout has no inventory. Add the complete discovered inventory with existing behavior proofs; add direct retained-wallet storage round-trip and legacy NFT/BNS consumer coverage where no existing test exercises the owner. Include the supplied checker unchanged for repeatable local verification. No runtime changes beyond the NFT ID correction are planned. Run touched suites, lint/build and the inventory check before completing the retry.

Inventory implementation: `stacks-kit-migration/inventory.json` groups all 93 discovered imports by 43 owner files and names live proofs. The supplied checker is copied unchanged to `stacks-kit-migration/check-coverage.mjs`; scope exclusions are unchanged. Existing codec/form/display/fee/read-only tests supply shared behavior proofs; the inventory explicitly distinguishes those from component interaction coverage. No entries are dropped. Added direct NFT integer-avatar, BNS tuple/id, Connect session remount/disconnect, and existing custom-network cookie regressions to supply missing consumer/state evidence.

Retry checks so far: the supplied checker and repository copy both pass (93 tracked, zero missing, zero proof problems, zero removals). All four touched suites pass (nine tests). The new wallet test exposes an existing warning after successful connection: `connectWallet` dispatches valid data and then throws `No STX address found in response`; this remains outside the requested fix and will be noted in the PR alongside nested anchors.

- [x] Restore complete inventory and verify both unchanged checker copies.
- [x] Add missing consumer/session/cookie proofs and run only the four touched suites (nine passing tests).
- [x] Final `pnpm lint` passes (six existing warnings) and font-mocked one-worker `pnpm build` exits 0, including compilation, TypeScript, all 21 static pages and standalone tracing (`/scratch/nft-inventory-build.log`).
- [x] Review final diff, file sizes and news. Eight changed/new files in this retry, all below 1 MiB; the sole production edit remains the buffer token-ID expression. Inventory now passes locally; full `pnpm test:unit` remains for the engine as requested. Browser e2e remains unavailable; affected address collectibles metadata/Gamma flow is recorded above.

### Merge inventory follow-up

The merge base includes three additional established inventory IDs absent from the reconstructed checkout inventory: `S044` (address validation), `X-EXP-1` (network cookie persistence) and `X-EXP-2` (wallet session restoration). Restore all three under their existing IDs, using current Kit symbols and live regression proofs. Retain the address entry even though the reconstructed inventory also groups that owner in S043; no behavior entry is dropped. No runtime or test changes are needed. Verify with `AGENTGRAPH_BASE=agentgraph/4` so the removed-entry audit uses the actual PR target, rather than only the older checkout base.

- [x] Restore the three established records and validate their proof files/names.
- [x] Check inventory against both the checkout base and PR target; review diff/news.

Merge follow-up verification: both `node stacks-kit-migration/check-coverage.mjs --limit 80` and `AGENTGRAPH_BASE=agentgraph/4 node stacks-kit-migration/check-coverage.mjs --limit 80` pass: 93 tracked imports, zero missing sites, zero proof problems and zero removed entries. Diff/whitespace review passes; only inventory and workplan change, so prior test/lint/build evidence remains applicable. No new test run is needed for these metadata-only changes. News read before completion: nothing new. Status: Completed.

### Updated-base behavior-test integration

Status: In Progress. Base agentgraph/4 moved to 2bc8cef and added real-form/provider snapshots that still use stacks.js numeric selections and number widgets. Reproduce the reported 60 snapshot/47 test failures, migrate test drivers to native Kit type/comparator/mode strings and bigint, and compare the same expected wire bytes and visible outputs. The real provider boundary also exposes a wallet argument hex prefix mismatch: preserve the baseline unprefixed provider arguments. Integer and amount text widgets are required by the earlier hex-input/precision review, so update only those widget-type expectations, retaining labels, values and bytes. Mode descriptions must be tested by native names rather than old numeric object keys. Keep the new base cache inventory entries intact. No compatibility layer or blanket snapshot regeneration.

- [x] Reproduce the updated baseline failures and classify each mismatch.
- [x] Migrate old test-driver inputs and repair any actual provider behavior differences.
- [x] Verify touched suites and byte-equivalence; run lint/build and base-aware inventory; read news.

Updated-base reproduction: focused runs observed numeric post-condition inputs producing undefined Pc values/field-map errors, mode/type/comparator snapshot metadata mismatches, number-to-text widget expectations, and prefixed wallet arguments at the actual provider boundary. Five deterministic affected suites are now green: 121 tests and 90 snapshots. Only the wallet serializer changes production behavior: it sends native `Cl.serialize` output without adding `0x`, matching the unchanged actual-provider snapshots. Read-only RPC argument prefixes remain unchanged.

Snapshot edits were derived mechanically from the baseline expectations, without `jest -u`: replace numeric metadata with native Kit strings and integer/amount input widget types with text. A temporary script asserts that every literal hex value is unchanged per snapshot entry; this includes all 84 post-condition vectors and all 28 real-form wallet requests. All labels, descriptions, form values, fee fixtures, principal inputs and byte payloads remain captured. The nested Kit wallet assertion now expects the same unprefixed provider boundary as the rest of the captured wallet vectors. There is no legacy shape bridge.

`pnpm lint` passes with the same six existing warnings. Both default and `AGENTGRAPH_BASE=agentgraph/4` inventory checks pass (93 sites; no missing proofs or removed entries), including the maintainer-added cache-key entries from 5539d1d. Production build is running with the documented invocation-only font mock and scratch output. Full unit tests remain for the engine; only focused migration suites were executed locally.

Final updated-base verification: `pnpm lint` passes (six existing warnings), and the documented font-mocked one-worker `pnpm build` exits 0 after compilation, TypeScript, 21 static pages and standalone tracing. The five touched suites pass 121 tests / 90 snapshots. Inventory against the checkout and actual PR base passes with all 93 sites and no removals; 5539d1d cache-key entries are unchanged. No direct transactions/common/network imports exist in source/tests. Final diff: eight paths, all below 1 MiB, with one production-line correction and native test/snapshot metadata updates. Browser e2e remains unavailable: affected existing transaction/address smoke cases are `e2e/page-txid.spec.ts` and `e2e/page-address.spec.ts`, with sandbox public contract-call wallet submission also affected. Block/homepage flows remain unverified as previously recorded. Full unit suite remains for the engine. News read before completion: nothing new. Status: Completed.

### Remaining sandbox snapshot

Status: In Progress. The engine passed 131 suites and isolated one remaining snapshot failure in sandbox PostConditionForm. The earlier focused run omitted that suite. Reproduced the failure: only numeric post-condition option values and parameter-map keys differ from native Kit string IDs; all 17 other tests, including the literal amount-above-2^53 bytes, already pass. Update only those expected IDs, preserving option labels/order and each type's parameter fields. No additional runtime changes. Verify all six touched suites and the inventory before resending every proposal.

Remaining-snapshot verification: all six touched suites now pass (139 tests, 91 snapshots), including sandbox PostConditionForm and the real wallet-provider/form boundaries. The final snapshot edit mechanically replaces only numeric selection IDs with native Kit strings; option labels/order and parameter-field lists were compared unchanged. No wire bytes, application code or test inputs changed in this incremental retry. The supplied checker passes both default and `AGENTGRAPH_BASE=agentgraph/4` audits (93 tracked, zero missing/proof problems/removals). Diff/whitespace review passes. Previous lint/build evidence applies to the identical production/TypeScript source; no repeat build is needed for this expected-snapshot-only edit. Nine paths total remain in the pending proposal, all below 1 MiB. News read: nothing new. Status: Completed.
