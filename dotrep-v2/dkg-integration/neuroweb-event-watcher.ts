/**
 * NeuroWeb Event Watcher for Knowledge Asset Anchors
 * 
 * This module watches NeuroWeb (OriginTrail parachain) events to detect
 * when Knowledge Assets are anchored on-chain. It extracts UALs and
 * transaction hashes for demo verification.
 * 
 * Based on the Polkadot integration guidance:
 * - Watches system events for KA anchor transactions
 * - Extracts UAL and block anchor information
 * - Provides callbacks for demo integration
 * - Supports both real NeuroWeb RPC and mock mode
 */

import { ApiPromise, WsProvider } from '@polkadot/api';

export interface KAAnchorEvent {
  ual: string;
  blockHash: string;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
  eventData: any;
}

export interface NeuroWebWatcherConfig {
  rpcUrl?: string;
  useMockMode?: boolean;
  onAnchorDetected?: (event: KAAnchorEvent) => void;
  filterByUAL?: string; // Optional: only watch for specific UAL
}

/**
 * NeuroWeb Event Watcher
 * 
 * Watches NeuroWeb parachain events to detect Knowledge Asset anchors.
 * This enables demo verification by showing "this transaction produced the KA UAL and blockID".
 */
export class NeuroWebEventWatcher {
  private api: ApiPromise | null = null;
  private wsProvider: WsProvider | null = null;
  private config: NeuroWebWatcherConfig & {
    rpcUrl: string;
    useMockMode: boolean;
  };
  private isWatching: boolean = false;
  private unsubscribe: (() => void) | null = null;
  private detectedAnchors: KAAnchorEvent[] = [];

  constructor(config: NeuroWebWatcherConfig = {}) {
    const getEnvVar = (name: string): string | undefined => {
      try {
        const proc = (globalThis as any).process || (globalThis as any).global?.process;
        return proc?.env?.[name];
      } catch {
        return undefined;
      }
    };

    // Determine network from env or default to testnet
    const network = (getEnvVar('NEUROWEB_NETWORK') || 'testnet') as 'mainnet' | 'testnet';
    const defaultRpc = network === 'mainnet'
      ? 'wss://astrosat-parachain-rpc.origin-trail.network'
      : 'wss://lofar-testnet.origin-trail.network';

    this.config = {
      rpcUrl: config.rpcUrl || 
               getEnvVar('NEUROWEB_RPC_URL') || 
               getEnvVar('POLKADOT_WS_ENDPOINT') || 
               defaultRpc,
      useMockMode: config.useMockMode ?? (getEnvVar('NEUROWEB_USE_MOCK') === 'true') ?? false,
      onAnchorDetected: config.onAnchorDetected,
      filterByUAL: config.filterByUAL,
    };
  }

  /**
   * Initialize connection to NeuroWeb RPC
   */
  async initialize(): Promise<void> {
    if (this.config.useMockMode) {
      console.log('🔧 [MOCK] NeuroWeb Event Watcher initialized (mock mode)');
      return;
    }

    if (this.api && this.api.isConnected) {
      return; // Already connected
    }

    try {
      console.log(`🔌 Connecting to NeuroWeb RPC: ${this.config.rpcUrl}`);
      this.wsProvider = new WsProvider(this.config.rpcUrl);
      this.api = await ApiPromise.create({ provider: this.wsProvider });
      await this.api.isReady;
      
      const chainInfo = await this.api.rpc.system.chain();
      const chainName = chainInfo.toString();
      console.log(`✅ Connected to NeuroWeb: ${chainName}`);
    } catch (error: any) {
      console.error(`❌ Failed to connect to NeuroWeb RPC:`, error.message);
      throw new Error(`NeuroWeb connection failed: ${error.message}`);
    }
  }

