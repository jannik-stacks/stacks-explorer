/** @jest-environment node */
import { fetchBnsAddress, fetchBnsHistory, parseBnsAddressFromBnsNftHistory } from '../bns-queries';

const fetchMock = jest.spyOn(global, 'fetch');
afterEach(() => fetchMock.mockReset());
afterAll(() => fetchMock.mockRestore());

it.each(['alice.btc', 'hé.btc', 'alice', '.btc'])('pins BNS argument bytes for %s', async name => {
  fetchMock.mockResolvedValue({ json: async () => ({ results: [] }) } as Response);
  await expect(fetchBnsHistory('https://custom.example', name)).resolves.toEqual({ results: [] });
  expect(fetchMock.mock.calls).toMatchSnapshot();
});

it('returns the latest recipient and handles missing or failed history', async () => {
  fetchMock.mockResolvedValue({
    json: async () => ({ results: [{ recipient: 'SP-latest' }, { recipient: 'SP-old' }] }),
  } as Response);
  await expect(fetchBnsAddress('https://custom.example', 'alice.btc')).resolves.toBe('SP-latest');
  expect(parseBnsAddressFromBnsNftHistory([])).toBeNull();
  fetchMock.mockResolvedValue({ json: async () => ({ results: [] }) } as Response);
  await expect(fetchBnsAddress('https://custom.example', 'alice.btc')).resolves.toBeNull();
  fetchMock.mockRejectedValue(new Error('offline'));
  await expect(fetchBnsAddress('https://custom.example', 'alice.btc')).resolves.toBeNull();
});
