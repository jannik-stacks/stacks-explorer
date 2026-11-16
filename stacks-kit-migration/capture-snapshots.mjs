// Development-only repository-behavior capture. Review every changed byte/output.
import { spawnSync } from 'node:child_process';
import { delimiter, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const tests = [
  'src/app/sandbox/__tests__/parseHexClarityValue.test.ts',
  'src/app/sandbox/__tests__/walletTransactions.test.ts',
  'src/app/sandbox/__tests__/abi-boundaries.test.tsx',
  'src/app/sandbox/__tests__/read-only-boundaries.test.tsx',
  'src/app/sandbox/hooks/__tests__/useUser.test.tsx',
  'src/app/sandbox/components/ContractCall/__tests__/PostConditionForm.test.ts',
  'src/app/staking/__tests__/reward-estimate.test.ts',
  'src/app/txid/[txId]/redesign/function-called/__tests__/function-called-utils.test.ts',
  'src/app/txid/[txId]/redesign/function-called/__tests__/function-call-post-condition-utils.test.ts',
  'src/app/txid/[txId]/redesign/function-called/__tests__/prettyFunctionResult.test.ts',
  'src/app/address/[principal]/__tests__/sdk-boundaries.test.tsx',
  'src/common/queries/__tests__/bns-queries.test.ts',
  'src/common/queries/__tests__/useCallReadOnlyFunction.test.ts',
  'src/common/queries/__tests__/cache-boundaries.test.tsx',
  'src/common/queries/__tests__/txSummaryFeeds.test.tsx',
  'src/common/context/__tests__/network-storage.test.tsx',
  'src/common/utils/__tests__/fee-utils.test.ts',
  'src/common/utils/__tests__/network-utils.test.ts',
  'src/common/utils/__tests__/buildUrl.test.ts',
  'src/common/utils/__tests__/post-condition-mode-utils.test.ts',
  'src/common/utils/__tests__/transaction-utils.test.ts',
];
const bin = join(root, 'node_modules/.pnpm-cli/node_modules/.bin');
const result = spawnSync(
  join(bin, 'pnpm'),
  [
    'run',
    'test:unit',
    '--runInBand',
    '--runTestsByPath',
    ...tests,
    ...(process.argv.includes('--write') ? ['--updateSnapshot'] : []),
  ],
  {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, PATH: `${bin}${delimiter}${process.env.PATH}` },
  }
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
