# DotRep SDK

Client library for interacting with DotRep Monetization API.

## Installation

```bash
npm install dotrep-sdk
# or
import { DotRepSDK } from './sdk/index.js';
```

## Usage

### Basic Setup

```javascript
import { DotRepSDK } from 'dotrep-sdk';
import { ethers } from 'ethers';

// Create wallet (or use existing)
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);

// Initialize SDK
const sdk = new DotRepSDK({
  apiUrl: 'http://localhost:3000',
  wallet: wallet,
});
```

### Get Reputation

```javascript
const reputation = await sdk.getReputationFor('creator123');
console.log(`Reputation score: ${reputation.finalScore}`);
```

### Request Trusted Feed (with automatic payment)

```javascript
const result = await sdk.requestTrustedFeed('creator123');
console.log('Feed:', result.feed);
console.log('Receipt UAL:', result.receiptUAL);
```

### Get Top Creators

```javascript
const topCreators = await sdk.getTopCreators('web3', 10);
topCreators.forEach(creator => {
  console.log(`${creator.creatorId}: ${creator.finalScore}`);
});
```

### Publish Community Note

```javascript
const note = await sdk.publishCommunityNote({
  content: 'This is a community note',
  topic: 'web3',
});
console.log('Note published:', note.ual);
```

## Examples

See `/examples` directory for complete usage examples.

