/**
 * NeuroWeb Parachain Service
 * 
 * Comprehensive service for interacting with NeuroWeb (OriginTrail Parachain) on Polkadot.
 * NeuroWeb is an EVM-compatible parachain focused on decentralized AI and DKG integration.
 * 
 * Features:
 * - EVM-compatible smart contract interactions
 * - NEURO token operations
 * - TRAC token bridging support (via SnowBridge)
 * - XCM cross-chain messaging
 * - Knowledge Asset anchoring
 * - Polkadot Substrate API and EVM API dual support
 * 
 * Network Details:
 * - Mainnet: Chain ID 2043, ParaID 2043, secured by Polkadot Relay Chain
 * - Testnet: Chain ID 20430, ParaID 20430, on Rococo testnet
 * 
 * Resources:
 * - Documentation: https://docs.neuroweb.ai/polkadot
 * - GitHub: https://github.com/OriginTrail/neuroweb
 */

import { ApiPromise, WsProvider } from '@polkadot/api';
import { ethers } from 'ethers';

// NeuroWeb Network Configuration
export const NEUROWEB_NETWORKS = {
  mainnet: {
    chainId: 2043,
    paraId: 2043,
    name: 'NeuroWeb',
    rpc: {
      ws: 'wss://astrosat-parachain-rpc.origin-trail.network',
      http: 'https://astrosat-parachain-rpc.origin-trail.network',
    },
    explorer: 'https://neuroweb.subscan.io',
    nativeCurrency: {
      name: 'NEURO',
      symbol: 'NEURO',
      decimals: 18,
    },
    relayChain: 'polkadot',
  },
  testnet: {
    chainId: 20430,
    paraId: 20430,
    name: 'NeuroWeb Testnet',
    rpc: {
      ws: 'wss://lofar-testnet.origin-trail.network',
      http: 'https://lofar-testnet.origin-trail.network',
    },
    explorer: 'https://lofar-testnet.subscan.io',
    nativeCurrency: {
      name: 'NEURO',
      symbol: 'NEURO',
      decimals: 18,
    },
    relayChain: 'rococo',
  },
} as const;

export type NeuroWebNetwork = keyof typeof NEUROWEB_NETWORKS;

export interface NeuroWebConfig {
  network?: NeuroWebNetwork;
  rpcUrl?: string;
  evmRpcUrl?: string;
  useMockMode?: boolean;
  apiOptions?: any;
}

export interface NeuroWebChainInfo {
  chainId: number;
  paraId: number;
  chainName: string;
  isParachain: boolean;
  relayChain: string;
  blockNumber: number;
  blockHash: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export interface TRACBridgeInfo {
  sourceChain: string;
  targetChain: string;
  bridgeAddress?: string;
  supportedTokens: string[];
}

/**
 * NeuroWeb Service
 * 
 * Provides unified interface for NeuroWeb parachain operations,
 * supporting both Substrate (Polkadot.js) and EVM (ethers.js) APIs.
 */
export class NeuroWebService {
  private api: ApiPromise | null = null;
  private wsProvider: WsProvider | null = null;
  private evmProvider: ethers.Provider | null = null;
  private config: Required<NeuroWebConfig>;
  private network: NeuroWebNetwork;
  private useMockMode: boolean;

  constructor(config: NeuroWebConfig = {}) {
    const getEnvVar = (name: string): string | undefined => {
      try {
        const proc = (globalThis as any).process || (globalThis as any).global?.process;
        return proc?.env?.[name];
      } catch {
        return undefined;
      }
    };

    this.network = config.network || (getEnvVar('NEUROWEB_NETWORK') as NeuroWebNetwork) || 'testnet';
    this.useMockMode = config.useMockMode ?? (getEnvVar('NEUROWEB_USE_MOCK') === 'true') ?? false;

    const networkConfig = NEUROWEB_NETWORKS[this.network];

    this.config = {
      network: this.network,
      rpcUrl: config.rpcUrl || 
              getEnvVar('NEUROWEB_RPC_URL') || 
              networkConfig.rpc.ws,
      evmRpcUrl: config.evmRpcUrl || 
                 getEnvVar('NEUROWEB_EVM_RPC_URL') || 
                 networkConfig.rpc.http,
      useMockMode: this.useMockMode,
      apiOptions: config.apiOptions || {},
    };
  }

