declare module 'dkg.js' {
  export interface DKGConfig {
    endpoint?: string;
    blockchain?: string | {
      name?: string;
      publicKey?: string;
      privateKey?: string;
    };
    wallet?: string;
    environment?: 'testnet' | 'mainnet' | 'local';
  }

  export interface AssetCreateOptions {
    epochsNum?: number;
  }

  export interface AssetCreateResult {
    UAL: string;
    transactionHash?: string;
    blockNumber?: number;
  }

  export interface AssetGetResult {
    public?: any;
    assertion?: any;
  }

  export default class DKG {
    constructor(config: DKGConfig);
    asset: {
      create: (asset: { public: any }, options?: AssetCreateOptions) => Promise<AssetCreateResult>;
      get: (ual: string) => Promise<AssetGetResult>;
    };
    graph: {
      query: (query: string, queryType?: string) => Promise<any>;
    };
    node: {
      info: () => Promise<{ version: string; [key: string]: any }>;
    };
    [key: string]: any;
  }
}

