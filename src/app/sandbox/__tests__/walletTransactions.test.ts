/** @jest-environment node */
import { getPostCondition } from '@/app/txid/[txId]/redesign/function-called/function-call-post-condition-params-utils';

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
    ['stx-postcondition', 'eq'],
    ['ft-postcondition', 'gt'],
    ['nft-postcondition', 'sent'],
    ['staking-postcondition', 'lte'],
    ['pox-postcondition', 'will-perform'],
  ] as const) {
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
  expect(requestMock.mock.calls).toMatchSnapshot();
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

it('serializes nested Kit values before handing a contract call to Connect', async () => {
  const { Cl, Pc } = await import('@jannik-stacks/kit');
  requestMock.mockResolvedValue({ txid: 'tx' } as any);
  const hex =
    '0x070a0c0000000201610b0000000201000000000000000000000000000000000100000000000000000000000000000001016209';
  await callContract({
    contract: `${address}.hello`,
    functionName: 'print',
    functionArgs: [Cl.deserialize(hex)],
    postConditions: [Pc.principal(address).willSendEq(1100000).ustx()],
  });
  expect(requestMock).toHaveBeenCalledWith(
    'stx_callContract',
    expect.objectContaining({
      functionArgs: [hex],
      postConditions: ['000216a46ff88886c2ef9762d970b4d2c63678835bd39d01000000000010c8e0'],
    })
  );
});