  /**
   * Initialize connection to NeuroWeb (Substrate API)
   */
  async initializeSubstrate(): Promise<void> {
    if (this.useMockMode) {
      console.log('🔧 [MOCK] NeuroWeb Substrate API initialized (mock mode)');
      return;
    }

    if (this.api && this.api.isConnected) {
      return;
    }

    try {
      console.log(`🔌 Connecting to NeuroWeb Substrate RPC: ${this.config.rpcUrl}`);
      this.wsProvider = new WsProvider(this.config.rpcUrl);
      this.api = await ApiPromise.create({
        provider: this.wsProvider,
        ...this.config.apiOptions,
      });

      await this.api.isReady;

      const chainInfo = await this.api.rpc.system.chain();
      console.log(`✅ Connected to NeuroWeb (Substrate): ${chainInfo.toString()}`);
    } catch (error: any) {
      console.error(`❌ Failed to connect to NeuroWeb Substrate RPC:`, error.message);
      throw new Error(`NeuroWeb Substrate connection failed: ${error.message}`);
    }
  }

  /**
   * Initialize EVM provider for NeuroWeb
   * NeuroWeb is EVM-compatible, so we can use ethers.js
   */
  async initializeEVM(): Promise<void> {
    if (this.useMockMode) {
      console.log('🔧 [MOCK] NeuroWeb EVM provider initialized (mock mode)');
      return;
    }

    if (this.evmProvider) {
      return;
    }

    try {
      console.log(`🔌 Connecting to NeuroWeb EVM RPC: ${this.config.evmRpcUrl}`);
      this.evmProvider = new ethers.JsonRpcProvider(this.config.evmRpcUrl);
      
      const network = await this.evmProvider.getNetwork();
      const expectedChainId = NEUROWEB_NETWORKS[this.network].chainId;
      
      if (Number(network.chainId) !== expectedChainId) {
        console.warn(`⚠️  Chain ID mismatch: expected ${expectedChainId}, got ${network.chainId}`);
      }
      
      console.log(`✅ Connected to NeuroWeb (EVM): Chain ID ${network.chainId}`);
    } catch (error: any) {
      console.error(`❌ Failed to connect to NeuroWeb EVM RPC:`, error.message);
      throw new Error(`NeuroWeb EVM connection failed: ${error.message}`);
    }
  }

  /**
   * Get comprehensive chain information
   */
  async getChainInfo(): Promise<NeuroWebChainInfo> {
    if (this.useMockMode) {
      const networkConfig = NEUROWEB_NETWORKS[this.network];
      return {
        chainId: networkConfig.chainId,
        paraId: networkConfig.paraId,
        chainName: networkConfig.name,
        isParachain: true,
        relayChain: networkConfig.relayChain,
        blockNumber: Math.floor(Date.now() / 1000),
        blockHash: '0x' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
          .map(b => b.toString(16).padStart(2, '0')).join(''),
        nativeCurrency: networkConfig.nativeCurrency,
      };
    }

    await this.initializeSubstrate();
    if (!this.api) {
      throw new Error('Substrate API not initialized');
    }

    const networkConfig = NEUROWEB_NETWORKS[this.network];
    const chainInfo = await this.api.rpc.system.chain();
    const blockHash = await this.api.rpc.chain.getBlockHash();
    const signedBlock = await this.api.rpc.chain.getBlock(blockHash);
    const blockNumber = signedBlock.block.header.number.toNumber();

    return {
      chainId: networkConfig.chainId,
      paraId: networkConfig.paraId,
      chainName: chainInfo.toString(),
      isParachain: true,
      relayChain: networkConfig.relayChain,
      blockNumber,
      blockHash: blockHash.toString(),
      nativeCurrency: networkConfig.nativeCurrency,
    };
  }

  /**
   * Get Substrate API instance
   */
  getSubstrateApi(): ApiPromise {
    if (!this.api) {
      throw new Error('Substrate API not initialized. Call initializeSubstrate() first.');
    }
    return this.api;
  }

