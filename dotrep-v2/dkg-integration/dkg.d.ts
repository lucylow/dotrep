declare module 'dkg.js' {
  export interface DKGConfig {
    endpoint?: string;
    blockchain?: string;
    wallet?: string;
    environment?: 'testnet' | 'mainnet' | 'local';
  }

  export default class DKG {
    constructor(config: DKGConfig);
    // Add other methods as needed
    [key: string]: any;
  }
}

