# Explorer behavior vectors (issue #4)

Initial capture: 2026-11-11, Explorer commit
`7a58b3606ccb120a31b321b1262fd42b204bd870`, with
`@stacks/transactions@7.6.0`, `@stacks/common@7.0.2` and
`@stacks/network@7.0.2` (transactions resolves common@7.6.0).
Fee paths use Leather query@2.35.1, stacks@1.7.3 and utils@0.30.0.
No Kit or dependency-version changes were used for capture.

## Reproducing captures

Development capture scripts are committed under `stacks-kit-migration/`:

- `node stacks-kit-migration/capture-fixtures.cjs` reconstructs and verifies the
  Clarity, BNS response and public wallet-cache literals, and prints/verifies SDK
  enum values. `--write` writes the JSON captures. ABI form inputs are authored
  literal user inputs rather than SDK-generated data.
- `node stacks-kit-migration/capture-snapshots.mjs` runs the repository vector
  drivers without changing expectations. `--write` captures their observable
  outputs using Jest snapshot updates. Review every output change against the
  original behavior; do not accept new dependency output automatically.
- `capture-fixtures.cjs` also prints the serialized staking-read response values
  used to author the literal responses in `reward-estimate.test.ts`.

These scripts deliberately import today's SDK for development capture only.
They are never imported by tests or production. All vector tests execute real
repository codecs, formatting and fee logic against mocked transport boundaries,
without a runtime SDK oracle. Build output belongs in `/scratch`.

`clarity.json` covers signed/unsigned boundaries, booleans, ASCII/UTF-8, buffers,
principals and nested containers. `sdk-constants.ts` holds literal enum inputs.
`abi-form.json` holds form/coercion inputs. Existing transaction examples and
staking response hex stay in their test files. Snapshots capture repository
shown outputs, request contents, post-condition bytes and fee payloads/lengths.

All 14 ABI cases in each real form and the wallet wrappers execute actual
Connect serialization. Their assertions observe `window.StacksProvider.request`
parameters directly, including bare argument hex. They never serialize arguments
again to manufacture the expected provider request. Wallet rejection and other
error paths also use the provider transport.

## Behavior contract for the remaining migration

Preserve vector inputs and expected wire bytes, requests, stored/shown outputs,
success/failure behavior and fee results, except for the explicit owner-approved
exceptions below. Tests, drivers and snapshots may adapt to Kit. SDK object
layouts, source locations and file bytes are not the contract. A snapshot update
must preserve the same bytes/output unless its behavior change has owner sign-off.

`stacks-kit-migration/inventory.json` is the only behavior inventory. Its
maintainer-supplied checker tracks SDK/Kit imports and linked proofs without
asserting source line, column or expression equality. Run
`pnpm check:stacks-coverage` separately from Jest. Keep entry IDs stable; refresh
source locations and proof links as implementations move. Existing API and
WebSocket suites cover clients retained through migration; no extra retained-client
vector suite is added here.

## Known quirks: may change with owner sign-off

Each item below **may change with owner sign-off**. Record that decision and
update only the affected expected outputs; part 2 need not add an adapter merely
to reproduce one of these quirks.

- SDK `cvToJSON`/ABI type-label spelling and whitespace, including
  `(response bool )` and `(response uint )`.
- Locale-grouped tuple numbers (`1,000`) and precision loss when display conversion
  coerces boundary integers to JavaScript numbers.
- Optional-list form coercion currently emits primitive list entries rather than
  optional wrappers.
- Legacy NFT metadata requests round large IDs with `parseInt`, including the URL
  id `3.402823669209385e%2B38`; non-numeric SDK-decoded values also retain current
  stringification in NFT display/link outputs. Exact integer wire bytes remain
  separately covered.
- BNS SDK fallback name/namespace buffer handling, including the repeated name
  buffer in the current fallback request.
- The wallet hook logs `No STX address found in response` after storing a valid
  connection result.
- Read-only API errors (`okay: false`) are decoded in the sandbox but shown as raw
  result hex by the redesign field.
- Contract-log buffer decoding follows current UTF-8 replacement behavior; the
  `00ff80` buffer displays `\u0000\ufffd\ufffd`. This case is asserted inline so
  the snapshot file contains no NUL byte.

Fee defaults/clamps/rounding and wallet rejection/null behavior remain ordinary
behavior vectors, not SDK-object-shape requirements.

## Stored data and test environments

`stored-wallet.json` contains literal public-address cache bytes in Connect's
`0.0.1` format. Real SDK loading, connect/store/reload, public-key stripping and
network-mismatch disconnect are tested. Network cookies and recent BNS search
JSON are also restored through actual repository code. Explorer does not persist
React Query data; no synthetic persisted-query-cache fixture is claimed.

The audit found no Explorer-owned encrypted mnemonic/private-key or persisted
signed-transaction load/decrypt path. Wallet-owned secrets remain outside the
application; no fictitious decryption compatibility claim is made.

`setup-jest.js` supplies the same TextEncoder/TextDecoder and Node Buffer-compatible
Uint8Array realm to every jsdom suite before modules load. The browser provider
only supplies application contexts and missing geometry observers. Byte/encoding
suites use `@jest-environment node`. Read-only UI tests replace only the Monaco
host with a preformatted DOM host, retaining repository parsing/editor formatting.
