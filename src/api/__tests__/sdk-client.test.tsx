import { useMetadataApi } from '@/common/api/useApi';
import { RELEASE_TAG_NAME } from '@/common/constants/env';
import { createBehaviorWrapper } from '@/common/queries/test-utils/BehaviorProvider';
import { renderHook } from '@testing-library/react';

import packageJson from '../../../package.json';
import { callApiWithErrorHandling } from '../callApiWithErrorHandling';
import { getApiClient } from '../getApiClient';

afterEach(() => jest.restoreAllMocks());
it('retained blockchain client sends encoded URLs, headers and unchanged response JSON', async () => {
  const data = {
    tx_id: '0xabc',
    contract_call: {
      function_args: [
        {
          hex: '0x01ffffffffffffffffffffffffffffffff',
          repr: 'u340282366920938463463374607431768211455',
        },
      ],
    },
  };
  const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  );
  const client = getApiClient('https://vectors.example/custom');
  await expect(
    callApiWithErrorHandling(client, '/extended/v1/tx/{tx_id}', {
      params: { path: { tx_id: '0xabc' } },
    })
  ).resolves.toEqual(data);
  const request = fetchMock.mock.calls[0][0] as Request;
  expect(request.url).toBe('https://vectors.example/custom/extended/v1/tx/0xabc');
  expect(request.method).toBe('GET');
  expect(request.headers.get('x-hiro-product')).toBe('explorer');
  expect(request.headers.get('x-hiro-version')).toBe(RELEASE_TAG_NAME || packageJson.version);
});
it('retained metadata client encodes NFT path values and retains JSON values', async () => {
  const data = { token_id: '340282366920938463463374607431768211455', metadata: { name: 'hé' } };
  const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  );
  const { result } = renderHook(() => useMetadataApi(), {
    wrapper: createBehaviorWrapper().wrapper,
  });
  const response = await result.current.GET('/metadata/v1/nft/{principal}/{token_id}', {
    params: { path: { principal: 'SP000000000000000000002Q6VF78.nft', token_id: 42 } },
  });
  expect(response.data).toEqual(data);
  expect((fetchMock.mock.calls[0][0] as Request).url).toBe(
    'https://vectors.example/metadata/v1/nft/SP000000000000000000002Q6VF78.nft/42'
  );
});

it('retained WebSocket client preserves its URL, RPC bytes and block payload', async () => {
  const { act, waitFor } = require('@testing-library/react');
  const {
    useStacksApiSocketClient,
  } = require('@/app/_components/BlockList/Sockets/use-stacks-api-socket-client');
  const sockets: any[] = [];
  const oldSocket = global.WebSocket;
  class Socket {
    url: string;
    onopen?: () => void;
    listeners: ((event: { data: string }) => void)[] = [];
    sent: string[] = [];
    close = jest.fn();
    constructor(url: string) {
      this.url = url;
      sockets.push(this);
      queueMicrotask(() => this.onopen?.());
    }
    addEventListener(_name: string, handler: (event: { data: string }) => void) {
      this.listeners.push(handler);
    }
    send(data: string) {
      this.sent.push(data);
      const request = JSON.parse(data);
      queueMicrotask(() => this.receive({ jsonrpc: '2.0', id: request.id, result: true }));
    }
    receive(data: unknown) {
      this.listeners.forEach(fn => fn({ data: JSON.stringify(data) }));
    }
  }
  global.WebSocket = Socket as any;
  try {
    const { result } = renderHook(() => useStacksApiSocketClient('https://vectors.example'));
    let subscription: { unsubscribe(): Promise<void> } | undefined;
    const received = jest.fn();
    await act(async () => {
      await result.current.connect(async (client: any) => {
        subscription = await client.subscribeBlocks(received);
      });
    });
    await waitFor(() => expect(subscription).toBeDefined());
    expect(sockets[0].url).toBe('wss://vectors.example/extended/v1/ws');
    expect(sockets[0].sent).toEqual([
      '{"jsonrpc":"2.0","id":1,"method":"subscribe","params":{"event":"block"}}',
    ]);
    sockets[0].receive({ jsonrpc: '2.0', method: 'block', params: { hash: '0xabc', height: 42 } });
    expect(received).toHaveBeenCalledWith({ hash: '0xabc', height: 42 });
    await subscription!.unsubscribe();
    expect(sockets[0].sent[1]).toBe(
      '{"jsonrpc":"2.0","id":2,"method":"unsubscribe","params":{"event":"block"}}'
    );
    act(() => result.current.disconnect());
    expect(sockets[0].close).toHaveBeenCalled();
  } finally {
    global.WebSocket = oldSocket;
  }
});

it.each(['stx', 'sbtc'])(
  'retained %s faucet serializes a restored wallet address and keeps response bytes',
  async token => {
    const { act } = require('@testing-library/react');
    const useFaucet =
      token === 'stx'
        ? require('@/common/queries/useFaucet').useFaucet
        : require('@/common/queries/useSbtcFaucet').useSbtcFaucet;
    const address = 'SP000000000000000000002Q6VF78';
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ txId: '0xabc', txRaw: 'deadbeef' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const { result } = renderHook(() => useFaucet(), { wrapper: createBehaviorWrapper().wrapper });
    let output;
    await act(async () => {
      output = await result.current.mutateAsync({
        address,
        ...(token === 'stx' ? { stacking: true } : {}),
      });
    });
    expect(output).toEqual({ txId: '0xabc', txRaw: 'deadbeef' });
    const request = fetchMock.mock.calls[0][0] as Request;
    expect({
      url: request.url,
      method: request.method,
      contentType: request.headers.get('Content-Type'),
      body: await request.text(),
    }).toMatchSnapshot();
  }
);

const retainedRoutes = Array.from(
  new Set(
    (
      require('../../../docs/behavior/stacks-inventory.json').boundaries as {
        file: string;
        line: number;
        route?: string;
      }[]
    )
      .map(site => site.route)
      .filter((route): route is string => !!route)
  )
);
it.each(retainedRoutes)('retained route wire contract %s', async route => {
  const data = { vector: 'unchanged', integer: '340282366920938463463374607431768211455' };
  const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  );
  const client = route.startsWith('/metadata')
    ? renderHook(() => useMetadataApi(), { wrapper: createBehaviorWrapper().wrapper }).result
        .current
    : getApiClient('https://vectors.example');
  const path = Object.fromEntries(
    Array.from(route.matchAll(/\{([^}]+)\}/g)).map(([, key]) => [
      key,
      key === 'token_id'
        ? 42
        : key.includes('principal') || key.includes('address')
          ? 'SP000000000000000000002Q6VF78.vectors'
          : '0xabc',
    ])
  );
  const result = await (client.GET as any)(route, {
    params: { path, query: { limit: 2, cursor: 'next+/=', type: ['coinbase', 'contract_call'] } },
  });
  const request = fetchMock.mock.calls[0][0] as Request;
  expect({
    url: request.url,
    method: request.method,
    body: await request.text(),
    data: result.data,
  }).toMatchSnapshot();
});