  /**
   * Start watching for KA anchor events
   */
  async startWatching(): Promise<void> {
    if (this.isWatching) {
      console.warn('⚠️  Already watching for events');
      return;
    }

    await this.initialize();

    if (this.config.useMockMode) {
      console.log('🔧 [MOCK] Started watching for KA anchors (mock mode)');
      this.isWatching = true;
      // In mock mode, simulate events periodically
      this.simulateMockEvents();
      return;
    }

    if (!this.api) {
      throw new Error('API not initialized. Call initialize() first.');
    }

    console.log('👀 Starting to watch for Knowledge Asset anchor events...');

    this.isWatching = true;

    // Subscribe to system events
    const unsub = await this.api.query.system.events((events: any) => {
      events.forEach((record: any) => {
        const { event, phase } = record;
        const section = event?.section?.toString() || '';
        const method = event?.method?.toString() || '';

        // Look for DKG/OriginTrail related events
        // Common event patterns: AssetAnchored, KnowledgeAssetPublished, etc.
        if (this.isKAAnchorEvent(section, method, event)) {
          this.handleAnchorEvent(event, phase, record);
        }
      });
    });

    this.unsubscribe = unsub as () => void;
    console.log('✅ Event watcher started');
  }

  /**
   * Stop watching for events
   */
  async stopWatching(): Promise<void> {
    if (!this.isWatching) {
      return;
    }

    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    this.isWatching = false;
    console.log('🛑 Stopped watching for events');
  }

  /**
   * Check if an event is a KA anchor event
   */
  private isKAAnchorEvent(section: string, method: string, event: any): boolean {
    // Common patterns for OriginTrail/NeuroWeb KA anchor events
    const anchorPatterns = [
      'AssetAnchored',
      'KnowledgeAssetPublished',
      'AssetPublished',
      'DKGAssetAnchored',
      'ReputationAssetAnchored',
    ];

    // Check if section is related to DKG/OriginTrail
    const dkgSections = ['dkg', 'originTrail', 'knowledgeAsset', 'reputation'];
    const isDKGSection = dkgSections.some(s => section.toLowerCase().includes(s.toLowerCase()));

    // Check if method matches anchor patterns
    const isAnchorMethod = anchorPatterns.some(pattern => 
      method.toLowerCase().includes(pattern.toLowerCase())
    );

    return isDKGSection && isAnchorMethod;
  }

  /**
   * Handle a detected anchor event
   */
  private async handleAnchorEvent(event: any, phase: any, record: any): Promise<void> {
    try {
      // Extract event data
      const eventData = event.data?.toHuman ? event.data.toHuman() : event.data;

      // Try to extract UAL from event data
      // UAL format: "ual:dkg:network:hash" or similar
      let ual: string | null = null;
      let blockHash: string = '';
      let blockNumber: number = 0;
      let transactionHash: string = '';

      // Extract UAL from various possible fields
      if (eventData) {
        if (typeof eventData === 'object') {
          ual = eventData.ual || eventData.UAL || eventData.assetId || eventData.asset_id || null;
          
          // Also check nested objects
          if (!ual && eventData.asset) {
            ual = eventData.asset.ual || eventData.asset.UAL || null;
          }
        } else if (typeof eventData === 'string') {
          // Sometimes UAL is directly in the data
          if (eventData.startsWith('ual:')) {
            ual = eventData;
          }
        }
      }

      // Get block information
      let signedBlock: any = null;
      if (this.api) {
        const blockHashObj = await this.api.rpc.chain.getBlockHash();
        blockHash = blockHashObj.toString();
        
        signedBlock = await this.api.rpc.chain.getBlock(blockHashObj);
        blockNumber = signedBlock.block.header.number.toNumber();
      }

      // Extract transaction hash from phase
      if (phase && phase.isApplyExtrinsic && signedBlock) {
        const extrinsicIndex = phase.asApplyExtrinsic.toNumber();
        if (this.api) {
          const extrinsic = signedBlock.block.extrinsics[extrinsicIndex];
          if (extrinsic) {
            transactionHash = extrinsic.hash.toString();
          }
        }
      }

      // If no UAL found, generate a placeholder
      if (!ual) {
        ual = `ual:dkg:neuroweb:${blockHash.substr(0, 16)}:${Date.now()}`;
        console.warn('⚠️  Could not extract UAL from event, using placeholder');
      }

      // Apply UAL filter if set
      if (this.config.filterByUAL && ual !== this.config.filterByUAL) {
        return; // Skip this event
      }

      const anchorEvent: KAAnchorEvent = {
        ual,
        blockHash,
        blockNumber,
        transactionHash,
        timestamp: Date.now(),
        eventData,
      };

      // Store detected anchor
      this.detectedAnchors.push(anchorEvent);

      console.log(`\n📌 Knowledge Asset Anchor Detected!`);
      console.log(`   UAL: ${ual}`);
      console.log(`   Block: #${blockNumber} (${blockHash.substr(0, 16)}...)`);
      console.log(`   Transaction: ${transactionHash.substr(0, 16)}...`);

      // Call callback if provided
      if (this.config.onAnchorDetected) {
        this.config.onAnchorDetected(anchorEvent);
      }
    } catch (error: any) {
      console.error('❌ Error handling anchor event:', error.message);
    }
  }

