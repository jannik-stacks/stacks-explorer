import { BNSV1_CONTRACT, BNSV2_CONTRACT } from '@/common/constants/constants';
import { renderWithChakraProviders } from '@/common/utils/test-utils/render-utils';
import { renderHook, waitFor } from '@testing-library/react';
import { getBnsFromId } from 'bns-v2-sdk';

import { NftAvatar } from '../NftAvatar';
import { TokenAssetListItem } from '../TokenAssetListItem';
import { useBnsNames } from '../useBnsNames';

jest.mock('../NftAvatar', () => ({ NftAvatar: jest.fn(() => null) }));
jest.mock('bns-v2-sdk', () => ({ getBnsFromId: jest.fn() }));
jest.mock('@/common/components/TwoColumnsListItem', () => ({
  TwoColsListItem: ({ icon }: { icon: React.ReactNode }) => <>{icon}</>,
}));

beforeEach(() => jest.clearAllMocks());

it('passes the decoded integer NFT identifier to avatar metadata lookup', () => {
  renderWithChakraProviders(
    <TokenAssetListItem
      amount="1"
      token="SP000000000000000000002Q6VF78.collectibles::collectible"
      tokenType="non_fungible_tokens"
      holdings={
        [{ value: { hex: '0x010000000000000000000000000000002a' } }] as React.ComponentProps<
          typeof TokenAssetListItem
        >['holdings']
      }
    />
  );
  expect(jest.mocked(NftAvatar).mock.calls[0][0].firstNftValue).toBe(BigInt(42));
});

it('resolves captured BNS tuple bytes and integer IDs through the retained resolver', async () => {
  jest
    .mocked(getBnsFromId)
    .mockResolvedValue({ name: 'alice', namespace: 'btc' } as Awaited<
      ReturnType<typeof getBnsFromId>
    >);
  const holdings = {
    results: [
      {
        asset_identifier: BNSV1_CONTRACT,
        value: {
          hex: '0x0c00000002046e616d650200000005616c696365096e616d6573706163650200000003627463',
        },
      },
      {
        asset_identifier: BNSV2_CONTRACT,
        value: { hex: '0x010000000000000000000000000000002a' },
      },
    ],
  } as Parameters<typeof useBnsNames>[0];
  const { result } = renderHook(() => useBnsNames(holdings));
  await waitFor(() => {
    expect(result.current.bnsNames).toEqual({
      [BNSV1_CONTRACT]: { name: 'alice', namespace: 'btc' },
      [BNSV2_CONTRACT]: { name: 'alice', namespace: 'btc' },
    });
  });
  expect(getBnsFromId).toHaveBeenCalledWith({ id: BigInt(42), network: 'mainnet' });
});
