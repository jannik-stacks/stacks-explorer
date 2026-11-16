/** @jest-environment node */
import { stacksAPIFetch } from '@/api/stacksAPIFetch';
import { FEE_CONFIG } from '@/app/feeConfig';

import { fetchSampleTxsFeeEstimate } from '../fee-utils';

jest.mock('@/api/stacksAPIFetch');
const fetchMock = jest.mocked(stacksAPIFetch);
beforeEach(() => fetchMock.mockReset());

const responses = {
  defaults: { error: 'NoEstimateAvailable', reason: 'No fee estimate available' },
  low: {
    estimations: [
      { fee: 0, fee_rate: 0 },
      { fee: 1, fee_rate: 0.001 },
      { fee: 2, fee_rate: 0.002 },
    ],
    cost_scalar_change_by_byte: 1,
  },
  rounding: {
    estimations: [
      { fee: 2500.1, fee_rate: 12.345 },
      { fee: 4321.6, fee_rate: 23.456 },
      { fee: 9876.9, fee_rate: 34.567 },
    ],
    cost_scalar_change_by_byte: 1,
  },
  high: {
    estimations: [
      { fee: 9e8, fee_rate: 9e6 },
      { fee: 9e9, fee_rate: 9e7 },
      { fee: 9e10, fee_rate: 9e8 },
    ],
    cost_scalar_change_by_byte: 1,
  },
};
for (const chain of ['mainnet', 'testnet', 'devnet'] as const) {
  it.each(Object.entries(responses))(
    `pins ${chain} %s fees, sample payloads, lengths and averages`,
    async (_name, response) => {
      fetchMock.mockResolvedValue({ json: async () => response } as Response);
      const result = await fetchSampleTxsFeeEstimate(chain, 'https://custom.example:3999');
      expect(result).toMatchSnapshot();
      expect(
        fetchMock.mock.calls.map(([url, init]) => ({
          url,
          method: init?.method,
          body: JSON.parse(init!.body as string),
        }))
      ).toMatchSnapshot();
    }
  );
}

it('propagates transport errors', async () => {
  fetchMock.mockRejectedValue(new Error('offline'));
  await expect(fetchSampleTxsFeeEstimate('mainnet', 'https://custom.example')).rejects.toThrow(
    'offline'
  );
});

it.each([{}, { estimations: [] }])('rejects malformed fee responses %#', async response => {
  fetchMock.mockResolvedValue({ json: async () => response } as Response);
  await expect(fetchSampleTxsFeeEstimate('mainnet', 'https://custom.example')).rejects.toThrow();
});

it('reads the configured fallback for all sample transactions and their average', async () => {
  const previous = FEE_CONFIG.fallbackFeeEstimations;
  FEE_CONFIG.fallbackFeeEstimations = [321, 654, 987];
  try {
    fetchMock.mockResolvedValue({ json: async () => responses.defaults } as Response);
    const result = await fetchSampleTxsFeeEstimate('testnet', 'https://custom.example');
    for (const fees of Object.values(result)) {
      expect(fees).toEqual({
        no_priority: 0,
        low_priority: 321,
        medium_priority: 654,
        high_priority: 987,
      });
    }
  } finally {
    FEE_CONFIG.fallbackFeeEstimations = previous;
  }
});
