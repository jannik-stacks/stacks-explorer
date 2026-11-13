# Explorer behavior vectors (issue #4)

Captured on 2026-11-11 from Explorer source commit
`7a58b3606ccb120a31b321b1262fd42b204bd870` with installed
`@stacks/transactions@7.6.0`, `@stacks/common@7.0.2` and
`@stacks/network@7.0.2`. Transactions also resolves its own common@7.6.0.
Fee paths use the installed Leather query@2.35.1, stacks@1.7.3 and utils@0.30.0.
No Kit or production/dependency changes were used to capture these vectors.

## Capture method

- `clarity.json`: one-time SDK construction/serialization of the named values;
  repository `parseHexClarityValue` verifies each captured representation with
  both prefixed and bare bytes. Integer limits are 0, 2^128−1, −2^127 and
  2^127−1. UTF-8 includes a multibyte character and a surrogate pair.
- `sdk-constants.ts`: literal enum values captured from the installed SDK;
  these are test inputs, never runtime SDK imports or mocks.
- `abi-form.json`: literal ABI and user form inputs covering primitive, tuple,
  optional, list, optional-list, tuple-list and memo paths.
- Existing transaction/log examples remain in `function-called-utils.test.ts`.
  Placeholder hex in mocked scenarios was replaced with captured valid bytes.
- Staking read responses were serialized once and pasted into the existing
  `reward-estimate.test.ts`, including its error and rollover scenarios.
- Jest snapshots were captured by executing repository functions with
  `pnpm exec jest --runInBand --updateSnapshot --runTestsByPath <test files>`.
  They pin pretty printing, result/log formatting, ABI coercion, staking request
  bodies, BNS bytes, wallet requests and post-condition bytes, and fee responses
  plus all three payloads and estimated lengths on each network.
- Only fetch/stacksAPIFetch and the wallet `request` boundary are mocked.
  Fee generation, length estimation, response parsing, Clarity encoding and
  post-condition serialization execute their real installed implementations.
  Jest's ESM transform allowance loads the Leather modules and ESM dependencies.
  Node test environments supply real TextEncoder/TextDecoder.

Capture scripts and build artifacts are outside the checkout, not runtime
oracles. Tests run offline without services or wallets and do not import or mock
transactions/common/network at runtime. ABI types are inferred from repository
function signatures. The serialization test driver passes Clarity values through
repository `callReadOnlyFunction` and captures argument hex at its mocked fetch
boundary. Optional/tuple coercion, processed function parameters and wallet
functionArgs are asserted as wire hex, without SDK object layouts or BigInt
representations in their expected values.

## Observations intentionally preserved

Response types retain the internal space in `(response bool )`. Unsigned tuple
fields use locale grouping (`1,000`); current display conversion can lose integer
precision at the maximum boundary. Optional-list coercion emits its current
primitive list entries. Low fees may fall below defaults, standard fees clamp,
and high fees may exceed configured ranges. Malformed fee responses throw.
Wallet user rejections return null; unrelated failures propagate.
These are characterization results, not behavior fixes.

## Behavior contract for the remaining migration

Preserve vector inputs and their expected wire bytes, request contents, display
outputs, success/failure results and fee estimates through migration parts 2/3
and 3/3. These observable behaviors are the contract; stacks.js Clarity object
layouts and the bytes of test files are not.

Tests, serialization drivers and snapshots may change to call Kit, reorganize
cases or represent the same expected bytes/outputs differently. Keep the
captured expected behavior when adapting the drivers; do not replace it with
whatever a new dependency happens to return. Snapshot updates must preserve the
vector inputs and expected bytes/outputs rather than pin a new SDK object shape.
There is no file-hash freeze manifest.

Existing API and WebSocket tests remain regression coverage for retained clients.

## Boundary inventory extension (2026-11-13)

See `stacks-kit-migration/inventory.json`, the maintainer-supplied
`check-coverage.mjs`, and the detailed `docs/behavior/stacks-inventory.json` ledger for each source location,
destination and proving test. The companion completeness test detects unlisted
runtime SDK sites, downstream boundaries and missing proof selectors.

`stored-wallet.json` contains literal public-address cache bytes in the installed
Connect `0.0.1` format. The real SDK storage loader and actual wallet-provider
transport prove restore, write, public-key stripping and disconnect behavior.
`stored-query-cache.json` contains literal pre-Kit plain JSON cache data and a
serialized-argument key. Hydration and read-only display prove old data loads.
`bns-fallback.json` captures current serialized contract responses; fallback
requests use deterministic test entropy and real SDK serialization. No runtime
SDK oracle or SDK object expectations are added.

The browser test provider supplies platform TextEncoder/TextDecoder, a matching
Uint8Array realm for Node Buffer, and geometry observers missing in JSDOM. It
does not substitute the application encoders, decoders, wallet storage or API
clients. The source/dependency audit found no application-owned encrypted
mnemonic/private-key or persisted signed-transaction load/decrypt path; these
remain wallet responsibilities, not an invented compatibility claim.

Additional existing behavior is deliberately preserved: legacy NFT metadata
requests round large IDs through parseInt; wallet connection currently logs an
error after storing a successful address; BNS SDK fallback output retains the
installed SDK's buffer/name handling. These are documented vectors, not fixes.

Both actual read-only fields retain ok/err shown outputs, including the redesign
field’s raw hex when the API returns `okay: false`. The Monaco host is replaced
by a preformatted DOM host in those display tests; application response parsing
and editor value formatting still execute.
