# Final Stacks Kit dependency inventory (#6)

Kit 0.1.0 owns Explorer's Clarity values, transaction objects, networks, post
conditions and wire encoding. This inventory completes the exceptions from #3
and #5. Removing a direct declaration does not remove dependencies needed by
retained integrations.

## Direct exceptions and Kit gaps

| Package | Version | Reason and application paths |
| --- | --- | --- |
| @stacks/connect | 8.1.9 | Wallet discovery/picker, persisted session/disconnect and SIP-030 requests: sandbox useUser, walletTransactions, deploy and transfer. Kit does not replace this lifecycle; Kit also resolves Connect as a peer. |
| @stacks/blockchain-api-client | 9.8.0 | Extended Explorer REST and WebSocket APIs: getApiClient, data-fetchers, BlockList sockets and query consumers. Kit node RPC does not replace these endpoints/subscriptions. |
| @stacks/token-metadata-api-client | 2.2.1 | Metadata client and generated response schemas: useApi, useBulkTokenMetadata, token/balance views and queries. Kit has no equivalent metadata API. |
| @stacks/stacks-blockchain-api-types | 7.14.1 | Development dependency providing Explorer API response types across transaction/address/block/token views. Kit does not supply these schemas. |
| @stacks/prettier-config | 0.0.10 | Explicit tooling exception: .prettierrc.js uses the existing formatting policy. Kit has no formatting replacement. Its prettier@2.5.1 is transitive tooling; the root formatter remains prettier@3.5.3. |

bns-v2-sdk@2.0.0 remains for useSearchQuery's getNameInfo; Kit has no BNS
resolver. No local stacks.js adapter is retained.

## Transitive exceptions

The following are package dependency edges, not application imports. All start
at retained Connect or BNS; Kit's Connect peer reaches the same Connect graph.

| Parent | Resolved Stacks children | Why retained |
| --- | --- | --- |
| @stacks/connect@8.1.9 | common@7.0.2, network@7.0.2, network-v6 → network@6.17.0, transactions@7.6.0, transactions-v6 → transactions@6.17.0, profile@7.6.0, connect-ui@8.0.0 | Connect's wallet compatibility, profile and picker implementation. The v6 names are npm aliases, not additional package versions. |
| bns-v2-sdk@2.0.0 | common@6.16.0, network@6.17.0, transactions@7.6.0 | Retained BNS resolver's SDK implementation. |
| @stacks/profile@7.6.0 | common@7.6.0, network@7.6.0, transactions@7.6.0 | Connect's profile dependency. |
| @stacks/transactions@7.6.0 | common@7.6.0, network@7.6.0 | Connect/profile/BNS transaction implementation. |
| @stacks/transactions@6.17.0 | common@6.16.0, network@6.17.0 | Connect's transactions-v6 alias. |
| @stacks/network@6.17.0 | common@6.16.0 | Connect's network-v6/transactions-v6 and BNS paths. |
| @stacks/network@7.0.2 | common@7.0.2 | Connect's network path. |
| @stacks/network@7.6.0 | common@7.6.0 | Connect → profile/transactions and BNS → transactions paths. |

connect-ui@8.0.0 has no Stacks children (it uses @stencil/core@2.22.3).
All three common versions have no Stacks children. Neither retained API client,
API types nor formatting config adds a Stacks runtime dependency.

## Override and lint ownership

Removed the global transactions@7.6.0 override: Connect's ^7.0.0, profile's
^7.6.0 and BNS's ^7.0.2 all accept the existing 7.6.0 lock resolution. No
retained Stacks package changed version during regeneration. Connect's explicit
npm transactions-v6 alias still resolves 6.17.0. There is no longer an Explorer
primitive consumer requiring a global SDK pin; the lockfile preserves the
verified integration versions.

