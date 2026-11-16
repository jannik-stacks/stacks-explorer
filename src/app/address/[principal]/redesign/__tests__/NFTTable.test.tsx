import { useBulkFtMetadata } from '@/common/queries/useBulkTokenMetadata';
import { useNftHoldings } from '@/common/queries/useNftHoldings';
import { renderWithChakraProviders } from '@/common/utils/test-utils/render-utils';
import { screen } from '@testing-library/react';

import { useImageContentType } from '../../TokenBalanceCard/useImageUrl';
import { CollectibleCard } from '../CollectibleCard';
import { NFTTable } from '../NFTTable';

jest.mock('../../AddressIdPageContext', () => ({
  useAddressIdPageData: () => ({ principal: 'SP000000000000000000002Q6VF78' }),
}));
jest.mock('@/common/queries/useNftHoldings');
jest.mock('@/common/queries/useBulkTokenMetadata');
jest.mock('../../TokenBalanceCard/useImageUrl');
jest.mock('../CollectibleCard', () => ({
  CollectibleCard: jest.fn(jest.requireActual('../CollectibleCard').CollectibleCard),
}));
jest.mock('@/common/components/ExplorerLinks', () => ({
  TxLink: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

const mockHoldings = jest.mocked(useNftHoldings);
const mockMetadata = jest.mocked(useBulkFtMetadata);
const mockImage = jest.mocked(useImageContentType);
const cardSpy = jest.mocked(CollectibleCard);
const contractId = 'SP000000000000000000002Q6VF78.collectibles';
const imageUrl = 'https://example.com/nft.png';

describe('NFTTable token identifiers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockImage.mockReturnValue({ url: undefined, contentType: 'image' });
  });

  it.each([
    ['0x02000000021234', '0x1234'],
    ['0x010000000000000000000000000000002a', BigInt(42)],
  ])('preserves the Explorer token ID for wire value %s', (hex, tokenId) => {
    mockHoldings.mockReturnValue({
      data: {
        total: 1,
        results: [{ asset_identifier: `${contractId}::collectible`, value: { hex } }],
      },
    } as ReturnType<typeof useNftHoldings>);
    mockMetadata.mockReturnValue({
      metadataMap: new Map([
        [`${contractId}:${tokenId}`, { metadata: { cached_image: imageUrl } }],
      ]),
    } as ReturnType<typeof useBulkFtMetadata>);

    renderWithChakraProviders(<NFTTable />);

    expect(cardSpy.mock.calls[0][0].tokenId).toBe(tokenId);
    expect(cardSpy.mock.calls[0][0].metadataImageUrl).toBe(imageUrl);
    expect(mockMetadata).toHaveBeenCalledWith([`${contractId}:${tokenId}`]);
    expect(mockImage).toHaveBeenCalledWith(imageUrl);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    links.forEach(link => {
      expect(link).toHaveAttribute('href', `https://gamma.io/stacks/nfts/${contractId}_${tokenId}`);
    });
  });
});
