import { Alchemy, Network, AssetTransfersCategory, SortingOrder } from 'alchemy-sdk';
import { isAddress } from 'ethers';

export interface TransferData {
  blockNum: string;
  hash: string;
  from: string;
  to: string | null;
  value: number;
  asset: string;
  category: string;
  rawContract: {
    address: string | null;
    decimal: string | null;
  };
  timestamp?: string;
}

export type SupportedChain = 'ethereum' | 'polygon' | 'arbitrum' | 'optimism' | 'base';

const CHAIN_TO_NETWORK: Record<SupportedChain, Network> = {
  ethereum: Network.ETH_MAINNET,
  polygon: Network.MATIC_MAINNET,
  arbitrum: Network.ARB_MAINNET,
  optimism: Network.OPT_MAINNET,
  base: Network.BASE_MAINNET,
};

const STABLECOIN_ADDRESSES: Record<SupportedChain, { usdc: string; usdt: string }> = {
  ethereum: {
    usdc: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    usdt: '0xdac17f958d2ee523a2206206994597c13d831ec7',
  },
  polygon: {
    usdc: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
    usdt: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
  },
  arbitrum: {
    usdc: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
    usdt: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
  },
  optimism: {
    usdc: '0x0b2c639c533813f4aa9d7837caf62653d097ff85',
    usdt: '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58',
  },
  base: {
    usdc: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
    usdt: '0x', // Base doesn't have widespread USDT yet, using empty address
  },
};

export function isSupportedChain(chain: string): chain is SupportedChain {
  return ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base'].includes(chain);
}

export function validateWalletAddress(address: string): boolean {
  return isAddress(address);
}

export function getAlchemyClient(chain: SupportedChain): Alchemy {
  const apiKey = process.env.ALCHEMY_API_KEY;
  
  if (!apiKey) {
    throw new Error('ALCHEMY_API_KEY environment variable is not set');
  }

  const network = CHAIN_TO_NETWORK[chain];
  
  return new Alchemy({
    apiKey,
    network,
  });
}

export async function fetchStablecoinTransfers(
  walletAddress: string,
  chain: SupportedChain
): Promise<TransferData[]> {
  if (!validateWalletAddress(walletAddress)) {
    throw new Error('Invalid wallet address format');
  }

  if (!isSupportedChain(chain)) {
    throw new Error(`Unsupported blockchain: ${chain}`);
  }

  const alchemy = getAlchemyClient(chain);
  const stablecoins = STABLECOIN_ADDRESSES[chain];
  
  // Calculate timestamp for 90 days ago
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  // Fetch transfers TO the wallet
  const transfersTo = await alchemy.core.getAssetTransfers({
    toAddress: walletAddress,
    category: [AssetTransfersCategory.ERC20],
    contractAddresses: [stablecoins.usdc, stablecoins.usdt].filter(addr => addr !== '0x'),
    withMetadata: true,
    order: SortingOrder.DESCENDING,
  });

  // Fetch transfers FROM the wallet
  const transfersFrom = await alchemy.core.getAssetTransfers({
    fromAddress: walletAddress,
    category: [AssetTransfersCategory.ERC20],
    contractAddresses: [stablecoins.usdc, stablecoins.usdt].filter(addr => addr !== '0x'),
    withMetadata: true,
    order: SortingOrder.DESCENDING,
  });

  // Combine and filter transfers from last 90 days
  const allTransfers = [
    ...transfersTo.transfers.map(t => ({
      blockNum: t.blockNum,
      hash: t.hash,
      from: t.from,
      to: t.to,
      value: t.value || 0,
      asset: t.asset || 'UNKNOWN',
      category: t.category,
      rawContract: {
        address: t.rawContract.address,
        decimal: t.rawContract.decimal,
      },
      timestamp: t.metadata?.blockTimestamp,
    })),
    ...transfersFrom.transfers.map(t => ({
      blockNum: t.blockNum,
      hash: t.hash,
      from: t.from,
      to: t.to,
      value: t.value || 0,
      asset: t.asset || 'UNKNOWN',
      category: t.category,
      rawContract: {
        address: t.rawContract.address,
        decimal: t.rawContract.decimal,
      },
      timestamp: t.metadata?.blockTimestamp,
    })),
  ];

  // Filter by 90 days and sort by timestamp descending
  const filteredTransfers = allTransfers.filter(t => {
    if (!t.timestamp) return true; // Include if no timestamp
    const transferDate = new Date(t.timestamp);
    return transferDate >= ninetyDaysAgo;
  });

  // Sort by timestamp descending (most recent first)
  filteredTransfers.sort((a, b) => {
    if (!a.timestamp) return 1;
    if (!b.timestamp) return -1;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return filteredTransfers;
}
