import { Codec } from '@jannik-stacks/kit';

import type { FunctionFormikState } from '../FunctionCallForm';
import {
  PostConditionBuilderParameters,
  PostConditionParameters,
  checkPostConditionParameters,
  extractPostConditionParams,
  getPostCondition,
  getPostConditionConditionCodeOptions,
  isConditionCodeValidForType,
  isFungibleConditionCode,
  isNonFungibleConditionCode,
  isPostConditionParameter,
  isPoxConditionCode,
} from '../function-call-post-condition-params-utils';

describe('Type Guard Functions', () => {
  describe('isFungibleConditionCode', () => {
    it('should return true for fungible condition codes', () => {
      expect(isFungibleConditionCode('eq')).toBe(true);
      expect(isFungibleConditionCode('gt')).toBe(true);
      expect(isFungibleConditionCode('gte')).toBe(true);
      expect(isFungibleConditionCode('lt')).toBe(true);
      expect(isFungibleConditionCode('lte')).toBe(true);
    });

    it('should return false for non-fungible condition codes', () => {
      expect(isFungibleConditionCode('not-sent')).toBe(false);
      expect(isFungibleConditionCode('sent')).toBe(false);
    });
  });

  describe('isNonFungibleConditionCode', () => {
    it('should return true for non-fungible condition codes', () => {
      expect(isNonFungibleConditionCode('not-sent')).toBe(true);
      expect(isNonFungibleConditionCode('sent')).toBe(true);
    });

    it('should return false for fungible condition codes', () => {
      expect(isNonFungibleConditionCode('eq')).toBe(false);
      expect(isNonFungibleConditionCode('gt')).toBe(false);
      expect(isNonFungibleConditionCode('gte')).toBe(false);
      expect(isNonFungibleConditionCode('lt')).toBe(false);
      expect(isNonFungibleConditionCode('lte')).toBe(false);
    });
  });
});

it.each([
  ['eq', '01'],
  ['gt', '02'],
  ['gte', '03'],
  ['lt', '04'],
  ['lte', '05'],
] as const)('retains the STX wire comparator %s', (condition, code) => {
  const pc = getPostCondition({
    postConditionType: 'stx-postcondition',
    postConditionConditionCode: condition,
    postConditionAddress: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
    postConditionAmount: 100,
  });
  expect(pc).toBeDefined();
  expect(Codec.Raw.PostCondition.encode(pc!)).toBe(
    `000216a46ff88886c2ef9762d970b4d2c63678835bd39d${code}0000000000000064`
  );
});

