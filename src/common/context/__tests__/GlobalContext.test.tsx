import { render, screen, waitFor } from '@testing-library/react';
import {
  usePathname as usePathnameActual,
  useRouter as useRouterActual,
  useSearchParams as useSearchParamsActual,
} from 'next/navigation';
import { useContext } from 'react';
import { CookiesProvider } from 'react-cookie';

import { fetchCustomNetworkId } from '../../components/modals/AddNetwork/utils';
import { TokenPrice } from '../../types/tokenPrice';
import { GlobalContext, GlobalContextProvider } from '../GlobalContextProvider';

jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

const useSearchParams = useSearchParamsActual as jest.MockedFunction<typeof useSearchParamsActual>;
const useRouter = useRouterActual as jest.MockedFunction<typeof useRouterActual>;
const usePathname = usePathnameActual as jest.MockedFunction<typeof usePathnameActual>;

jest.mock('@stacks/blockchain-api-client', () => ({
  connectWebSocketClient: jest.fn(),
  createClient: jest.fn(() => ({ use: jest.fn() })),
}));

jest.mock('../../components/modals/AddNetwork/utils', () => ({
  ...jest.requireActual('../../components/modals/AddNetwork/utils'),
  fetchCustomNetworkId: jest.fn(() => Promise.resolve('custom-network-id')),
}));

const customApiUrl = 'https://my-custom-api-url.com/something';

const mockTokenPrice: TokenPrice = {
  btcPrice: 50000,
  stxPrice: 2.5,
};

const GlobalContextTestComponent = () => {
  const { activeNetwork, networks } = useContext(GlobalContext);
  return (
    <div>
      <div>Global Context Test</div>
      <div data-testid="activeNetwork">{JSON.stringify(activeNetwork)}</div>
      <div data-testid="networks">{JSON.stringify(networks)}</div>
    </div>
  );
};

const getContextField = (fieldId: string) => {
  return JSON.parse(screen.getByTestId(fieldId).innerHTML);
};

describe('GlobalContext', () => {
  beforeEach(() => {
    useSearchParams.mockReset();
    useRouter.mockReset();
    usePathname.mockReset();

    useRouter.mockReturnValue({
      replace: jest.fn(),
      push: jest.fn(),
      pathname: '/',
      query: {},
    } as any);

    usePathname.mockReturnValue('/');
  });

  it('renders provider and children without error', () => {
    useSearchParams.mockReturnValue({
      get: (key: string) => {
        if (key === 'chain') return 'custom';
        return null;
      },
    } as any);
    render(
      <CookiesProvider>
        <GlobalContextProvider
          addedCustomNetworksCookie={''}
          removedCustomNetworksCookie={''}
          tokenPrice={mockTokenPrice}
        >
          <GlobalContextTestComponent />
        </GlobalContextProvider>
      </CookiesProvider>
    );

    expect(screen.getByText('Global Context Test')).toBeInTheDocument();
  });

  it('adds a custom network from a query string', async () => {
    useSearchParams.mockReturnValue({
      get: (key: string) => {
        if (key === 'chain') return 'custom';
        if (key === 'api') return customApiUrl;
        return null;
      },
    } as any);
    render(
      <CookiesProvider>
        <GlobalContextProvider
          addedCustomNetworksCookie={''}
          removedCustomNetworksCookie={''}
          tokenPrice={mockTokenPrice}
        >
          <GlobalContextTestComponent />
        </GlobalContextProvider>
      </CookiesProvider>
    );

    const networks = getContextField('networks');
    expect(Object.keys(networks).length).toBe(3);

    await waitFor(() => {
      expect(fetchCustomNetworkId).toHaveBeenCalledWith(customApiUrl, false);
    });

    await waitFor(() => {
      const updatedNetworks = getContextField('networks');
      expect(Object.keys(updatedNetworks).length).toBe(4);
      expect(updatedNetworks[customApiUrl].isCustomNetwork).toBe(true);
    });
  });

  it('loads an existing custom-network cookie and preserves built-in chain IDs', () => {
    useSearchParams.mockReturnValue({ get: () => null } as any);
    const storedNetwork = {
      label: 'Existing network',
      url: 'https://saved.example:3999',
      btcBlockBaseUrl: 'https://mempool.space/testnet/block/',
      btcTxBaseUrl: 'https://mempool.space/testnet/tx/',
      btcAddressBaseUrl: 'https://mempool.space/testnet/address/',
      networkId: 2147483648,
      mode: 'testnet',
      isCustomNetwork: true,
    };
    const cookie = JSON.stringify({ [storedNetwork.url]: storedNetwork });
    render(
      <CookiesProvider>
        <GlobalContextProvider
          addedCustomNetworksCookie={cookie}
          removedCustomNetworksCookie=""
          tokenPrice={mockTokenPrice}
        >
          <GlobalContextTestComponent />
        </GlobalContextProvider>
      </CookiesProvider>
    );
    const networks = getContextField('networks');
    expect(networks[storedNetwork.url]).toEqual(storedNetwork);
    expect(JSON.parse(JSON.stringify(networks))[storedNetwork.url]).toEqual(storedNetwork);
    expect(Object.values(networks)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Stacks Mainnet', networkId: 1, mode: 'mainnet' }),
        expect.objectContaining({
          label: 'Stacks Testnet (Primary)',
          networkId: 2147483648,
          mode: 'testnet',
        }),
      ])
    );
  });
});
