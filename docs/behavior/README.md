# Stacks SDK behavior inventory

The maintainer coverage gate is [inventory.json](../../stacks-kit-migration/inventory.json). Run `node stacks-kit-migration/check-coverage.mjs`; it tracks direct SDK packages, c32check, and Leather/BNS wrappers, with explicit reasons for erased type-only entries. Its supplied checker is retained verbatim.

[stacks-inventory.json](stacks-inventory.json) is the detailed source-site ledger
for the installed implementation before Kit. Each `sites` or `boundaries` entry
contains the production file, one-based line (and SDK reference column), source
expression, value flow/destination, and executable proof selectors (`file` plus
Jest test-name substring). The JSON deliberately includes separate references on
the same line. It is an inventory of behavior contracts, not a source-file freeze.

The ledger contains 327 runtime SDK references in 34 production files and 100
explicit downstream storage, chain-ID/cache, display, URL and retained-client
boundaries. Read `storedData` first for the persistence audit.

## Stored-data compatibility

| Value | Existing representation and destination | Proof |
| --- | --- | --- |
| Wallet addresses | `@stacks/connect` localStorage: hex-encoded UTF-8 JSON, version `0.0.1`; real SDK loader restores Redux user data and address API inputs | `src/app/sandbox/hooks/__tests__/useUser.test.tsx`: old bytes with/without network marker, bad bytes, network mismatch, connect/store/reload, disconnect |
| Wallet public key | Returned by wallet; transient `connect.userData.publicKey`; SDK persistence strips public keys | Same hook suite, actual wallet-provider transport |
| Selected wallet network | `stacks-wallet-network-url` public URL string | Same hook suite; mismatch rejects old addresses |
| Custom/removed networks | `addedCustomNetworks`/`removedCustomNetworks` cookie JSON; numeric chain IDs, mode, public URLs | `src/common/context/__tests__/network-storage.test.tsx`: old cookie loading and actual cookie writes |
| Recent BNS results | `recentResults` localStorage JSON: public owner, name and result kind | `src/common/queries/__tests__/cache-boundaries.test.tsx`: real BNS SDK output -> exact stored JSON -> restore and URL input |
| Cached read-only results | Plain hex in React Query data; serialized argument bytes and chain ID in query identity | Same cache suite: literal `stored-query-cache.json` loads and displays; hydration round trip and key equality |
| Cached fee values | Plain numeric fee priorities/averages, not SDK money/CV objects | Fee vector suite; fee query key is inventoried |
| Encrypted mnemonics/private keys | No app-owned store, encrypt/decrypt operation, mnemonic consumer or UserSession construction exists in production `src` | Runtime import and secret/transaction identifier inventory guard; full browser-storage audit; real wallet cache contains public addresses only |
| Serialized signed transactions | Wallet returns `transaction`/`txid`/signature; Explorer returns or ignores them, does not persist/reload them | Actual provider RPC/returned-data proof in useUser suite; storage/transaction-codec guard |

`@stacks/auth` is a declared dependency but has no runtime import. Explorer does
not own wallet secrets and cannot claim to decrypt wallet-owned ciphertext. The
hex wallet cache is encoding, not encryption. No fictional mnemonic or encrypted
transaction fixture is introduced. There is no React Query persistence plugin;
the cached-data fixture proves the app's plain-data/hydration representation.

## Coverage and equality

The ledger follows ABI discrimination/coercion/validation through both actual
Formik forms into wallet/read-only argument hex; labels/placeholders/input types
are checked as shown outputs. All post-condition types/codes and both standard
and contract principals are compared through wire hex. NFT values are checked
through metadata request URLs, cache keys and actual rendered Explorer/Gamma
links. BNS includes API success and deterministic contract-fallback argument
bytes/decoded outputs. Contract logs and read-only displays cover all captured
Clarity types. Fee vectors pin payloads, lengths and plain estimates.

Retained SDK HTTP clients are exercised against mocked fetch, including every
inventoried literal GET route; headers, POST bodies, returned JSON and WebSocket
RPC bytes are checked. Existing API/WebSocket regressions remain in the suite.
Server-origin JSON fields which merely have SDK-named TypeScript schema types
are not a stacks.js computation or codec. Their retained-client transport is
covered; this ledger does not invent encrypted representations for server data.

## Keeping the inventory complete

`src/common/utils/__tests__/stacks-inventory.test.ts` compares every source entry
against `stacks-kit-migration/scan-boundaries.cjs`. The scanner erases TypeScript
first, then records live SDK import references (including aliases, namespace
imports, re-exports, require and dynamic imports). Type-only imports, tests,
fixtures and test drivers are excluded. It separately scans browser storage,
network cookies, chain-ID uses, decoded NFT URL/cache sinks, read-only/log display
sinks, retained requests, and new secret/transaction-codec identifiers.

The supplied checker is also invoked with `--force` by the unit suite, including
when an engine context is present. A missing/moved/new site or boundary fails
the check. Empty proof lists and proof
selectors that no longer name a real test also fail. The check was run red with
an empty inventory before populating the reviewed flows. Inventory source line
numbers are refreshed when production source moves; this does not freeze tests.

To inspect the current source sets:

```
node stacks-kit-migration/scan-boundaries.cjs
node stacks-kit-migration/scan-boundaries.cjs --boundaries
```

When either set changes, trace the new value to its display/storage/wire/cache
consumer, add the behavior proof, and update the corresponding entry. Review
transitive dependencies and indirect consumers as well as scanner output: a
syntax inventory is not a general JavaScript taint-analysis proof. Tests, drivers,
snapshots and inventory locations may adapt for Kit; vector inputs and expected
wire bytes or displayed/stored outputs remain the contract. Do not satisfy a
new inventory row by pointing at an unrelated passing test.
