import { createBehaviorWrapper } from '@/common/queries/test-utils/BehaviorProvider';
import storedWallet from '@/common/utils/fixtures/stacks-behavior/stored-wallet.json';
import { act, renderHook, waitFor } from '@testing-library/react';

import { useUser } from '../useUser';

beforeEach(() => {
  localStorage.clear();
  jest
    .spyOn(global, 'fetch')
    .mockResolvedValue(
      new Response(
        JSON.stringify({ results: [], total: 0, limit: 20, offset: 0, stx: { balance: '123' } }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
});
afterEach(() => jest.restoreAllMocks());

it.each([true, false])(
  'loads pre-migration wallet-cache bytes with network marker %s',
  async marker => {
    localStorage.setItem(storedWallet.key, storedWallet.value);
    if (marker) localStorage.setItem(storedWallet.networkKey, storedWallet.networkUrl);
    const { wrapper, store } = createBehaviorWrapper();
    const { result } = renderHook(() => useUser(), { wrapper });
    await waitFor(() => expect(result.current.isConnected).toBe(true));
    expect(result.current.userData).toEqual({
      stxAddress: storedWallet.decoded.addresses.stx[0].address,
      publicKey: '',
      networkUrl: storedWallet.networkUrl,
    });
    expect(store.getState().connect.userData).toEqual(result.current.userData);
    expect(localStorage.getItem(storedWallet.key)).toBe(storedWallet.value);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const urls = jest
      .mocked(global.fetch)
      .mock.calls.map(([input]) => (typeof input === 'string' ? input : (input as Request).url));
    expect(urls.some(url => url.includes('/SP000000000000000000002Q6VF78/'))).toBe(true);
    act(() => result.current.disconnect());
    expect(result.current.isConnected).toBe(false);
    expect(localStorage.getItem(storedWallet.key)).toBeNull();
    expect(localStorage.getItem(storedWallet.networkKey)).toBeNull();
  }
);

it('rejects an old wallet cache belonging to a different network', () => {
  localStorage.setItem(storedWallet.key, storedWallet.value);
  localStorage.setItem(storedWallet.networkKey, 'https://other.example');
  const { wrapper, store } = createBehaviorWrapper();
  const { result } = renderHook(() => useUser(), { wrapper });
  expect(result.current.isConnected).toBe(false);
  expect(store.getState().connect.userData).toBeUndefined();
  expect(localStorage.getItem(storedWallet.key)).toBeNull();
});

it.each([null, 'not-hex', '7b'])(
  'keeps missing or malformed old wallet data disconnected: %s',
  data => {
    if (data !== null) localStorage.setItem(storedWallet.key, data);
    const { wrapper } = createBehaviorWrapper();
    const { result } = renderHook(() => useUser(), { wrapper });
    expect(result.current.isConnected).toBe(false);
    expect(result.current.userData).toBeUndefined();
  }
);

it('stores wallet transport addresses without private keys and reloads them', async () => {
  const provider = {
    request: jest.fn().mockResolvedValue({
      jsonrpc: '2.0',
      id: '1',
      result: {
        addresses: [
          {
            symbol: 'STX',
            address: storedWallet.decoded.addresses.stx[0].address,
            publicKey: 'public-key',
          },
        ],
      },
    }),
  };
  (window as any).StacksProvider = provider;
  const { wrapper, store } = createBehaviorWrapper();
  const { result, unmount } = renderHook(() => useUser(), { wrapper });
  let pending: Promise<void>;
  act(() => {
    pending = result.current.connect();
  });
  await waitFor(() => expect(document.querySelector('connect-modal')).not.toBeNull());
  await act(async () => {
    (document.querySelector('connect-modal') as any).callback('StacksProvider');
    await pending;
  });
  expect(store.getState().connect.userData).toEqual({
    stxAddress: storedWallet.decoded.addresses.stx[0].address,
    publicKey: 'public-key',
    networkUrl: storedWallet.networkUrl,
  });
  const raw = localStorage.getItem(storedWallet.key)!;
  const stored = JSON.parse(Buffer.from(raw, 'hex').toString('utf8'));
  expect(stored.addresses.stx).toEqual([
    { symbol: 'STX', address: storedWallet.decoded.addresses.stx[0].address },
  ]);
  expect(raw).not.toContain('public-key');
  expect(localStorage.getItem(storedWallet.networkKey)).toBe(storedWallet.networkUrl);
  unmount();
  const restored = renderHook(() => useUser(), { wrapper: createBehaviorWrapper().wrapper });
  expect(restored.result.current.stxAddress).toBe(storedWallet.decoded.addresses.stx[0].address);
  delete (window as any).StacksProvider;
});

it('serializes actual wallet-provider RPC requests and preserves returned transaction data', async () => {
  const {
    transferStx,
    deployContract,
    callContract,
    signMessage,
    getAddresses,
  } = require('../../utils/walletTransactions');
  const { encodeOptional } = require('../../utils');
  const {
    getPostCondition,
  } = require('@/app/txid/[txId]/redesign/function-called/function-call-post-condition-params-utils');
  const provider = {
    request: jest.fn().mockImplementation(async (method: string) => ({
      jsonrpc: '2.0',
      id: '1',
      result:
        method === 'getAddresses'
          ? {
              addresses: [
                { symbol: 'STX', address: storedWallet.decoded.addresses.stx[0].address },
              ],
            }
          : { txid: '0xvector', transaction: '0xdeadbeef', signature: 'signature' },
    })),
  };
  (window as any).StacksProvider = provider;
  const { result } = renderHook(() => useUser(), { wrapper: createBehaviorWrapper().wrapper });
  let pending: Promise<void>;
  act(() => {
    pending = result.current.connect();
  });
  await waitFor(() => expect(document.querySelector('connect-modal')).not.toBeNull());
  await act(async () => {
    (document.querySelector('connect-modal') as any).callback('StacksProvider');
    await pending;
  });
  const returned = await transferStx({
    recipient: storedWallet.decoded.addresses.stx[0].address,
    amount: '123',
    memo: 'hé',
  });
  expect(returned).toEqual({ txid: '0xvector', transaction: '0xdeadbeef', signature: 'signature' });
  await deployContract({ name: 'vectors', clarityCode: '(ok true)' });
  await callContract({
    contract: 'SP000000000000000000002Q6VF78.vectors',
    functionName: 'exercise',
    functionArgs: [42, true, 'hello', encodeOptional('uint128', '42')],
    postConditions: [
      getPostCondition({
        postConditionType: 'stx-postcondition',
        postConditionConditionCode: 'eq',
        postConditionAddress: storedWallet.decoded.addresses.stx[0].address,
        postConditionAmount: BigInt(123),
      }),
    ],
    postConditionMode: 'deny',
  });
  await signMessage({ message: 'hé' });
  expect(await getAddresses()).toEqual([
    { symbol: 'STX', address: storedWallet.decoded.addresses.stx[0].address },
  ]);
  expect(
    provider.request.mock.calls.map(([method, params]: any[]) => [
      method,
      method === 'stx_callContract'
        ? {
            ...params,
            functionArgs: params.functionArgs.map((hex: string) => hex.replace(/^0x/, '')),
          }
        : params,
    ])
  ).toMatchSnapshot();
  delete (window as any).StacksProvider;
});