Removed unused @stacks/eslint-config without changing .eslintrc.js. Explicitly
declared the configured @typescript-eslint/parser@8.68.0,
eslint-plugin-react@7.37.5 and @next/eslint-plugin-next@15.2.4 at their existing
versions. Hooks/Storybook plugins were already direct dependencies. Unused
config-provided rules/plugins need no replacement declarations.

## Audit

- Audited source, tests, root configuration, manifest, overrides and regenerated
  lockfile. No imports of auth/common/network/transactions/connect-ui or Leather
  remain in application/test/config code. No obsolete adapter or fixture
  generator exists. Removed Leather-only Jest transform exceptions, including
  its zone-file, queue and url-join dependencies.
- Remaining deep imports belong to retained Connect type declarations and API
  generated schemas/types; none is an old primitive API.
- auth, encryption, stacking, eslint-config, old API type versions and every
  Leather package disappeared from the lockfile. The five direct exceptions
  above and the documented Connect/BNS transitive graph are the complete
  remaining @stacks/* set.
- Historical workplans and behavior-fixture provenance describe the SDKs used
  at capture time and are intentionally unchanged. No frozen tests, snapshots,
  vector inputs or expected wire bytes/outputs changed.
- This satisfies #3's exception policy: remaining runtime SDK packages are
  confined to the retained wallet/BNS functionality without Kit replacements;
  API clients/schemas and formatting tooling have explicit separate reasons.

## pnpm why evidence

Generated against the clean frozen installation manifest/lockfile with
`pnpm why '@stacks/*' --depth Infinity`; every remaining package/version is
included below. `pnpm why @stacks/network-v6 @stacks/transactions-v6 --depth Infinity`
additionally confirms Connect owns both aliases. Paths are displayed from
package to dependent by pnpm; the tables above display parent to dependency.

```text
@stacks/blockchain-api-client@9.8.0
└── @hiro/explorer@1.0.0 (dependencies)

@stacks/common@6.16.0
├─┬ @stacks/network@6.17.0
│ ├─┬ @stacks/connect@8.1.9
│ │ ├── @hiro/explorer@1.0.0 (dependencies)
│ │ └─┬ @jannik-stacks/kit@0.1.0
│ │   └── @hiro/explorer@1.0.0 (dependencies)
│ ├─┬ @stacks/transactions@6.17.0
│ │ └── @stacks/connect@8.1.9 [deduped]
│ └─┬ bns-v2-sdk@2.0.0
│   └── @hiro/explorer@1.0.0 (dependencies)
├── @stacks/transactions@6.17.0 [deduped]
└── bns-v2-sdk@2.0.0 [deduped]

@stacks/common@7.0.2
├─┬ @stacks/connect@8.1.9
│ ├── @hiro/explorer@1.0.0 (dependencies)
│ └─┬ @jannik-stacks/kit@0.1.0
│   └── @hiro/explorer@1.0.0 (dependencies)
└─┬ @stacks/network@7.0.2
  └── @stacks/connect@8.1.9 [deduped]

@stacks/common@7.6.0
├─┬ @stacks/network@7.6.0
│ ├─┬ @stacks/profile@7.6.0
│ │ └─┬ @stacks/connect@8.1.9
│ │   ├── @hiro/explorer@1.0.0 (dependencies)
│ │   └─┬ @jannik-stacks/kit@0.1.0
│ │     └── @hiro/explorer@1.0.0 (dependencies)
│ └─┬ @stacks/transactions@7.6.0
│   ├── @stacks/connect@8.1.9 [deduped]
│   ├── @stacks/profile@7.6.0 [deduped]
│   └─┬ bns-v2-sdk@2.0.0
│     └── @hiro/explorer@1.0.0 (dependencies)
├── @stacks/profile@7.6.0 [deduped]
└── @stacks/transactions@7.6.0 [deduped]

@stacks/connect@8.1.9
├── @hiro/explorer@1.0.0 (dependencies)
└─┬ @jannik-stacks/kit@0.1.0
  └── @hiro/explorer@1.0.0 (dependencies)

@stacks/connect-ui@8.0.0
└─┬ @stacks/connect@8.1.9
  ├── @hiro/explorer@1.0.0 (dependencies)
  └─┬ @jannik-stacks/kit@0.1.0
    └── @hiro/explorer@1.0.0 (dependencies)

@stacks/network@6.17.0
├─┬ @stacks/connect@8.1.9
│ ├── @hiro/explorer@1.0.0 (dependencies)
│ └─┬ @jannik-stacks/kit@0.1.0
│   └── @hiro/explorer@1.0.0 (dependencies)
├─┬ @stacks/transactions@6.17.0
│ └── @stacks/connect@8.1.9 [deduped]
└─┬ bns-v2-sdk@2.0.0
  └── @hiro/explorer@1.0.0 (dependencies)

@stacks/network@7.0.2
└─┬ @stacks/connect@8.1.9
  ├── @hiro/explorer@1.0.0 (dependencies)
  └─┬ @jannik-stacks/kit@0.1.0
    └── @hiro/explorer@1.0.0 (dependencies)

@stacks/network@7.6.0
├─┬ @stacks/profile@7.6.0
│ └─┬ @stacks/connect@8.1.9
│   ├── @hiro/explorer@1.0.0 (dependencies)
│   └─┬ @jannik-stacks/kit@0.1.0
│     └── @hiro/explorer@1.0.0 (dependencies)
└─┬ @stacks/transactions@7.6.0
  ├── @stacks/connect@8.1.9 [deduped]
  ├── @stacks/profile@7.6.0 [deduped]
  └─┬ bns-v2-sdk@2.0.0
    └── @hiro/explorer@1.0.0 (dependencies)

@stacks/prettier-config@0.0.10
└── @hiro/explorer@1.0.0 (devDependencies)

@stacks/profile@7.6.0
└─┬ @stacks/connect@8.1.9
  ├── @hiro/explorer@1.0.0 (dependencies)
  └─┬ @jannik-stacks/kit@0.1.0
    └── @hiro/explorer@1.0.0 (dependencies)

@stacks/stacks-blockchain-api-types@7.14.1
└── @hiro/explorer@1.0.0 (devDependencies)

@stacks/token-metadata-api-client@2.2.1
└── @hiro/explorer@1.0.0 (dependencies)

@stacks/transactions@6.17.0
└─┬ @stacks/connect@8.1.9
  ├── @hiro/explorer@1.0.0 (dependencies)
  └─┬ @jannik-stacks/kit@0.1.0
    └── @hiro/explorer@1.0.0 (dependencies)

@stacks/transactions@7.6.0
├─┬ @stacks/connect@8.1.9
│ ├── @hiro/explorer@1.0.0 (dependencies)
│ └─┬ @jannik-stacks/kit@0.1.0
│   └── @hiro/explorer@1.0.0 (dependencies)
├─┬ @stacks/profile@7.6.0
│ └── @stacks/connect@8.1.9 [deduped]
└─┬ bns-v2-sdk@2.0.0
  └── @hiro/explorer@1.0.0 (dependencies)

Found 1 version of @stacks/blockchain-api-client
Found 3 versions of @stacks/common
Found 1 version of @stacks/connect
Found 1 version of @stacks/connect-ui
Found 3 versions of @stacks/network
Found 1 version of @stacks/prettier-config
Found 1 version of @stacks/profile
Found 1 version of @stacks/stacks-blockchain-api-types
Found 1 version of @stacks/token-metadata-api-client
Found 2 versions of @stacks/transactions

```

## Verification results

- Clean `pnpm install --frozen-lockfile` passed with lifecycle scripts enabled
  (pnpm 10.33.0, 1,638 packages, exit 0). The installation directory initially
  had no node_modules; it contained unchanged copies of the root package.json,
  pnpm-lock.yaml, .npmrc and .husky, with a fresh Git repository for Husky.
  Actual invocation: `CI=1 pnpm --dir /scratch/6-clean-scripts install --frozen-lockfile`.
  No ignore-scripts flag, configuration or environment override was used.
  `prepare` executed `husky install` and set `core.hooksPath` to `.husky/_`.
  pnpm itself skips the exact `npx only-allow pnpm` preinstall guard.
  Its default dependency-build approval policy warned about unapproved scripts
  for @sentry/cli, @sentry/node-cpu-profiler, core-js-pure, core-js, esbuild and
  unrs-resolver; no approval/ignore policy was changed. Husky emitted its
  existing install-command deprecation warning. The manifest and lockfile
  remained byte-identical. This supersedes the earlier scripts-disabled check.
- Pre-pruning behavior gate: 11 suites, 244 tests and 99 snapshots passed.
- After pruning, `pnpm lint` passed (six existing hook warnings);
  `CI=1 pnpm run test:unit` passed (123 suites, 1,454 tests, two skips,
  104 snapshots). Captured behavior remained unchanged.
- `pnpm build` passed including TypeScript, 21 static pages and build tracing,
  using part 2's invocation-only local font-response workaround and one worker.
  Plain build cannot fetch Inter/Instrument Sans in this sandbox. No font
  configuration, asset or build output is committed.
- `pnpm test:e2e --workers=1 --max-failures=1` was rerun for all 23 existing
  Explorer tests. Chromium v1234 is absent; every browser download mirror
  returned HTTP 403. One launch failure occurred before navigation, 22 tests
  did not run. Browser flows and desktop/mobile verification remain unverified.
  See the workplan for commands and environment details.

On 2026-11-13 the maintainer authorized opening the PR with browser coverage
explicitly unavailable and the manual page checklist in the workplan/PR. Unit
tests, standalone type checks and the production build remain required.

Final 2026-11-13 rerun: lint and all 123 unit suites passed again (1,454
passed tests, two skips, 104 snapshots). The production build completed,
including TypeScript and 21 static pages, with the same local font-response
workaround. Standalone `pnpm typecheck` (`tsc --noEmit`) also exited 0.

## Production import-site inventory

[stacks-kit-migration/inventory.json](../../stacks-kit-migration/inventory.json)
uses the original part-1 entries/sites/proof format and preserves all 46 entry
IDs. Successor Kit symbols stay with the behavior entry they replace; the shared
Clarity display helper joins the existing display entry. No entry was dropped.
Proofs name existing tests or captured vector IDs, including restored part-1
round trips for wallet storage, network cookies and query/search cache JSON.

The unchanged part-1 checker is restored at
[check-coverage.mjs](../../stacks-kit-migration/check-coverage.mjs). Run
`node stacks-kit-migration/check-coverage.mjs --all` before pushing. It passes:
96 imports/tracked, zero missing sites, zero proof problems and zero removed
entries. This includes all 93 previously reported Kit/Connect bindings plus
three BNS calls from the original wrapper scope; no scope was narrowed.

The restored storage suites passed all 24 tests and their original provider
snapshot. Only the wallet test driver changes: native Kit post-condition
strings/bigint replace numeric SDK selectors, and optional argument hex prefixes
are normalized when comparing the captured wire bytes. No captured expected
bytes or stored fixtures changed. Restored address/NFT/BNS component vectors
also pass all 28 tests and 23 original snapshots. They exposed and corrected
the lost 0x prefix for buffer NFT IDs in metadata URLs/cache keys and Gamma
links; the consumer now formats the native Kit buffer value to preserve the
existing observable behavior. Browser smoke coverage
remains separately unavailable under the maintainer-approved exception.

Final resubmission checks: the original checker passes all 96 tracked sites
with no missing entries, proof problems or removed IDs, including comparison
with the part-1 baseline. Lint, all 127 unit suites (1,521 passed tests, two
skips, 128 snapshots), standalone type checking and the documented font-mocked
production build passed. The restored checker, snapshots and stored JSON
fixtures remain byte-identical to part 1. No dependency or adapter was added.
