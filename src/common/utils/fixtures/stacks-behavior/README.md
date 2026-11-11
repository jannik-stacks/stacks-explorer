# Frozen stacks.js behavior vectors (issue #4)

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
transactions/common/network at runtime. ABI types are inferred from repository function signatures.

## Observations intentionally preserved

Response types retain the internal space in `(response bool )`. Unsigned tuple
fields use locale grouping (`1,000`); current display conversion can lose integer
precision at the maximum boundary. Optional-list coercion emits its current
primitive list entries. Low fees may fall below defaults, standard fees clamp,
and high fees may exceed configured ranges. Malformed fee responses throw.
Wallet user rejections return null; unrelated failures propagate.
These are characterization results, not behavior fixes.

## Freeze contract

`frozen-sha256.json` lists the resulting tests and fixtures (including snapshots)
with SHA-256 hashes. Preserve their bytes through migration parts 2/3 and 3/3;
change the implementation to satisfy them. Do not regenerate snapshots with a
replacement dependency. The manifest excludes itself, this provenance document,
the workplan and Jest configuration. Existing API and WebSocket tests remain
unchanged and are included in the full unit regression run.
