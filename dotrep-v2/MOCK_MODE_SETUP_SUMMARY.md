# Mock Mode Setup Summary

## What Was Implemented

A comprehensive mock mode system has been set up that allows the DotRep frontend to run standalone on Lovable with mock data, while still supporting full backend functionality with blockchain integration.

## Files Created

### Core Mock Infrastructure

1. **`server/_core/mockConfig.ts`** - Configuration system for mock mode
   - Environment variable detection
   - Mock mode toggle functions
   - API URL configuration

2. **`server/_core/mockDataProviders.ts`** - Mock data generators
   - Functions to generate mock data for all endpoints
   - Reputation calculations
   - Multi-chain reputation
   - Governance proposals, NFTs, chain info, etc.

3. **`server/_core/mockRouter.ts`** - Complete mock tRPC router
   - Mirrors all real router endpoints
   - Returns mock data for all operations
   - ~700 lines covering all API endpoints

4. **`server/_core/mockServer.ts`** - Standalone mock server
   - Runs independently on port 3001
   - No database or blockchain dependencies
   - Perfect for Lovable development

### Frontend Support

5. **`client/src/_core/mockMode.ts`** - Frontend mock mode detection
   - Detects mock mode from environment variables
   - Provides utilities for UI indicators

6. **`client/src/components/MockModeIndicator.tsx`** - UI component
   - Displays banner when in mock mode
   - Can be added to any page

### Documentation

7. **`MOCK_MODE_README.md`** - Comprehensive documentation
8. **`QUICK_START_MOCK.md`** - Quick start guide for Lovable
9. **`.env.example`** - Example environment variables

## Files Modified

1. **`server/_core/index.ts`** - Main server now supports mock mode toggle
2. **`package.json`** - Added scripts for mock mode:
   - `pnpm run mock:dev` - Standalone mock server (dev)
   - `pnpm run mock` - Standalone mock server (prod)
   - `pnpm run dev:mock` - Main server with mock mode
   - `pnpm run start:mock` - Main server with mock mode (prod)

## How It Works

### Mock Mode Detection

The system checks for mock mode in this order:
1. `MOCK_MODE=true` environment variable
2. `NODE_ENV=lovable` 
3. `VITE_MOCK_MODE=true` (frontend)
4. Manual localStorage override

### Router Selection

When mock mode is enabled:
- Main server uses `mockRouter` instead of `appRouter`
- All tRPC endpoints return mock data
- No database or blockchain calls are made

### Mock Data

Mock data includes:
- 5 contributors with varying reputation scores
- 5 contributions across different repos
- 4 achievements
- Mock reputation calculations
- Mock governance proposals
- Mock NFTs based on reputation
- Mock chain information
- Mock analytics data

## Usage

### For Lovable Development

1. **Start mock server**:
   ```bash
   pnpm run mock:dev
   ```

2. **In Lovable**, set environment variable:
   ```
   VITE_MOCK_MODE=true
   ```

3. **All features work** with mock data - no backend setup needed!

### For Full Stack Development

1. **Real mode** (default):
   ```bash
   pnpm run dev
   ```
   - Requires database and blockchain connections
   - Uses real data

2. **Mock mode**:
   ```bash
   pnpm run dev:mock
   ```
   - No dependencies required
   - Uses mock data

## Endpoints Covered

All tRPC endpoints have mock implementations:

✅ **System** - Health checks, notifications
✅ **Auth** - Mock user authentication
✅ **Contributor** - CRUD operations
✅ **Contribution** - List, get by contributor, recent
✅ **Achievement** - List, get by contributor
✅ **Anchor** - Recent anchors, total count
✅ **Polkadot** - Reputation, XCM, governance, NFTs, chain info
✅ **Cloud** - Verification, storage, monitoring
✅ **GitHub** - Backfill, webhook health
✅ **Analytics** - Contributions, merged ratio, anomalies, scores
✅ **Metrics** - Impact metrics
✅ **Community Notes** - Publish, get, statistics
✅ **Trust** - Staking, payments, escrow, trust scores
✅ **Identity** - Account creation, trust scores
✅ **Agents** - AI agents, influencer finding, sybil detection

## Benefits

1. **Fast Development** - No setup time, instant feedback
2. **No Dependencies** - Works without database/blockchain
3. **Full Feature Parity** - All UI features work
4. **Easy Testing** - Deterministic mock data
5. **Lovable Ready** - Perfect for Lovable platform
6. **Flexible** - Easy to switch between modes

## Next Steps

To extend mock mode:

1. **Add more mock data** in `client/src/data/mockData.ts`
2. **Enhance mock providers** in `server/_core/mockDataProviders.ts`
3. **Add scenarios** for different use cases
4. **Implement persistence** (localStorage) for mock data
5. **Add mock data editor** UI for testing

## Testing

To verify mock mode is working:

1. Start mock server: `pnpm run mock:dev`
2. Check health: `curl http://localhost:3001/health`
3. Test endpoint: `curl http://localhost:3001/api/trpc/contributor.getAll`
4. Should see mock data in response

## Troubleshooting

See `MOCK_MODE_README.md` for detailed troubleshooting guide.

---

**Status**: ✅ Complete and ready to use!

All endpoints are implemented, documentation is complete, and the system is ready for Lovable development.

