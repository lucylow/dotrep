const process = require('process');
const fs = require('fs-extra');
const path = require('path');

module.exports = {
  credentials: () => {
    return {
      gcp: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      aws: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_DEFAULT_REGION || process.env.AWS_REGION
      },
      azure: {
        clientId: process.env.ARM_CLIENT_ID,
        clientSecret: process.env.ARM_CLIENT_SECRET,
        subscriptionId: process.env.ARM_SUBSCRIPTION_ID,
        tenantId: process.env.ARM_TENANT_ID
      },
      digitalOcean: {
        token: process.env.DIGITALOCEAN_ACCESS_TOKEN
      },
      cloudflare: {
        email: process.env.CLOUDFLARE_EMAIL,
        apiKey: process.env.CLOUDFLARE_API_KEY
      }
    }
  },

  /**
   * Validate cloud provider credentials
   */
  validateCredentials: (provider) => {
    const creds = module.exports.credentials();
    
    switch (provider) {
      case 'gcp':
        if (!creds.gcp || !fs.existsSync(creds.gcp)) {
          throw new Error('GCP credentials file not found. Set GOOGLE_APPLICATION_CREDENTIALS environment variable.');
        }
        break;
      case 'aws':
        if (!creds.aws.accessKeyId || !creds.aws.secretAccessKey) {
          throw new Error('AWS credentials not found. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.');
        }
        break;
      case 'azure':
        if (!creds.azure.clientId || !creds.azure.clientSecret || !creds.azure.subscriptionId || !creds.azure.tenantId) {
          throw new Error('Azure credentials not found. Set ARM_CLIENT_ID, ARM_CLIENT_SECRET, ARM_SUBSCRIPTION_ID, and ARM_TENANT_ID environment variables.');
        }
        break;
      case 'do':
        if (!creds.digitalOcean.token) {
          throw new Error('Digital Ocean token not found. Set DIGITALOCEAN_ACCESS_TOKEN environment variable.');
        }
        break;
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
    
    return true;
  },

  /**
   * Get cloud provider regions
   */
  getRegions: (provider) => {
    const regions = {
      gcp: [
        'us-central1', 'us-east1', 'us-east4', 'us-west1', 'us-west2', 'us-west3', 'us-west4',
        'europe-west1', 'europe-west2', 'europe-west3', 'europe-west4', 'europe-west6',
        'asia-east1', 'asia-northeast1', 'asia-south1', 'asia-southeast1',
        'australia-southeast1', 'southamerica-east1'
      ],
      aws: [
        'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
        'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-1',
        'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-south-1',
        'sa-east-1', 'ca-central-1'
      ],
      azure: [
        'eastus', 'eastus2', 'westus', 'westus2', 'centralus',
        'northeurope', 'westeurope', 'southeastasia', 'japaneast',
        'australiaeast', 'brazilsouth', 'canadacentral'
      ],
      do: [
        'nyc1', 'nyc3', 'ams3', 'sfo3', 'sgp1', 'lon1', 'fra1', 'tor1', 'blr1'
      ]
    };
    
    return regions[provider] || [];
  },

  /**
   * Get recommended instance types for provider
   */
  getRecommendedInstanceTypes: (provider, workload = 'standard') => {
    const recommendations = {
      gcp: {
        standard: 'n1-standard-2',
        highmem: 'n1-highmem-4',
        highcpu: 'n1-highcpu-4',
        spot: 'n1-standard-2'
      },
      aws: {
        standard: 'm5.large',
        highmem: 'r5.xlarge',
        highcpu: 'c5.xlarge',
        spot: 'm5.large'
      },
      azure: {
        standard: 'Standard_D2s_v3',
        highmem: 'Standard_E4s_v3',
        highcpu: 'Standard_F4s_v2',
        spot: 'Standard_D2s_v3'
      },
      do: {
        standard: 's-4vcpu-8gb',
        highmem: 'm-8vcpu-32gb',
        highcpu: 'c-8',
        spot: 's-4vcpu-8gb'
      }
    };
    
    return recommendations[provider]?.[workload] || recommendations[provider]?.standard;
  }
}
