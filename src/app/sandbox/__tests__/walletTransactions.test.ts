/** @jest-environment node */
import { getPostCondition } from '@/app/txid/[txId]/redesign/function-called/function-call-post-condition-params-utils';
import { serializeClarityValues } from '@/common/queries/test-utils/serializeClarityValues';

import { request } from '@stacks/connect';

import {
  callContract,
  deployContract,
  getAddresses,
  parseClarityValue,
  signMessage,
  transferStx,
} from '../utils/walletTransactions';

jest.mock('@stacks/connect', () => ({ request: jest.fn() }));
const requestMock = jest.mocked(request);
const address = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';
beforeEach(() => requestMock.mockReset());

it('pins wallet request defaults and explicit transfer/deploy settings', async () => {
  requestMock.mockResolvedValue({ txid: 'tx' } as any);
  await expect(transferStx({ recipient: address, amount: '123' })).resolves.toEqual({ txid: 'tx' });
  await transferStx({ recipient: address, amount: '456', memo: 'memo', network: 'devnet' });
  await deployContract({ name: 'hello', clarityCode: '(ok true)' });
  await deployContract({
    name: 'hello',
    clarityCode: '(ok true)',
    clarityVersion: 3,
    network: 'testnet',
  });
  await signMessage({ message: 'hello' });
  expect(requestMock.mock.calls).toMatchSnapshot();
});

it('serializes every post condition through the repository wallet boundary', async () => {
  requestMock.mockResolvedValue({ txid: 'tx' } as any);
  for (const [postConditionType, postConditionConditionCode] of [
    [0, 1],
    [1, 2],
    [2, 16],
    [3, 5],
    [4, 50],
  ]) {
    const pc = getPostCondition({
      postConditionType,
      postConditionConditionCode,
      postConditionAddress: address,
      postConditionAmount: 1100000,
      postConditionAssetAddress: address,
      postConditionAssetContractName: 'asset',
      postConditionAssetName: 'token',
    });
    expect(pc).toBeDefined();
    await callContract({
      contract: `${address}.hello`,
      functionName: 'print',
      functionArgs: [42, 'hello', true, false, { type: 'none' }],
      postConditions: [pc!],
      postConditionMode: 'deny',
      network: 'testnet',
    });
  }
  await callContract({
    contract: `${address}.hello`,
    functionName: 'print',
    functionArgs: [],
    postConditions: ['deadbeef'],
    postConditionMode: 'originator',
  });
  await callContract({ contract: `${address}.hello`, functionName: 'print', functionArgs: [] });
  const calls = [];
  for (const [method, params] of requestMock.mock.calls) {
    const args = params as unknown as Parameters<typeof callContract>[0];
    calls.push([
      method,
      { ...args, functionArgs: await serializeClarityValues(args.functionArgs) },
    ]);
  }
  expect(calls).toMatchSnapshot();
});

it('returns addresses and preserves parsed values', async () => {
  requestMock.mockResolvedValue({ addresses: [{ address }] } as any);
  await expect(getAddresses()).resolves.toEqual([{ address }]);
  expect(requestMock.mock.calls).toEqual([['getAddresses']]);
  expect(parseClarityValue({ type: 'uint', value: '42', extra: true })).toEqual({
    type: 'uint',
    value: '42',
  });
  expect(parseClarityValue(null)).toBeNull();
  expect(parseClarityValue('raw')).toBe('raw');
});

const operations = [
  () => transferStx({ recipient: address, amount: '1' }),
  () => deployContract({ name: 'hello', clarityCode: '(ok true)' }),
  () => callContract({ contract: `${address}.hello`, functionName: 'print', functionArgs: [] }),
  () => signMessage({ message: 'hello' }),
  () => getAddresses(),
];
it.each(operations)('returns null for wallet rejection (%#)', async operation => {
  for (const message of ['User rejected request', 'Request rejected']) {
    requestMock.mockRejectedValue(new Error(message));
    await expect(operation()).resolves.toBeNull();
  }
});
it.each(operations)('propagates other wallet errors (%#)', async operation => {
  const error = new Error('Wallet unavailable');
  requestMock.mockRejectedValue(error);
  await expect(operation()).rejects.toBe(error);
});
