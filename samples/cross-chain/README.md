# Cross-Chain (XCM) Example

Learn how to send messages and transfer assets between parachains using XCM (Cross-Consensus Message Format).

## What This Sample Shows

- Sending XCM messages between chains
- Transferring assets across parachains
- Understanding XCM message structure
- Monitoring cross-chain transactions

## Prerequisites

Both Polkadot node and Asset Hub must be running:
```bash
docker-compose up -d polkadot-node asset-hub
```

## Quick Start

1. **Access Polkadot-JS Apps:**
   ```bash
   # Open http://localhost:3000
   ```

2. **Connect to both chains:**
   - Main chain: `ws://localhost:9944`
   - Asset Hub: `ws://localhost:9945`

3. **Send XCM Message:**
   - Navigate to Developer → Extrinsics
   - Select `xcmPallet` or `polkadotXcm`
   - Choose `send` or `transferAssets`

## XCM Basics

### Message Structure
```rust
Xcm::<()> {
    instructions: vec![
        WithdrawAsset(assets),
        BuyExecution { fees, weight_limit },
        DepositAsset { assets, beneficiary },
    ],
    weight: Weight::from_parts(1000, 1000),
}
```

### Transfer Assets
```javascript
const tx = api.tx.xcmPallet.transferAssets(
  dest,        // Destination (multilocation)
  beneficiary, // Recipient
  assets,      // Assets to transfer
  fee_asset_item // Fee payment
);
```

## Common Patterns

### 1. Asset Transfer
Transfer tokens from relay chain to parachain:
```javascript
// From relay chain
api.tx.xcmPallet.transferAssets(
  { V3: { parents: 0, interior: { X1: { Parachain: 1000 } } } },
  { V3: { parents: 0, interior: { X1: { AccountId32: { network: null, id: accountId } } } } },
  [{ id: { Concrete: { parents: 0, interior: Here } }, fun: { Fungible: amount } }],
  0
);
```

### 2. Remote Call
Execute a call on a remote chain:
```javascript
api.tx.xcmPallet.send(
  dest,
  {
    V3: [
      { WithdrawAsset: assets },
      { BuyExecution: { fees, weightLimit: 'Unlimited' } },
      { Transact: { originKind: 'SovereignAccount', requireWeightAtMost: weight, call } },
    ]
  }
);
```

## Use Cases

- **Cross-Chain DeFi**: Lend assets on one chain, use on another
- **Multi-Chain NFTs**: Transfer NFTs between chains
- **Governance**: Vote on multiple chains from one account
- **Asset Bridging**: Move assets between ecosystems

## Monitoring

- Check XCM queue status
- Monitor execution results
- View cross-chain events
- Track asset balances across chains

## Resources

- [XCM Documentation](https://wiki.polkadot.network/docs/learn-xcm)
- [XCM Format Specification](https://github.com/paritytech/xcm-format)
- [XCM Tools](https://github.com/paritytech/xcm-tools)