  /**
   * Simulate mock events for demo purposes
   */
  private simulateMockEvents(): void {
    // Simulate events every 10-30 seconds
    const interval = setInterval(() => {
      if (!this.isWatching) {
        clearInterval(interval);
        return;
      }

      // Randomly generate mock anchor events
      if (Math.random() > 0.7) { // 30% chance per interval
        const mockEvent: KAAnchorEvent = {
          ual: `ual:dkg:neuroweb:mock:${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          blockHash: `0x${Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map(b => b.toString(16).padStart(2, '0')).join('')}`,
          blockNumber: Math.floor(Date.now() / 1000),
          transactionHash: `0x${Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map(b => b.toString(16).padStart(2, '0')).join('')}`,
          timestamp: Date.now(),
          eventData: {
            mock: true,
            assetType: 'reputation',
          },
        };

        this.detectedAnchors.push(mockEvent);

        console.log(`\n📌 [MOCK] Knowledge Asset Anchor Detected!`);
        console.log(`   UAL: ${mockEvent.ual}`);
        console.log(`   Block: #${mockEvent.blockNumber}`);

        if (this.config.onAnchorDetected) {
          this.config.onAnchorDetected(mockEvent);
        }
      }
    }, 10000 + Math.random() * 20000); // 10-30 seconds
  }

  /**
   * Get all detected anchors
   */
  getDetectedAnchors(): KAAnchorEvent[] {
    return [...this.detectedAnchors];
  }

  /**
   * Get the latest detected anchor
   */
  getLatestAnchor(): KAAnchorEvent | null {
    return this.detectedAnchors.length > 0 
      ? this.detectedAnchors[this.detectedAnchors.length - 1]
      : null;
  }

  /**
   * Clear detected anchors history
   */
  clearHistory(): void {
    this.detectedAnchors = [];
    console.log('🗑️  Cleared anchor history');
  }

  /**
   * Get watcher status
   */
  getStatus(): {
    isWatching: boolean;
    isConnected: boolean;
    detectedCount: number;
    rpcUrl: string;
    mockMode: boolean;
  } {
    return {
      isWatching: this.isWatching,
      isConnected: this.api?.isConnected ?? false,
      detectedCount: this.detectedAnchors.length,
      rpcUrl: this.config.rpcUrl,
      mockMode: this.config.useMockMode,
    };
  }

  /**
   * Disconnect from NeuroWeb RPC
   */
  async disconnect(): Promise<void> {
    await this.stopWatching();
    
    if (this.api) {
      await this.api.disconnect();
      this.api = null;
    }

    if (this.wsProvider) {
      this.wsProvider.disconnect();
      this.wsProvider = null;
    }

    console.log('🔌 Disconnected from NeuroWeb RPC');
  }
}

/**
 * Factory function to create a NeuroWeb event watcher
 */
export function createNeuroWebWatcher(config?: NeuroWebWatcherConfig): NeuroWebEventWatcher {
  return new NeuroWebEventWatcher(config);
}

export default NeuroWebEventWatcher;

