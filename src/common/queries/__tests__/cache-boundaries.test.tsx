import { encodeOptional, parseReadOnlyResponse } from '@/app/sandbox/utils';
import { NetworkModes } from '@/common/types/network';
import { QueryClient, dehydrate, hydrate } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';

import { behaviorNetwork, createBehaviorWrapper } from '../test-utils/BehaviorProvider';
import { useCallReadOnlyFunction } from '../useCallReadOnlyFunction';
import { useDataVarValue } from '../useDataVarValue';
import { useFeeEstimates } from '../useFeeEstimates';
import {
  getSearchPageUrl,
  searchByBnsName,
  updateRecentResultsLocalStorage,
  useRecentResultsLocalStorage,
} from '../useSearchQuery';

const axios = require(require.resolve('axios', { paths: [require.resolve('bns-v2-sdk')] })).default;

afterEach(() => {
  localStorage.clear();
  jest.restoreAllMocks();
});
it('keeps serialized read-only arguments in the query key and restores JSON cached results', async () => {
  jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
  jest
    .spyOn(global, 'fetch')
    .mockResolvedValue(
      new Response(JSON.stringify({ okay: true, result: '0x0703' }), { status: 200 })
    );
  const { wrapper, queryClient } = createBehaviorWrapper();
  const { result } = renderHook(
    () =>
      useCallReadOnlyFunction({
        contractId: 'SP000000000000000000002Q6VF78.vectors',
        fn: { name: 'read', access: 'read_only', args: [], outputs: { type: 'bool' } },
        readOnlyValue: [encodeOptional('uint128', '42')],
        stxAddress: 'SP000000000000000000002Q6VF78',
        stacksNetwork: behaviorNetwork,
      }),
    { wrapper }
  );
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  const key = [
    'readonly',
    'SP000000000000000000002Q6VF78.vectors',
    'read',
    ['0x0a010000000000000000000000000000002a'],
    'SP000000000000000000002Q6VF78',
    1,
  ];
  expect(queryClient.getQueryData(key)).toEqual({ okay: true, result: '0x0703' });
  const stored = JSON.stringify(dehydrate(queryClient));
  const restored = new QueryClient();
  hydrate(restored, JSON.parse(stored));
  expect(restored.getQueryData(key)).toEqual({ okay: true, result: '0x0703' });
  expect(parseReadOnlyResponse(restored.getQueryData(key) as any)).toBe('(ok true)');
});
it.each([NetworkModes.Mainnet, NetworkModes.Testnet])(
  'persists BNS owner results and restores their URL inputs on %s',
  async network => {
    const get = jest
      .spyOn(axios, 'get')
      .mockResolvedValue({ data: { data: { owner: 'SP000000000000000000002Q6VF78' } } });
    const found = await searchByBnsName(network, 'alice.btc');
    expect(get).toHaveBeenCalledWith(
      `https://api.bnsv2.com${network === 'testnet' ? '/testnet' : ''}/names/alice.btc`
    );
    expect(found).toEqual({
      found: true,
      result: {
        entity_id: 'SP000000000000000000002Q6VF78',
        entity_type: 'bns_address',
        display_name: 'alice.btc',
      },
    });
    updateRecentResultsLocalStorage(found as any);
    expect(localStorage.getItem('recentResults')).toBe(
      '[{"found":true,"result":{"entity_id":"SP000000000000000000002Q6VF78","entity_type":"bns_address","display_name":"alice.btc"}}]'
    );
    expect(useRecentResultsLocalStorage()).toEqual([found]);
    expect(getSearchPageUrl('alice.btc', { ...behaviorNetwork, mode: network })).toBe(
      `/search?chain=${network}`
    );
  }
);
it('loads existing recent-result JSON and treats malformed JSON as empty', () => {
  localStorage.setItem(
    'recentResults',
    '[{"found":true,"result":{"entity_id":"SP000000000000000000002Q6VF78","entity_type":"bns_address","display_name":"alice.btc"}}]'
  );
  expect(useRecentResultsLocalStorage()[0].result.entity_id).toBe('SP000000000000000000002Q6VF78');
  localStorage.setItem('recentResults', '{');
  expect(useRecentResultsLocalStorage()).toEqual([]);
});

it('loads a literal pre-migration query-cache record and shows its result', () => {
  const stored = require('@/common/utils/fixtures/stacks-behavior/stored-query-cache.json');
  const queryClient = new QueryClient();
  hydrate(queryClient, stored);
  const data = queryClient.getQueryData(stored.queries[0].queryKey);
  expect(data).toEqual({ okay: true, result: '0x0703' });
  expect(parseReadOnlyResponse(data as any)).toBe('(ok true)');
});

