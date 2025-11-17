/**
 * Cloud Storage Service
 * Handles IPFS pinning and cloud storage backup
 */

export interface ContributionProof {
  contributionId: string;
  proof: any;
  metadata: Record<string, any>;
  timestamp: number;
}

export interface StorageResult {
  ipfsHash: string;
  cloudUrl: string;
  timestamp: number;
}

export class CloudStorageService {
  private readonly pinataEndpoint: string;
  private readonly cloudStorageEndpoint: string;
  private readonly pinataJWT: string | undefined;
  private readonly cloudStorageKey: string | undefined;

  constructor() {
    this.pinataEndpoint = 'https://api.pinata.cloud';
    this.cloudStorageEndpoint = process.env.CLOUD_STORAGE_ENDPOINT || 'https://storage.dotrep.cloud';
    this.pinataJWT = process.env.PINATA_JWT;
    this.cloudStorageKey = process.env.CLOUD_STORAGE_KEY;
  }

  async storeContributionProof(proof: ContributionProof): Promise<StorageResult> {
    // Pin to IPFS via Pinata
    const ipfsHash = await this.pinToIPFS(proof);
    
    // Backup to cloud storage
    const cloudUrl = await this.backupToCloudStorage(proof, ipfsHash);
    
    return { ipfsHash, cloudUrl, timestamp: Date.now() };
  }

  private async pinToIPFS(data: any): Promise<string> {
    if (!this.pinataJWT) {
      console.warn('PINATA_JWT not set, skipping IPFS pinning');
      // Return a mock hash for development
      return `mock-ipfs-hash-${Date.now()}`;
    }

    try {
      const response = await fetch(`${this.pinataEndpoint}/pinning/pinJSONToIPFS`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.pinataJWT}`
        },
        body: JSON.stringify({
          pinataContent: data,
          pinataMetadata: {
            name: `contribution-${Date.now()}`,
            keyvalues: {
              type: 'contribution-proof',
              timestamp: Date.now().toString()
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to pin to IPFS');
      }

      const result = await response.json();
      return result.IpfsHash;
    } catch (error) {
      console.error('IPFS pinning error:', error);
      // Return mock hash for development
      return `mock-ipfs-hash-${Date.now()}`;
    }
  }

  private async backupToCloudStorage(data: any, ipfsHash: string): Promise<string> {
    if (!this.cloudStorageKey) {
      console.warn('CLOUD_STORAGE_KEY not set, skipping cloud backup');
      return `https://storage.dotrep.cloud/mock/${ipfsHash}`;
    }

    try {
      const response = await fetch(`${this.cloudStorageEndpoint}/store`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.cloudStorageKey}`
        },
        body: JSON.stringify({
          data,
          ipfsHash,
          timestamp: Date.now()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to backup to cloud storage');
      }

      const result = await response.json();
      return result.url;
    } catch (error) {
      console.error('Cloud storage backup error:', error);
      return `https://storage.dotrep.cloud/mock/${ipfsHash}`;
    }
  }

  async retrieveProof(ipfsHash: string): Promise<any> {
    // Try cloud storage first (faster)
    if (this.cloudStorageKey) {
      try {
        const response = await fetch(`${this.cloudStorageEndpoint}/retrieve/${ipfsHash}`, {
          headers: {
            'Authorization': `Bearer ${this.cloudStorageKey}`
          }
        });
        if (response.ok) {
          return await response.json();
        }
      } catch (error) {
        console.warn('Cloud storage retrieval failed, falling back to IPFS');
      }
    }

    // Fallback to IPFS gateway
    try {
      const ipfsResponse = await fetch(`https://gateway.pinata.cloud/ipfs/${ipfsHash}`);
      if (ipfsResponse.ok) {
        return await ipfsResponse.json();
      }
    } catch (error) {
      console.error('IPFS retrieval error:', error);
    }

    throw new Error(`Failed to retrieve proof with hash: ${ipfsHash}`);
  }
}


