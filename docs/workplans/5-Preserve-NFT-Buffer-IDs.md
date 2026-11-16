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