  /**
   * Get EVM provider instance
   */
  getEVMProvider(): ethers.Provider {
    if (!this.evmProvider) {
      throw new Error('EVM provider not initialized. Call initializeEVM() first.');
    }
    return this.evmProvider;
  }

  /**
   * Get network configuration
   */
  getNetworkConfig() {
    return NEUROWEB_NETWORKS[this.network];
  }

  /**
   * Get MetaMask network configuration for NeuroWeb
   * Use this to add NeuroWeb to MetaMask
   */
  getMetaMaskConfig() {
    const networkConfig = NEUROWEB_NETWORKS[this.network];
    return {
      chainId: `0x${networkConfig.chainId.toString(16)}`,
      chainName: networkConfig.name,
      nativeCurrency: networkConfig.nativeCurrency,
      rpcUrls: [networkConfig.rpc.http],
      blockExplorerUrls: networkConfig.explorer ? [networkConfig.explorer] : [],
    };
  }

  /**
   * Check NEURO balance for an account
   */
  async getNEUROBalance(accountAddress: string): Promise<{
    balance: bigint;
    formatted: string;
  }> {
    if (this.useMockMode) {
      return {
        balance: BigInt(1000) * BigInt(10 ** 18), // Mock 1000 NEURO
        formatted: '1000.0',
      };
    }

    await this.initializeEVM();
    if (!this.evmProvider) {
      throw new Error('EVM provider not initialized');
    }

    const balance = await this.evmProvider.getBalance(accountAddress);
    return {
      balance,
      formatted: ethers.formatEther(balance),
    };
  }

  /**
   * Estimate gas for a transaction
   */
  async estimateGas(transaction: ethers.TransactionRequest): Promise<bigint> {
    if (this.useMockMode) {
      return BigInt(21000); // Mock gas estimate
    }

    await this.initializeEVM();
    if (!this.evmProvider) {
      throw new Error('EVM provider not initialized');
    }

    return await this.evmProvider.estimateGas(transaction);
  }

  /**
   * Get current gas price
   */
  async getGasPrice(): Promise<bigint> {
    if (this.useMockMode) {
      return BigInt(1000000000); // Mock 1 gwei
    }

    await this.initializeEVM();
    if (!this.evmProvider) {
      throw new Error('EVM provider not initialized');
    }

    const feeData = await this.evmProvider.getFeeData();
    return feeData.gasPrice || BigInt(0);
  }

  /**
   * Get TRAC token bridge information
   * TRAC can be bridged from Ethereum to NeuroWeb via SnowBridge
   */
  getTRACBridgeInfo(): TRACBridgeInfo {
    return {
      sourceChain: this.network === 'mainnet' ? 'ethereum' : 'ethereum-sepolia',
      targetChain: 'neuroweb',
      supportedTokens: ['TRAC'],
    };
  }

  /**
   * Format NEURO amount for display
   */
  formatNEURO(amount: bigint | string): string {
    return ethers.formatEther(amount);
  }

  /**
   * Parse NEURO amount from string
   */
  parseNEURO(amount: string): bigint {
    return ethers.parseEther(amount);
  }

  /**
   * Get service status
   */
  getStatus(): {
    network: NeuroWebNetwork;
    mockMode: boolean;
    substrateConnected: boolean;
    evmConnected: boolean;
    rpcUrl: string;
    evmRpcUrl: string;
  } {
    return {
      network: this.network,
      mockMode: this.useMockMode,
      substrateConnected: this.api?.isConnected ?? false,
      evmConnected: this.evmProvider !== null,
      rpcUrl: this.config.rpcUrl,
      evmRpcUrl: this.config.evmRpcUrl,
    };
  }

  /**
   * Disconnect from all services
   */
  async disconnect(): Promise<void> {
    if (this.api) {
      await this.api.disconnect();
      this.api = null;
    }

    if (this.wsProvider) {
      this.wsProvider.disconnect();
      this.wsProvider = null;
    }

    // EVM provider doesn't need explicit disconnect
    this.evmProvider = null;

    console.log('🔌 Disconnected from NeuroWeb services');
  }
}

/**
 * Factory function to create NeuroWeb service
 */
export function createNeuroWebService(config?: NeuroWebConfig): NeuroWebService {
  return new NeuroWebService(config);
}

export default NeuroWebService;

