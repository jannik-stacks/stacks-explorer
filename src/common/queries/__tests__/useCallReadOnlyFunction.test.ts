/** @jest-environment node */
import { encodeOptional, encodeTuple } from '@/app/sandbox/utils';
import { NetworkModes } from '@/common/types/network';

import { callReadOnlyFunction } from '../useCallReadOnlyFunction';

const fetchMock = jest.spyOn(global, 'fetch');
afterEach(() => fetchMock.mockReset());
afterAll(() => fetchMock.mockRestore());
const options = {
  senderAddress: 'SP000000000000000000002Q6VF78',
  contractAddress: 'SP000000000000000000002Q6VF78',
  contractName: 'hello',
  functionName: 'get-value?',
  functionArgs: [
    encodeOptional('uint128', '42'),
    encodeTuple([{ name: 'flag', type: 'bool' }], { flag: 'true' }),
  ],
  network: {
    label: 'Custom',
    url: 'https://custom.example:3999',
    networkId: 2147483648,
    mode: NetworkModes.Testnet,
    btcBlockBaseUrl: '',
    btcTxBaseUrl: '',
    btcAddressBaseUrl: '',
  },
};
it('serializes arguments in order, escapes the function name and preserves the response', async () => {
  const response = { okay: true, result: '0x0703' };
  fetchMock.mockResolvedValue({ ok: true, json: async () => response } as Response);
  await expect(callReadOnlyFunction(options)).resolves.toEqual(response);
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe(
    'https://custom.example:3999/v2/contracts/call-read/SP000000000000000000002Q6VF78/hello/get-value%3F'
  );
  expect(init?.method).toBe('POST');
  expect(init?.body).toBe(
    '{"sender":"SP000000000000000000002Q6VF78","arguments":["0x0a010000000000000000000000000000002a","0x0c0000000104666c616703"]}'
  );
  expect(init?.headers).toEqual(expect.objectContaining({ 'Content-Type': 'application/json' }));
});
it.each([
  ['read failed', 'read failed'],
  ['', 'Request failed with status 500'],
])('reports HTTP failure %s', async (text, expected) => {
  fetchMock.mockResolvedValue({ ok: false, status: 500, text: async () => text } as Response);
  await expect(callReadOnlyFunction(options)).rejects.toThrow(expected);
});
it('propagates transport failures', async () => {
  fetchMock.mockRejectedValue(new Error('offline'));
  await expect(callReadOnlyFunction(options)).rejects.toThrow('offline');
});