it.each([
  [
    'confirmed',
    '@/app/transactions/ConfirmedTxsSummaryTable',
    'ConfirmedTxsSummaryTable',
    {
      initialData: { results: [] },
      initialTypes: ['contract_call'],
      typeFilters: ['contract_call'],
    },
    ['confirmedTxSummariesInfinite', 1, 25, ['contract_call']],
  ],
  [
    'mempool',
    '@/app/mempool/MempoolTxsSummaryTable',
    'MempoolTxsSummaryTable',
    { initialData: { results: [] } },
    ['mempoolTxSummariesInfinite', 1, 25, [], 'receipt_time', 'desc'],
  ],
  [
    'confirmed page',
    '@/common/components/table/table-examples/TxSummaryTable',
    'TxSummaryTable',
    { initialData: { results: [] }, pageSize: 20, columnDefinitions: [] },
    ['confirmedTxSummaries', 1, 20],
  ],
  [
    'address page',
    '@/common/components/table/table-examples/AddressRecentTxsTable',
    'AddressRecentTxsTable',
    { initialData: { results: [] }, principal: 'SP000000000000000000002Q6VF78', pageSize: 3 },
    ['principalTxSummaries', 1, 'SP000000000000000000002Q6VF78', 3],
  ],
])(
  'seeds real summary table caches with the SDK chain ID: %s',
  (_name, modulePath, exported, props, key) => {
    const { render } = require('@testing-library/react');
    const React = require('react');
    const Component = require(modulePath as string)[exported as string];
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [],
          cursor: { next: null, previous: null, current: null },
          total: 0,
          limit: 20,
        }),
        { status: 200 }
      )
    );
    const { wrapper, queryClient } = createBehaviorWrapper();
    render(React.createElement(Component, props), { wrapper });
    expect(queryClient.getQueryData(key as any)).toEqual(
      String(key![0]).includes('Infinite')
        ? { pages: [(props as any).initialData], pageParams: [undefined] }
        : (props as any).initialData
    );
  }
);

it.each([
  [NetworkModes.Mainnet, 1, 'https://vectors.example'],
  [NetworkModes.Testnet, 2147483648, 'https://testnet.vectors.example'],
  [NetworkModes.Testnet, 2147483648, 'http://localhost:3999'],
])(
  'useFeeEstimates stores fetched fees under the mode-only cache key: %s %s %s',
  async (mode, networkId, url) => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockImplementation(
        async () =>
          new Response(
            JSON.stringify({ error: 'NoEstimateAvailable', reason: 'No fee estimate available' }),
            { status: 200 }
          )
      );
    const { wrapper, queryClient } = createBehaviorWrapper({
      ...behaviorNetwork,
      mode: mode as NetworkModes,
      networkId: networkId as number,
      url: url as string,
    });
    const { result } = renderHook(() => useFeeEstimates(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(
      queryClient
        .getQueryCache()
        .getAll()
        .map(query => query.queryKey)
    ).toEqual([['feeEstimates', mode]]);
    expect(queryClient.getQueryData(['feeEstimates', mode])).toEqual(result.current.data);
    expect(result.current.data).toBeDefined();
  }
);

it('useDataVarValue keys cached wire values by contract, variable, chain ID and API URL', async () => {
  const value = { data: '0x010000000000000000000000000000002a' };
  const fetchMock = jest
    .spyOn(global, 'fetch')
    .mockImplementation(async () => new Response(JSON.stringify(value), { status: 200 }));
  const { wrapper, queryClient } = createBehaviorWrapper();
  const contractId = 'SP000000000000000000002Q6VF78.vectors';
  const initialProps = { contractId, varName: 'counter', network: behaviorNetwork, enabled: true };
  const variants = [
    initialProps,
    { ...initialProps, contractId: 'SP000000000000000000002Q6VF78.other' },
    { ...initialProps, varName: 'total' },
    { ...initialProps, network: { ...behaviorNetwork, networkId: 2147483648 } },
    { ...initialProps, network: { ...behaviorNetwork, url: 'https://custom.vectors.example' } },
  ];
  for (const props of variants) {
    const { result } = renderHook(() => useDataVarValue(props), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  }
  const keys = [
    ['dataVar', contractId, 'counter', 1, 'https://vectors.example'],
    ['dataVar', 'SP000000000000000000002Q6VF78.other', 'counter', 1, 'https://vectors.example'],
    ['dataVar', contractId, 'total', 1, 'https://vectors.example'],
    ['dataVar', contractId, 'counter', 2147483648, 'https://vectors.example'],
    ['dataVar', contractId, 'counter', 1, 'https://custom.vectors.example'],
  ];
  expect(
    queryClient
      .getQueryCache()
      .getAll()
      .map(query => query.queryKey)
  ).toEqual(keys);
  for (const key of keys) expect(queryClient.getQueryData(key)).toEqual(value);
  expect(fetchMock).toHaveBeenCalledTimes(5);
});
