export const FEE_CONFIG = {
  fallbackFeeEstimations: [2500, 3000, 3500],
  tokenTransferFeeEstimations: [200, 400, 800],
  stacksContractCallFeeEstimations: {
    low: { min: 2500, max: 2999 },
    standard: { min: 3000, max: 10000 },
    high: { min: 10000, max: 1000001 },
  },
  stacksContractDeploymentFeeEstimations: {
    low: { min: 10000, max: 50000 },
    standard: { min: 100001, max: 500000 },
    high: { min: 1000001, max: 2000000 },
  },
};