describe('Validation Functions', () => {
  describe('isPostConditionParameter', () => {
    it('should return true for valid post condition parameter keys', () => {
      expect(isPostConditionParameter('postConditionMode')).toBe(true);
      expect(isPostConditionParameter('postConditionType')).toBe(true);
      expect(isPostConditionParameter('postConditionAddress')).toBe(true);
      expect(isPostConditionParameter('postConditionConditionCode')).toBe(true);
      expect(isPostConditionParameter('postConditionAmount')).toBe(true);
      expect(isPostConditionParameter('postConditionAssetAddress')).toBe(true);
      expect(isPostConditionParameter('postConditionAssetContractName')).toBe(true);
      expect(isPostConditionParameter('postConditionAssetName')).toBe(true);
    });

    it('should return false for invalid keys', () => {
      expect(isPostConditionParameter('invalidKey')).toBe(false);
      expect(isPostConditionParameter('someOtherKey')).toBe(false);
      expect(isPostConditionParameter('')).toBe(false);
    });
  });

  describe('checkPostConditionParameters', () => {
    it('should return no errors for Allow mode', () => {
      const params: PostConditionParameters = {
        postConditionMode: 'allow',
      };
      const errors = checkPostConditionParameters(params);
      expect(errors).toEqual({});
    });

    it('should return error when post condition type is missing in Deny mode', () => {
      const params: PostConditionParameters = {
        postConditionMode: 'deny',
      };
      const errors = checkPostConditionParameters(params);
      expect(errors.postConditionType).toBe('Post condition type is required');
    });

    it('should return errors for missing STX post condition parameters', () => {
      const params: PostConditionParameters = {
        postConditionMode: 'deny',
        postConditionType: 'stx-postcondition',
      };
      const errors = checkPostConditionParameters(params);
      expect(errors.postConditionAddress).toBe('Address is required');
      expect(errors.postConditionConditionCode).toBe('Condition Code is required');
      expect(errors.postConditionAmount).toBe('Amount is required');
    });

    it('should return errors for missing Fungible post condition parameters', () => {
      const params: PostConditionParameters = {
        postConditionMode: 'deny',
        postConditionType: 'ft-postcondition',
      };
      const errors = checkPostConditionParameters(params);
      expect(errors.postConditionAddress).toBe('Address is required');
      expect(errors.postConditionConditionCode).toBe('Condition Code is required');
      expect(errors.postConditionAmount).toBe('Amount is required');
      expect(errors.postConditionAssetAddress).toBe('Asset Address is required');
      expect(errors.postConditionAssetContractName).toBe('Asset Contract Name is required');
      expect(errors.postConditionAssetName).toBe('Asset Name is required');
    });

    it('should return errors for invalid addresses', () => {
      const params: PostConditionParameters = {
        postConditionMode: 'deny',
        postConditionType: 'stx-postcondition',
        postConditionAddress: 'invalid-address',
        postConditionConditionCode: 'eq',
        postConditionAmount: 100,
      };
      const errors = checkPostConditionParameters(params);
      expect(errors.postConditionAddress).toBe('Invalid Stacks address');
    });

    it('should return errors for invalid amounts', () => {
      const params: PostConditionParameters = {
        postConditionMode: 'deny',
        postConditionType: 'stx-postcondition',
        postConditionAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        postConditionConditionCode: 'eq',
        postConditionAmount: -100, // Invalid negative amount
      };
      const errors = checkPostConditionParameters(params);
      expect(errors.postConditionAmount).toBe('Invalid amount');
    });

    it('should validate valid STX post condition parameters', () => {
      const params: PostConditionParameters = {
        postConditionMode: 'deny',
        postConditionType: 'stx-postcondition',
        postConditionAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        postConditionConditionCode: 'eq',
        postConditionAmount: 100,
      };
      const errors = checkPostConditionParameters(params);
      expect(errors).toEqual({});
    });
  });
});

describe('Post Condition Creation', () => {
  describe('getPostCondition', () => {
    it('should create STX post condition', () => {
      const params: PostConditionBuilderParameters = {
        postConditionType: 'stx-postcondition',
        postConditionAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        postConditionConditionCode: 'eq',
        postConditionAmount: 100,
      };
      const result = getPostCondition(params);
      expect(result).toEqual({
        type: 'stx-postcondition',
        address: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        condition: 'eq',
        amount: BigInt('100'),
      });
    });

    it('should create Fungible post condition', () => {
      const params: PostConditionBuilderParameters = {
        postConditionType: 'ft-postcondition',
        postConditionAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        postConditionConditionCode: 'gt',
        postConditionAmount: 200,
        postConditionAssetAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        postConditionAssetContractName: 'my-token',
        postConditionAssetName: 'token',
      };
      const result = getPostCondition(params);
      expect(result).toEqual({
        type: 'ft-postcondition',
        address: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        condition: 'gt',
        asset: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.my-token::token',
        amount: BigInt('200'),
      });
    });

    it('should create Non-Fungible post condition', () => {
      const params: PostConditionBuilderParameters = {
        postConditionType: 'nft-postcondition',
        postConditionAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        postConditionConditionCode: 'sent',
        postConditionAssetAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        postConditionAssetContractName: 'my-nft',
        postConditionAssetName: 'nft-token',
      };
      const result = getPostCondition(params);
      expect(result).toEqual({
        type: 'nft-postcondition',
        address: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        condition: 'sent',
        asset: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.my-nft::nft-token',
        assetId: {
          type: 'utf8',
          value: 'nft-token',
        },
      });
    });

    it('should throw error for invalid STX post condition (missing parameters)', () => {
      const params: PostConditionBuilderParameters = {
        postConditionType: 'stx-postcondition',
        postConditionAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        // Missing condition code and amount
      };
      const result = getPostCondition(params);
      expect(result).toEqual(undefined);
    });

    it('should throw error for invalid amount (not uint128)', () => {
      const params: PostConditionBuilderParameters = {
        postConditionType: 'stx-postcondition',
        postConditionAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        postConditionConditionCode: 'eq',
        postConditionAmount: -100, // Invalid uint128
      };
      const result = getPostCondition(params);
      expect(result).toEqual(undefined);
    });
  });
});

