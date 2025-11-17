# Frontend-Backend Feature Mapping

## ✅ Implemented Features

### Auth
- ✅ `auth.me` - Used in useAuth hook
- ✅ `auth.logout` - Used in useAuth hook

### Contributor
- ✅ `contributor.me` - Used in EnhancedDashboard
- ⚠️ `contributor.getByGithubUsername` - Not directly used in UI
- ⚠️ `contributor.getAll` - LeaderboardPage exists but may not use this
- ⚠️ `contributor.getStats` - Not used in UI

### Contribution
- ✅ `contribution.list` - Used in EnhancedDashboard
- ⚠️ `contribution.getByContributor` - May be used but need to verify
- ⚠️ `contribution.getRecent` - Not used in UI

### Achievement
- ✅ `achievement.list` - Used in EnhancedDashboard
- ⚠️ `achievement.getByContributor` - May be used but need to verify

### Anchor
- ❌ `anchor.getRecent` - No UI component
- ❌ `anchor.getTotal` - No UI component

### Polkadot Reputation
- ⚠️ `polkadot.reputation.get` - May be used in wallet connection
- ⚠️ `polkadot.reputation.getContributionCount` - May be used
- ⚠️ `polkadot.reputation.hasSufficient` - Not used in UI
- ⚠️ `polkadot.reputation.preview` - Not used in UI
- ❌ `polkadot.reputation.getMultiChain` - No UI component
- ❌ `polkadot.reputation.getContextAware` - No UI component

### Polkadot XCM
- ⚠️ `polkadot.xcm.initiateQuery` - XcmGatewayPage exists but need to verify usage
- ⚠️ `polkadot.xcm.verifyCrossChain` - XcmGatewayPage exists but need to verify usage

### Polkadot Governance
- ⚠️ `polkadot.governance.getProposals` - GovernancePage exists but need to verify usage

### Polkadot NFT
- ⚠️ `polkadot.nft.getByAccount` - NftGalleryPage exists but need to verify usage

### Polkadot Chain
- ❌ `polkadot.chain.getInfo` - No UI component
- ❌ `polkadot.chain.getCurrentBlock` - No UI component

### Cloud Verification
- ❌ `cloud.verification.verify` - No UI component
- ❌ `cloud.verification.batchVerify` - No UI component
- ❌ `cloud.verification.getStatus` - No UI component

### Cloud Storage
- ❌ `cloud.storage.storeProof` - No UI component
- ❌ `cloud.storage.retrieveProof` - No UI component

### Cloud Reputation
- ❌ `cloud.reputation.calculate` - No UI component

### Cloud Monitoring
- ❌ `cloud.monitoring.trackEvent` - No UI component
- ❌ `cloud.monitoring.generateReport` - No UI component

### System
- ⚠️ `system.health` - May be used internally
- ❌ `system.notifyOwner` - Admin only, no UI needed

## 📋 Missing Frontend Components

1. **Leaderboard Page** - Use `contributor.getAll`
2. **Contributor Profile Page** - Use `contributor.getByGithubUsername`, `getStats`
3. **Anchor Explorer** - Use `anchor.getRecent`, `getTotal`
4. **Multi-Chain Reputation View** - Use `polkadot.reputation.getMultiChain`
5. **Context-Aware Reputation** - Use `polkadot.reputation.getContextAware`
6. **Chain Info Page** - Use `polkadot.chain.getInfo`, `getCurrentBlock`
7. **Cloud Verification Interface** - Use `cloud.verification.*`
8. **Cloud Storage Interface** - Use `cloud.storage.*`
9. **Reputation Calculator** - Use `cloud.reputation.calculate`
10. **Monitoring Dashboard** - Use `cloud.monitoring.*`


