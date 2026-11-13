import { buildUrl } from '@/common/utils/buildUrl';
import { getConnectNetworkString } from '@/common/utils/network-utils';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useContext } from 'react';
import { CookiesProvider } from 'react-cookie';

import { GlobalContext, GlobalContextProvider } from '../GlobalContextProvider';

jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('chain=testnet&api=https://vectors.example'),
  usePathname: () => '/',
  useRouter: () => ({ replace: () => {} }),
}));
const storedNetwork = {
  label: 'Stored testnet',
  url: 'https://vectors.example',
  mode: 'testnet',
  networkId: 2147483648,
  isCustomNetwork: true,
  btcBlockBaseUrl: '',
  btcTxBaseUrl: '',
  btcAddressBaseUrl: '',
};
function Consumer() {
  const context = useContext(GlobalContext);
  return (
    <>
      <output
        data-mainnet={String(
          Object.values(context.networks).some(n => n.networkId === 1 && !n.isCustomNetwork)
        )}
      >
        {JSON.stringify({
          active: context.activeNetwork,
          url: buildUrl('/staking', context.activeNetwork),
          wallet: getConnectNetworkString(context.activeNetwork),
        })}
      </output>
      <button
        onClick={() =>
          context.addCustomNetwork({
            ...context.activeNetwork,
            label: 'Added',
            url: 'https://added.example',
          })
        }
      >
        Add
      </button>
      <button
        onClick={() =>
          context.removeCustomNetwork(
            Object.values(context.networks).find(n => n.networkId === 1 && !n.isCustomNetwork)!
          )
        }
      >
        Remove mainnet
      </button>
    </>
  );
}
it('restores stored chain IDs, wallet network and URLs and writes compatible network cookies', async () => {
  const { container } = render(
    <CookiesProvider>
      <GlobalContextProvider
        addedCustomNetworksCookie={JSON.stringify({ [storedNetwork.url]: storedNetwork })}
        removedCustomNetworksCookie="{}"
        tokenPrice={{ btcPrice: 0, stxPrice: 0 }}
      >
        <Consumer />
      </GlobalContextProvider>
    </CookiesProvider>
  );
  expect(JSON.parse(container.querySelector('output')!.textContent!)).toEqual({
    active: storedNetwork,
    url: '/staking?chain=testnet&api=https://vectors.example',
    wallet: 'testnet',
  });
  fireEvent.click(screen.getByRole('button', { name: 'Add' }));
  await waitFor(() => expect(document.cookie).toContain('addedCustomNetworks='));
  const value = document.cookie
    .split('; ')
    .find(item => item.startsWith('addedCustomNetworks='))!
    .split('=')
    .slice(1)
    .join('=');
  expect(JSON.parse(decodeURIComponent(value))).toEqual({
    [storedNetwork.url]: storedNetwork,
    'https://added.example': { ...storedNetwork, label: 'Added', url: 'https://added.example' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Remove mainnet' }));
  await waitFor(() => expect(document.cookie).toContain('removedCustomNetworks='));
  const removedRaw = document.cookie
    .split('; ')
    .find(item => item.startsWith('removedCustomNetworks='))!
    .split('=')
    .slice(1)
    .join('=');
  expect(Object.values(JSON.parse(decodeURIComponent(removedRaw)))[0]).toMatchObject({
    networkId: 1,
    mode: 'mainnet',
  });
  expect(container.querySelector('output')).toHaveAttribute('data-mainnet', 'false');
  document.cookie = 'addedCustomNetworks=; Max-Age=0; Path=/';
  document.cookie = 'removedCustomNetworks=; Max-Age=0; Path=/';
});

it('loads a legacy removed-networks cookie before presenting available networks', () => {
  const removed = JSON.stringify({ 'https://api.hiro.so': { networkId: 1, mode: 'mainnet' } });
  const { container } = render(
    <CookiesProvider>
      <GlobalContextProvider
        addedCustomNetworksCookie={JSON.stringify({ [storedNetwork.url]: storedNetwork })}
        removedCustomNetworksCookie={removed}
        tokenPrice={{ btcPrice: 0, stxPrice: 0 }}
      >
        <Consumer />
      </GlobalContextProvider>
    </CookiesProvider>
  );
  expect(container.querySelector('output')).toHaveAttribute('data-mainnet', 'false');
  expect(JSON.parse(container.querySelector('output')!.textContent!).active).toEqual(storedNetwork);
});

it('adds fetched custom chain IDs to network cookies through fetchCustomNetworkId', async () => {
  const fetchMock = jest
    .spyOn(global, 'fetch')
    .mockResolvedValue(new Response(JSON.stringify({ network_id: 2147483648 }), { status: 200 }));
  const { container } = render(
    <CookiesProvider>
      <GlobalContextProvider
        addedCustomNetworksCookie="{}"
        removedCustomNetworksCookie="{}"
        tokenPrice={{ btcPrice: 0, stxPrice: 0 }}
      >
        <Consumer />
      </GlobalContextProvider>
    </CookiesProvider>
  );
  await waitFor(() =>
    expect(JSON.parse(container.querySelector('output')!.textContent!).active).toMatchObject({
      url: storedNetwork.url,
      networkId: 2147483648,
      mode: 'testnet',
      isCustomNetwork: true,
    })
  );
  expect(fetchMock.mock.calls[0][0]).toBe('https://vectors.example/v2/info');
  const raw = document.cookie
    .split('; ')
    .find(item => item.startsWith('addedCustomNetworks='))!
    .slice('addedCustomNetworks='.length);
  expect(JSON.parse(decodeURIComponent(raw))[storedNetwork.url]).toMatchObject({
    networkId: 2147483648,
    mode: 'testnet',
  });
  fetchMock.mockRestore();
  document.cookie = 'addedCustomNetworks=; Max-Age=0; Path=/';
});