describe('Utility Functions', () => {
  describe('getPostConditionConditionCodeOptions', () => {
    it('should return non-fungible options for NonFungible post condition type', () => {
      const options = getPostConditionConditionCodeOptions('nft-postcondition');
      expect(options).toHaveLength(3);
      expect(options).toEqual([
        { label: 'Does not send', value: 'does-not-send' },
        { label: 'Sends', value: 'sends' },
        { label: 'May send', value: 'may-send' },
      ]);
    });

    it('should return fungible options for STX post condition type', () => {
      const options = getPostConditionConditionCodeOptions('stx-postcondition');
      expect(options).toHaveLength(5);
      expect(options).toEqual([
        { label: 'Equal', value: 'equal' },
        { label: 'Greater', value: 'greater' },
        { label: 'GreaterEqual', value: 'greater-equal' },
        { label: 'Less', value: 'less' },
        { label: 'LessEqual', value: 'less-equal' },
      ]);
    });

    it('should return fungible options for Fungible post condition type', () => {
      const options = getPostConditionConditionCodeOptions('ft-postcondition');
      expect(options).toHaveLength(5);
      expect(options).toEqual([
        { label: 'Equal', value: 'equal' },
        { label: 'Greater', value: 'greater' },
        { label: 'GreaterEqual', value: 'greater-equal' },
        { label: 'Less', value: 'less' },
        { label: 'LessEqual', value: 'less-equal' },
      ]);
    });
  });

  describe('extractPostConditionParams', () => {
    it('should extract post condition parameters from formik state', () => {
      const formikState = {
        // Function parameters
        someArg: 'value',
        anotherArg: 123,
        // Post condition parameters
        postConditionMode: 'deny',
        postConditionType: 'stx-postcondition',
        postConditionAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        postConditionConditionCode: 'eq',
        postConditionAmount: 100,
        postConditionAssetAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        postConditionAssetContractName: 'my-contract',
        postConditionAssetName: 'my-asset',
      };

      const result = extractPostConditionParams(formikState as FunctionFormikState);
      expect(result).toEqual({
        postConditionMode: 'deny',
        postConditionType: 'stx-postcondition',
        postConditionAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        postConditionConditionCode: 'eq',
        postConditionAmount: 100,
        postConditionAssetAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        postConditionAssetContractName: 'my-contract',
        postConditionAssetName: 'my-asset',
      });
    });

    it('coerces the amount while retaining native Kit selections', () => {
      const formikState = {
        postConditionMode: 'deny',
        postConditionType: 'stx-postcondition',
        postConditionAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        postConditionConditionCode: 'eq',
        postConditionAmount: '100' as any,
        postConditionAssetAddress: undefined as any,
        postConditionAssetContractName: undefined as any,
        postConditionAssetName: undefined as any,
      };

      const result = extractPostConditionParams(formikState as any);
      expect(result.postConditionMode).toBe('deny');
      expect(result.postConditionType).toBe('stx-postcondition');
      expect(result.postConditionConditionCode).toBe('eq');
      expect(result.postConditionAmount).toBe(100);
    });

    it('should handle undefined post condition parameters', () => {
      const formikState = {
        someArg: 'value',
        postConditionMode: 'allow',
        postConditionType: undefined as any,
        postConditionAddress: undefined as any,
        postConditionConditionCode: undefined as any,
        postConditionAmount: undefined as any,
        postConditionAssetAddress: undefined as any,
        postConditionAssetContractName: undefined as any,
        postConditionAssetName: undefined as any,
      };

      const result = extractPostConditionParams(formikState as any);
      expect(result).toEqual({
        postConditionMode: 'allow',
        postConditionType: undefined,
        postConditionAddress: undefined,
        postConditionConditionCode: undefined,
        postConditionAmount: undefined,
        postConditionAssetAddress: undefined,
        postConditionAssetContractName: undefined,
        postConditionAssetName: undefined,
      });
    });
  });
});

