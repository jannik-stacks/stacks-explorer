import { fetchTxFeeEstimation } from '@/app/data';
import { FEE_CONFIG } from '@/app/feeConfig';
import { Codec, NetworkName, Payload, Transaction, Tx } from '@jannik-stacks/kit';
import { unstable_cache } from 'next/cache';

export function createSampleTokenTransferOptions(network: NetworkName): Transaction {
  return {
    type: 'transfer',
    network,
    fee: BigInt(0),
    nonce: BigInt(1),
    recipient: 'ST1EXHZSN8MJSJ9DSG994G1V8CNKYXGMK7Z4SA6DH',
    amount: BigInt(100),
  };
}

export function createSampleContractCallOptions(network: NetworkName): Transaction {
  return {
    type: 'call',
    network,
    fee: BigInt(0),
    nonce: BigInt(1),
    contract: 'ST1EXHZSN8MJSJ9DSG994G1V8CNKYXGMK7Z4SA6DH.hello-world',
    functionName: 'print',
    args: [],
  };
}

export function createSampleContractDeployOptions(network: NetworkName): Transaction {
  return {
    type: 'deploy',
    network,
    fee: BigInt(0),
    nonce: BigInt(1),
    code: '(define-public (print) (ok "Hello, world!"))',
    name: 'hello-world',
    clarityVersion: 4,
  };
}

export async function generateSampleTxs(network: NetworkName) {
  return {
    tokenTransferTx: createSampleTokenTransferOptions(network),
    contractCallTx: createSampleContractCallOptions(network),
    contractDeployTx: createSampleContractDeployOptions(network),
  };
}

export interface TxFeeEstimate {
  no_priority: number;
  low_priority: number;
  medium_priority: number;
  high_priority: number;
}

async function getStacksFeeEstimate(
  unsignedTx: Transaction,
  chain: string,
  api: string
): Promise<TxFeeEstimate> {
  const txByteLength = Tx.from(unsignedTx).toHex().length / 2;
  let payload: Payload;
  if (unsignedTx.type === 'transfer')
    payload = {
      type: 'token-transfer',
      recipient: unsignedTx.recipient,
      amount: unsignedTx.amount,
      memo: unsignedTx.memo || '',
    };
  else if (unsignedTx.type === 'call') {
    const [contractAddress, contractName] = unsignedTx.contract.split('.');
    payload = {
      type: 'contract-call',
      contractAddress,
      contractName,
      functionName: unsignedTx.functionName,
      functionArgs: unsignedTx.args,
    };
  } else
    payload = {
      type: 'versioned-smart-contract',
      clarityVersion: unsignedTx.clarityVersion!,
      contractName: unsignedTx.name,
      codeBody: unsignedTx.code,
    };
  const txPayload = Codec.Raw.Payload.encode(payload);
  const response = await fetchTxFeeEstimation(txPayload, txByteLength, chain, api);
  let fees: number[];
  if (response.error) fees = [2500, 3000, 3500];
  else if (unsignedTx.type === 'transfer') fees = FEE_CONFIG.tokenTransferFeeEstimations;
  else {
    const ranges =
      unsignedTx.type === 'call'
        ? FEE_CONFIG.stacksContractCallFeeEstimations
        : FEE_CONFIG.stacksContractDeploymentFeeEstimations;
    fees = (['low', 'standard', 'high'] as const).map((priority, index) => {
      const fee = response.estimations[index].fee;
      const { min, max } = ranges[priority];
      if (fee > max) return priority === 'high' ? fee : max;
      if (fee < min) return priority === 'low' ? fee : min;
      return fee;
    });
  }
  return {
    no_priority: 0,
    low_priority: fees[0],
    medium_priority: fees[1],
    high_priority: fees[2],
  };
}

export interface SampleTxsFeeEstimate {
  tokenTransferFees: TxFeeEstimate;
  contractCallFees: TxFeeEstimate;
  contractDeployFees: TxFeeEstimate;
  averageFees: TxFeeEstimate;
}

export async function fetchSampleTxsFeeEstimate(
  chain: NetworkName,
  api: string
): Promise<SampleTxsFeeEstimate> {
  const { tokenTransferTx, contractCallTx, contractDeployTx } = await generateSampleTxs(chain);
  const [tokenTransferFees, contractCallFees, contractDeployFees] = await Promise.all([
    getStacksFeeEstimate(tokenTransferTx, chain, api),
    getStacksFeeEstimate(contractCallTx, chain, api),
    getStacksFeeEstimate(contractDeployTx, chain, api),
  ]);

  const averageFees = {
    no_priority: 0,
    low_priority: Math.round(
      (tokenTransferFees.low_priority +
        contractCallFees.low_priority +
        contractDeployFees.low_priority) /
        3
    ),
    medium_priority: Math.round(
      (tokenTransferFees.medium_priority +
        contractCallFees.medium_priority +
        contractDeployFees.medium_priority) /
        3
    ),
    high_priority: Math.round(
      (tokenTransferFees.high_priority +
        contractCallFees.high_priority +
        contractDeployFees.high_priority) /
        3
    ),
  };

  return {
    tokenTransferFees,
    contractCallFees,
    contractDeployFees,
    averageFees,
  };
}

const cachedFeeEstimate = unstable_cache(
  async (chain: NetworkName, api: string) => {
    const result = await fetchSampleTxsFeeEstimate(chain, api);
    return result;
  },
  ['sample-txs-fee-estimate'],
  {
    tags: ['sample-txs-fee-estimate'],
    revalidate: 120, // 2 minutes
  }
);

export async function getSampleTxsFeeEstimate(chain: NetworkName, api: string) {
  return await cachedFeeEstimate(chain, api);
}
