# Asset Creation Example

Learn how to create and manage fungible tokens (assets) on Polkadot using the Asset Hub.

## What This Sample Shows

- Creating fungible assets
- Minting and burning tokens
- Transferring assets between accounts
- Querying asset balances

## Prerequisites

Ensure the Asset Hub container is running:
```bash
docker-compose up -d asset-hub
```

## Quick Start

1. **Access Polkadot-JS Apps:**
   ```bash
   # Open http://localhost:3000
   ```

2. **Connect to Asset Hub:**
   - Settings → Networks
   - Add endpoint: `ws://localhost:9945`
   - Name it "Asset Hub Local"

3. **Create an Asset:**
   - Navigate to Assets → Create
   - Set asset metadata (name, symbol, decimals)
   - Submit the transaction

4. **Mint Tokens:**
   - Go to Assets → Mint
   - Select your asset
   - Enter amount and beneficiary
   - Submit transaction

## Common Operations

### Create Asset
```javascript
const tx = api.tx.assets.create(
  id,           // Asset ID
  admin,        // Admin account
  minBalance    // Minimum balance
);
```

### Mint Asset
```javascript
const tx = api.tx.assets.mint(
  id,           // Asset ID
  beneficiary,  // Recipient
  amount        // Amount to mint
);
```

### Transfer Asset
```javascript
const tx = api.tx.assets.transfer(
  id,           // Asset ID
  target,       // Recipient
  amount        // Amount to transfer
);
```

## Use Cases

- **Stablecoins**: Create USD-pegged tokens
- **Reward Tokens**: Issue tokens for user rewards
- **Governance Tokens**: Create voting tokens
- **Loyalty Points**: Implement point systems

## Resources

- [Asset Hub Documentation](https://wiki.polkadot.network/docs/learn-assets)
- [XCM Asset Transfers](https://wiki.polkadot.network/docs/learn-xcm)