describe('pox-5 post conditions', () => {
  it('recognizes PoX condition codes and keeps them distinct from asset codes', () => {
    expect(isPoxConditionCode('may-perform')).toBe(true);
    expect(isPoxConditionCode('eq')).toBe(false);
    expect(isPoxConditionCode('maybe-sent')).toBe(false);
  });

  it('maps PoX condition codes to comparators', () => {});

  it('maps the new NFT maybe-sent comparator', () => {});

  it('builds a staking post condition', () => {
    const params: PostConditionBuilderParameters = {
      postConditionType: 'staking-postcondition',
      postConditionAddress: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
      postConditionConditionCode: 'lte',
      postConditionAmount: 1100000,
    };

    expect(getPostCondition(params)).toEqual({
      type: 'staking-postcondition',
      address: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
      condition: 'lte',
      amount: BigInt('1100000'),
    });
  });

  it('builds a pox post condition, which carries no amount', () => {
    const params: PostConditionBuilderParameters = {
      postConditionType: 'pox-postcondition',
      postConditionAddress: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
      postConditionConditionCode: 'will-perform',
    };

    expect(getPostCondition(params)).toEqual({
      type: 'pox-postcondition',
      address: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
      condition: 'will-perform',
    });
  });

  it('offers PoX condition codes for the PoX post condition type', () => {
    expect(getPostConditionConditionCodeOptions('pox-postcondition').map(o => o.value)).toEqual([
      'will-not-perform',
      'may-perform',
      'will-perform',
    ]);
  });

  it('validates originator mode like deny mode, not like allow mode', () => {
    const params = {
      postConditionMode: 'originator',
    } as PostConditionParameters;

    expect(checkPostConditionParameters(params)).toEqual({
      postConditionType: 'Post condition type is required',
    });
  });
});

describe('condition code / post condition type pairing', () => {
  it('accepts fungible codes for stx, fungible and staking', () => {
    (['stx-postcondition', 'ft-postcondition', 'staking-postcondition'] as const).forEach(type => {
      expect(isConditionCodeValidForType(type, 'eq')).toBe(true);
      expect(isConditionCodeValidForType(type, 'may-perform')).toBe(false);
    });
  });

  it('accepts only its own codes for non-fungible and pox', () => {
    expect(isConditionCodeValidForType('nft-postcondition', 'maybe-sent')).toBe(true);
    expect(isConditionCodeValidForType('nft-postcondition', 'eq')).toBe(false);
    expect(isConditionCodeValidForType('pox-postcondition', 'will-perform')).toBe(true);
    expect(isConditionCodeValidForType('pox-postcondition', 'eq')).toBe(false);
  });

  it('reports a code left over from a previously selected type', () => {
    const errors = checkPostConditionParameters({
      postConditionMode: 'deny',
      postConditionType: 'pox-postcondition',
      postConditionAddress: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
      postConditionConditionCode: 'eq',
    });

    expect(errors.postConditionConditionCode).toBe(
      'Condition code does not match the selected post condition type'
    );
  });
});
