import { mainnetNetwork } from '@/common/constants/network';
import { useGlobalContext } from '@/common/context/useGlobalContext';
import { useAppDispatch, useAppSelector } from '@/common/state/hooks';
import { act, renderHook } from '@testing-library/react';

import { connect, disconnect, getLocalStorage, isConnected } from '@stacks/connect';

import { useUser } from '../hooks/useUser';
import { setUserData } from '../sandbox-slice';

jest.mock('@stacks/connect', () => ({
  connect: jest.fn(),
  disconnect: jest.fn(),
  getLocalStorage: jest.fn(),
  isConnected: jest.fn(),
}));
jest.mock('@/common/context/useGlobalContext');
jest.mock('@/common/state/hooks');
jest.mock('@/common/queries/useAccountBalance', () => ({ useAccountBalance: () => ({}) }));
jest.mock('@/common/queries/useAddressConfirmedTxsWithTransfersInfinite', () => ({
  useAddressConfirmedTxsWithTransfersInfinite: () => ({}),
}));
jest.mock('@/common/queries/useAddressMempoolTxsInfinite', () => ({
  useAddressMempoolTxsInfinite: () => ({}),
}));
jest.mock('@/common/hooks/useInfiniteQueryResult', () => ({ useInfiniteQueryResult: () => [] }));

const dispatch = jest.fn();
const address = 'SP000000000000000000002Q6VF78';
const networkKey = 'stacks-wallet-network-url';

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  jest.mocked(useAppDispatch).mockReturnValue(dispatch);
  jest.mocked(useAppSelector).mockReturnValue(undefined);
  jest
    .mocked(useGlobalContext)
    .mockReturnValue({ activeNetwork: mainnetNetwork } as ReturnType<typeof useGlobalContext>);
});

it('restores a stored wallet session after connecting and remounting, then disconnects', async () => {
  jest.mocked(isConnected).mockReturnValue(false);
  jest.mocked(connect).mockResolvedValue({
    addresses: [{ symbol: 'STX', address, publicKey: 'public-key' }],
  } as Awaited<ReturnType<typeof connect>>);
  const first = renderHook(() => useUser());
  await act(() => first.result.current.connect());
  expect(connect).toHaveBeenCalledTimes(1);
  expect(localStorage.getItem(networkKey)).toBe(mainnetNetwork.url);
  expect(dispatch).toHaveBeenCalledWith(
    setUserData({
      userData: { stxAddress: address, publicKey: 'public-key', networkUrl: mainnetNetwork.url },
    })
  );
  first.unmount();

  jest.mocked(isConnected).mockReturnValue(true);
  jest.mocked(getLocalStorage).mockReturnValue({
    addresses: { stx: [{ address }] },
  } as ReturnType<typeof getLocalStorage>);
  dispatch.mockClear();
  const restored = renderHook(() => useUser());
  expect(dispatch).toHaveBeenCalledWith(
    setUserData({
      userData: { stxAddress: address, publicKey: '', networkUrl: mainnetNetwork.url },
    })
  );
  act(() => restored.result.current.disconnect());
  expect(disconnect).toHaveBeenCalledTimes(1);
  expect(localStorage.getItem(networkKey)).toBeNull();
});

it('disconnects a stored session belonging to another network', () => {
  jest.mocked(isConnected).mockReturnValue(true);
  jest.mocked(getLocalStorage).mockReturnValue({
    addresses: { stx: [{ address }] },
  } as ReturnType<typeof getLocalStorage>);
  localStorage.setItem(networkKey, 'https://api.testnet.hiro.so');
  renderHook(() => useUser());
  expect(disconnect).toHaveBeenCalledTimes(1);
  expect(dispatch).not.toHaveBeenCalledWith(
    expect.objectContaining({ type: 'connect/setUserData' })
  );
});
