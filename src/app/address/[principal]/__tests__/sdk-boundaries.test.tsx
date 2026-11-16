import { BNSV1_CONTRACT, BNSV2_CONTRACT } from '@/common/constants/constants';
import { createBehaviorWrapper } from '@/common/queries/test-utils/BehaviorProvider';
import { NetworkModes } from '@/common/types/network';
import { render, renderHook, screen, waitFor } from '@testing-library/react';

import { AddressIdPageDataProvider } from '../AddressIdPageContext';
import { TokenAssetListItem } from '../TokenBalanceCard/TokenAssetListItem';
import { useBnsNames } from '../TokenBalanceCard/useBnsNames';
import { NFTTable } from '../redesign/NFTTable';

const axios = require(require.resolve('axios', { paths: [require.resolve('bns-v2-sdk')] })).default;

const principal = 'SP000000000000000000002Q6VF78';
const contract = `${principal}.collectible`;
const maxHex = '0x01ffffffffffffffffffffffffffffffff';
const maxId = '340282366920938463463374607431768211455';
function response(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
afterEach(() => jest.restoreAllMocks());

it('carries decoded NFT IDs through metadata URLs, cache keys and Gamma links without changing digits', async () => {
  const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(async input => {
    const url = typeof input === 'string' ? input : (input as Request).url;
    return response(
      url.includes('/holdings')
        ? {
            results: [
              { asset_identifier: `${contract}::item`, value: { hex: maxHex, repr: `u${maxId}` } },
            ],
            total: 1,
          }
        : []
    );
  });
  const { wrapper, queryClient } = createBehaviorWrapper();
  render(
    <AddressIdPageDataProvider principal={principal} stxPrice={0} btcPrice={0}>
      <NFTTable />
    </AddressIdPageDataProvider>,
    { wrapper }
  );
  await waitFor(() =>
    expect(
      screen
        .getAllByRole('link')
        .some(
          link => link.getAttribute('href') === `https://gamma.io/stacks/nfts/${contract}_${maxId}`
        )
    ).toBe(true)
  );
  await waitFor(() =>
    expect(
      fetchMock.mock.calls.some(([input]) =>
        new URL((input as Request).url).searchParams
          .getAll('contract')
          .includes(`${contract}:${maxId}`)
      )
    ).toBe(true)
  );
  expect(
    queryClient
      .getQueryCache()
      .getAll()
      .map(q => q.queryKey)
  ).toContainEqual(['bulk-token-metadata', 'https://vectors.example', [`${contract}:${maxId}`]]);
});

it.each([
  ['0x010000000000000000000000000000002a', '42'],
  [maxHex, '3.402823669209385e%2B38'],
  ['0x00ffffffffffffffffffffffffffffffff', '-1'],
  ['0x0d0000000568656c6c6f', undefined],
  ['not-hex', undefined],
])('pins legacy NFT metadata ID decoding and request formatting %s', async (hex, urlId) => {
  const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(response({ metadata: {} }));
  const { wrapper, queryClient } = createBehaviorWrapper();
  render(
    <TokenAssetListItem
      amount="1"
      token={`${contract}::item`}
      tokenType="non_fungible_tokens"
      holdings={[{ value: { hex } }] as any}
    />,
    { wrapper }
  );
  if (urlId) {
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect((fetchMock.mock.calls[0][0] as Request).url).toBe(
      `https://vectors.example/metadata/v1/nft/${contract}/${urlId}`
    );
    expect(
      queryClient
        .getQueryCache()
        .getAll()
        .some(
          q =>
            q.queryKey[0] === 'nft-metadata' &&
            q.queryKey[2] === (hex === maxHex ? maxId : decodeURIComponent(urlId))
        )
    ).toBe(true);
  } else expect(fetchMock).not.toHaveBeenCalled();
});

it.each([NetworkModes.Mainnet, NetworkModes.Testnet])(
  'resolves decoded BNS v1/v2 holdings through %s API and shown names',
  async network => {
    const get = jest
      .spyOn(axios, 'get')
      .mockResolvedValue({ data: { name: 'alice', namespace: 'btc' } });
    const holdings = {
      results: [
        {
          asset_identifier: BNSV1_CONTRACT,
          value: {
            hex: '0x0c00000002046e616d650200000005616c696365096e616d6573706163650200000003627463',
          },
        },
        { asset_identifier: BNSV2_CONTRACT, value: { hex: maxHex } },
      ],
    } as any;
    const { result } = renderHook(() => useBnsNames(holdings, network));
    await waitFor(() =>
      expect(result.current.bnsNames[BNSV2_CONTRACT]).toEqual({ name: 'alice', namespace: 'btc' })
    );
    expect(result.current.bnsNames[BNSV1_CONTRACT]).toEqual({ name: 'alice', namespace: 'btc' });
    expect(get).toHaveBeenCalledWith(
      `https://api.bnsv2.com${network === 'testnet' ? '/testnet' : ''}/tokens/${maxId}/name`
    );
  }
);

it.each([NetworkModes.Mainnet, NetworkModes.Testnet])(
  'pins BNS SDK fallback argument bytes and decoded output on %s',
  async network => {
    jest.spyOn(axios, 'get').mockRejectedValue(new Error('offline'));
    jest.spyOn(global.crypto, 'getRandomValues').mockImplementation((array: any) => {
      array.fill(1);
      return array;
    });
    const fallback = require('@/common/utils/fixtures/stacks-behavior/bns-fallback.json');
    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(async (url, init) =>
      response({
        okay: true,
        result: String(url).includes('get-bns-from-id') ? fallback.byId : fallback.nameInfo,
      })
    );
    const { searchByBnsName } = require('@/common/queries/useSearchQuery');
    expect(await searchByBnsName(network, 'alice.btc')).toMatchSnapshot();
    const holdings = {
      results: [{ asset_identifier: BNSV2_CONTRACT, value: { hex: maxHex } }],
    } as any;
    const { result } = renderHook(() => useBnsNames(holdings, network));
    await waitFor(() => expect(result.current.bnsNames[BNSV2_CONTRACT]).toBeDefined());
    expect(result.current.bnsNames).toMatchSnapshot();
    expect(
      fetchMock.mock.calls.map(([url, init]) => ({ url, body: JSON.parse(init!.body as string) }))
    ).toMatchSnapshot();
  }
);

it.each(
  require('@/common/utils/fixtures/stacks-behavior/clarity.json') as {
    name: string;
    hex: string;
    repr: string;
  }[]
)(
  'NFT $name bytes produce stable links, metadata search URLs and cache keys',
  async ({ hex, repr }) => {
    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(async input => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      return response(
        url.includes('/holdings')
          ? { results: [{ asset_identifier: `${contract}::item`, value: { hex, repr } }], total: 1 }
          : []
      );
    });
    const { wrapper, queryClient } = createBehaviorWrapper();
    const { container } = render(
      <AddressIdPageDataProvider principal={principal} stxPrice={0} btcPrice={0}>
        <NFTTable />
      </AddressIdPageDataProvider>,
      { wrapper }
    );
    await waitFor(() => expect(container.querySelectorAll('a').length).toBeGreaterThan(0));
    await waitFor(() =>
      expect(
        queryClient
          .getQueryCache()
          .getAll()
          .filter(q => q.state.fetchStatus === 'fetching')
      ).toHaveLength(0)
    );
    expect({
      links: Array.from(container.querySelectorAll('a')).map(a => a.getAttribute('href')),
      urls: fetchMock.mock.calls.map(([input]) =>
        typeof input === 'string' ? input : (input as Request).url
      ),
      keys: queryClient
        .getQueryCache()
        .getAll()
        .map(q => q.queryKey),
    }).toMatchSnapshot();
  }
);

it('decoded principal values and token identifiers retain their Explorer link URLs', () => {
  const { AddressLink, TokenLink } = require('@/common/components/ExplorerLinks');
  const { formatClarityValue } = require('@/app/txid/[txId]/redesign/function-called/utils');
  const vectors = require('@/common/utils/fixtures/stacks-behavior/clarity.json');
  const { wrapper } = createBehaviorWrapper();
  for (const vector of vectors.filter((v: any) => ['principal', 'contract'].includes(v.name))) {
    const value = formatClarityValue({
      type: 'principal',
      repr: vector.repr,
      hex: vector.hex,
    }).value;
    const { container, unmount } = render(<AddressLink address={value}>principal</AddressLink>, {
      wrapper,
    });
    expect(container.querySelector('a')!.getAttribute('href')).toBe(
      `/address/${principal}${vector.name === 'contract' ? '.pox-4' : ''}?chain=mainnet`
    );
    unmount();
  }
  render(<TokenLink tokenId={`${contract}::item`}>token</TokenLink>, { wrapper });
  expect(screen.getByRole('link', { name: 'token' }).getAttribute('href')).toBe(
    `/token/${contract}%3A%3Aitem?chain=mainnet`
  );
});
