# NFT Pallet Example

Build a Non-Fungible Token (NFT) system on Polkadot using a custom pallet.

## What This Sample Shows

- Creating unique tokens (NFTs)
- Minting NFTs with metadata
- Transferring ownership
- Querying NFT collections

## Quick Start

1. **Start the development environment:**
   ```bash
   docker-compose up -d
   ```

2. **Access Polkadot-JS Apps:**
   Open http://localhost:3000

3. **Connect to Local Node:**
   - Settings → Networks → Add `ws://localhost:9944`

4. **Interact with NFTs:**
   - Navigate to your NFT pallet
   - Mint new NFTs
   - Transfer between accounts
   - View collections

## NFT Pallet Structure

### Storage
```rust
// Collection ID → Collection Info
#[pallet::storage]
pub type Collections<T: Config> = StorageMap<_, Twox64Concat, u32, CollectionInfo>;

// (Collection ID, Token ID) → Token Info
#[pallet::storage]
pub type Tokens<T: Config> = StorageDoubleMap<
    _,
    Twox64Concat, u32,  // Collection ID
    Twox64Concat, u32,  // Token ID
    TokenInfo,
    OptionQuery
>;
```

### Key Functions

- `create_collection()` - Create a new NFT collection
- `mint()` - Mint a new NFT
- `transfer()` - Transfer NFT ownership
- `burn()` - Destroy an NFT

## Use Cases

- **Digital Art**: Mint and trade digital artwork
- **Gaming Items**: Create in-game items and collectibles
- **Identity**: Represent unique identities
- **Certificates**: Issue verifiable certificates

## Advanced Features

- Royalty system for creators
- Metadata storage (IPFS integration)
- Batch operations
- Cross-chain transfers via XCM

## Resources

- [NFT Standards](https://github.com/rmrk-team/rmrk-spec)
- [IPFS Integration](https://docs.ipfs.io/)
- [XCM for NFTs](https://wiki.polkadot.network/docs/learn-xcm)


