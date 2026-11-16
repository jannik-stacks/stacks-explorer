import { getApiClient } from '@/api/getApiClient';
import { GlobalContext } from '@/common/context/GlobalContextProvider';
import { makeStore } from '@/common/state/store';
import { NetworkModes } from '@/common/types/network';
import { system } from '@/ui/theme/theme';
import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { TextDecoder, TextEncoder } from 'util';

Object.assign(global, {
  TextEncoder,
  TextDecoder,
  Uint8Array: Object.getPrototypeOf(Buffer.prototype).constructor,
});
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

global.IntersectionObserver = class {
  root = null;
  rootMargin = '';
  thresholds = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
};

export const behaviorNetwork = {
  label: 'Vector network',
  url: 'https://vectors.example',
  mode: NetworkModes.Mainnet,
  networkId: 1,
  btcBlockBaseUrl: '',
  btcTxBaseUrl: '',
  btcAddressBaseUrl: '',
};

export function createBehaviorWrapper(network = behaviorNetwork) {
  const store = makeStore();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const apiClient = getApiClient(network.url);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <GlobalContext.Provider
          value={{
            activeNetwork: network,
            activeNetworkKey: network.url,
            networks: {},
            addCustomNetwork: () => {},
            removeCustomNetwork: () => {},
            stacksApiSocketClientInfo: null,
            apiClient,
            tokenPrice: { btcPrice: 0, stxPrice: 0 },
          }}
        >
          <ChakraProvider value={system}>{children}</ChakraProvider>
        </GlobalContext.Provider>
      </QueryClientProvider>
    </Provider>
  );
  return { wrapper, store, queryClient };
}
