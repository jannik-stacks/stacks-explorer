import { NetworkModes } from '@/common/types/network';

import { callReadOnlyFunction } from '../useCallReadOnlyFunction';

export async function serializeClarityValues(
  functionArgs: Parameters<typeof callReadOnlyFunction>[0]['functionArgs']
): Promise<string[]> {
  const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => ({ okay: true, result: '0x09' }),
  } as Response);
  try {
    await callReadOnlyFunction({
      senderAddress: 'SP000000000000000000002Q6VF78',
      contractAddress: 'SP000000000000000000002Q6VF78',
      contractName: 'vectors',
      functionName: 'serialize',
      functionArgs,
      network: {
        label: 'Vectors',
        url: 'https://vectors.example',
        mode: NetworkModes.Mainnet,
        networkId: 1,
        btcBlockBaseUrl: '',
        btcTxBaseUrl: '',
        btcAddressBaseUrl: '',
      },
    });
    return JSON.parse(fetchMock.mock.calls[0][1]!.body as string).arguments;
  } finally {
    fetchMock.mockRestore();
  }
}
