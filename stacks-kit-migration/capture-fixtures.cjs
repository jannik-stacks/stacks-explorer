// Development-only capture against the installed pre-Kit SDK. Never imported by tests.
const fs = require('node:fs');
const path = require('node:path');
const { Cl, cvToHex, cvToString } = require('@stacks/transactions');
const sdk = require('@stacks/transactions');
const root = path.resolve(__dirname, '..');
const folder = path.join(root, 'src/common/utils/fixtures/stacks-behavior');
const principal = 'SP000000000000000000002Q6VF78';
const values = [
  ['uint-zero', Cl.uint(0)],
  ['uint-max', Cl.uint(2n ** 128n - 1n)],
  ['int-min', Cl.int(-(2n ** 127n))],
  ['int-max', Cl.int(2n ** 127n - 1n)],
  ['int-negative', Cl.int(-1)],
  ['true', Cl.bool(true)],
  ['false', Cl.bool(false)],
  ['ascii', Cl.stringAscii('Hello, world!')],
  ['utf8', Cl.stringUtf8('hé🙂')],
  ['buffer', Cl.buffer(Uint8Array.from([0, 255, 128]))],
  ['principal', Cl.standardPrincipal(principal)],
  ['contract', Cl.contractPrincipal(principal, 'pox-4')],
  ['none', Cl.none()],
  ['some', Cl.some(Cl.uint(7))],
  ['ok', Cl.ok(Cl.bool(true))],
  ['err', Cl.error(Cl.uint(1))],
  ['nested', Cl.ok(Cl.some(Cl.tuple({ a: Cl.list([Cl.uint(0), Cl.uint(1)]), b: Cl.none() })))],
];
const captures = {
  'clarity.json': values.map(([name, value]) => ({
    name,
    hex: cvToHex(value),
    repr: cvToString(value),
  })),
  'bns-fallback.json': {
    nameInfo: cvToHex(
      Cl.some(
        Cl.tuple({
          'hashed-salted-fqn-preorder': Cl.none(),
          'imported-at': Cl.none(),
          owner: Cl.standardPrincipal(principal),
          'preordered-by': Cl.none(),
          'registered-at': Cl.none(),
          'renewal-height': Cl.uint(100),
          'stx-burn': Cl.uint(1),
        })
      )
    ),
    byId: cvToHex(
      Cl.some(Cl.tuple({ name: Cl.bufferFromAscii('alice'), namespace: Cl.bufferFromAscii('btc') }))
    ),
  },
};
const wallet = JSON.parse(fs.readFileSync(path.join(folder, 'stored-wallet.json'), 'utf8'));
captures['stored-wallet.json'] = {
  ...wallet,
  value: Buffer.from(JSON.stringify(wallet.decoded), 'utf8').toString('hex'),
};
const write = process.argv.includes('--write');
for (const [file, capture] of Object.entries(captures)) {
  const dest = path.join(folder, file);
  if (write) fs.writeFileSync(dest, JSON.stringify(capture, null, 2) + '\n');
  else if (JSON.stringify(JSON.parse(fs.readFileSync(dest, 'utf8'))) !== JSON.stringify(capture))
    throw Error(`Capture differs: ${file}`);
  console.log(`${write ? 'Captured' : 'Verified'} ${file}`);
}
const ts = fs.readFileSync(path.join(folder, 'sdk-constants.ts'), 'utf8');
for (const name of [
  'FungibleConditionCode',
  'NonFungibleConditionCode',
  'PostConditionMode',
  'PostConditionType',
  'PoxConditionCode',
]) {
  const literal = ts.match(new RegExp(`export const ${name} = (\\{[\\s\\S]*?\\}) as const;`))[1];
  const captured = Function(`return (${literal})`)();
  if (JSON.stringify(captured) !== JSON.stringify(sdk[name])) throw Error(`Enum differs: ${name}`);
  console.log(`${name}: ${JSON.stringify(sdk[name])}`);
}
const stakingReads = {
  'current-pox-reward-cycle': Cl.uint(142),
  'current-distribution-cycle': Cl.uint(284),
  'get-last-reward-compute-height': Cl.uint(964249),
  'get-rewards-per-token-for-cycle': Cl.uint(10n ** 18n),
  'get-total-shares-staked-for-cycle (bond)': Cl.uint(100000000),
  'get-total-shares-staked-for-cycle (total)': Cl.uint(100),
  'get-new-rewards': Cl.uint(100000),
  'get-protocol-bond': Cl.some(Cl.tuple({ 'target-rate': Cl.uint(300) })),
  'assert-all-active-bonds-included': Cl.ok(Cl.bool(true)),
};
for (const [name, value] of Object.entries(stakingReads)) console.log(`${name}: ${cvToHex(value)}`);
