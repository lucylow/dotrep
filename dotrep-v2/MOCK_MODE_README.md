# Mock Mode Documentation

This document explains how to run the DotRep application in mock mode, which allows the frontend to run standalone on Lovable with mock data, without requiring a full backend, database, or blockchain connections.

## Overview

Mock mode provides:
- ✅ **Standalone frontend** - Run frontend only with mock data
- ✅ **Mock backend API** - All tRPC endpoints return simulated data
- ✅ **No dependencies** - No database, blockchain, or DKG connections required
- ✅ **Full feature parity** - All UI features work with mock data
- ✅ **Easy switching** - Toggle between mock and real mode via environment variables

## Running in Mock Mode

### Option 1: Standalone Mock Server (Recommended for Lovable)

Run the standalone mock server that provides all API endpoints:

```bash
# Development mode with hot reload
pnpm run mock:dev

# Production mode
pnpm run mock
```

The mock server will run on `http://localhost:3001` by default.

### Option 2: Main Server with Mock Mode

Run the main server with mock mode enabled:

```bash
# Development mode
pnpm run dev:mock

# Production mode
pnpm run start:mock
```

The server will run on `http://localhost:3000` by default and use the mock router instead of the real router.

## Environment Variables

Set these environment variables to control mock mode:

### Backend Environment Variables

- `MOCK_MODE=true` - Enable mock mode (uses mock router)
- `MOCK_DATABASE=true` - Use mock database (optional, auto-enabled in mock mode)
- `MOCK_POLKADOT=true` - Use mock Polkadot API (optional, auto-enabled in mock mode)
- `MOCK_DKG=true` - Use mock DKG client (optional, auto-enabled in mock mode)
- `MOCK_BLOCKCHAIN=true` - Use mock blockchain (optional, auto-enabled in mock mode)
- `PORT=3001` - Port for mock server (default: 3001)

### Frontend Environment Variables

Create a `.env` file in `dotrep-v2/`:

```env
# Enable mock mode in frontend
VITE_MOCK_MODE=true

# Or for Lovable specifically
VITE_LOVABLE=true
```

## For Lovable Development

When developing on Lovable, you can:

1. **Run the mock server separately** (recommended):
   ```bash
   # In one terminal
   pnpm run mock:dev
   
   # In Lovable, point your frontend to http://localhost:3001
   ```

2. **Use environment variables**:
   - Set `VITE_MOCK_MODE=true` in Lovable's environment settings
   - The frontend will automatically use mock data if the backend is unavailable

3. **Manual override** (for testing):
   - Open browser console
   - Run: `localStorage.setItem('mockMode', 'true')`
   - Reload the page

## Mock Data

Mock data is provided in:
- `client/src/data/mockData.ts` - Base mock data (contributors, contributions, achievements)
- `server/_core/mockDataProviders.ts` - Mock data providers for all endpoints
- `server/_core/mockRouter.ts` - Mock router implementation

### Available Mock Data

- **5 Contributors** with varying reputation scores
- **5 Contributions** across different repos
- **4 Achievements** for different contributors
- **Mock reputation scores** calculated from contributor data
- **Mock governance proposals** (2 proposals)
- **Mock NFTs** based on reputation thresholds
- **Mock chain info** for Polkadot parachain
- **Mock anchors** (10 recent anchors)

## API Endpoints

All tRPC endpoints are available in mock mode:

- `system.*` - System health and notifications
- `auth.*` - Authentication (mock user)
- `contributor.*` - Contributor data
- `contribution.*` - Contribution data
- `achievement.*` - Achievement data
- `anchor.*` - Anchor data
- `polkadot.*` - Polkadot integration (mock)
- `cloud.*` - Cloud services (mock)
- `github.*` - GitHub integration (mock)
- `analytics.*` - Analytics (mock)
- `communityNotes.*` - Community notes (mock)
- `trust.*` - Trust layer (mock)
- `identity.*` - Identity (mock)
- `agents.*` - AI agents (mock)

## Switching Between Modes

### From Mock to Real Mode

1. **Stop the mock server** (if running separately)
2. **Set environment variables**:
   ```bash
   unset MOCK_MODE
   unset VITE_MOCK_MODE
   ```
3. **Start the real server**:
   ```bash
   pnpm run dev
   ```
4. **Ensure database and blockchain connections** are configured

### From Real to Mock Mode

1. **Stop the real server**
2. **Set environment variables**:
   ```bash
   export MOCK_MODE=true
   export VITE_MOCK_MODE=true
   ```
3. **Start mock server**:
   ```bash
   pnpm run mock:dev
   ```

## Differences Between Mock and Real Mode

| Feature | Mock Mode | Real Mode |
|---------|-----------|-----------|
| Database | ❌ No database required | ✅ Requires MySQL/PostgreSQL |
| Blockchain | ❌ No blockchain connection | ✅ Requires Polkadot node |
| DKG | ❌ No DKG connection | ✅ Requires DKG node |
| Data | 📝 Simulated data | 📊 Real data from database |
| Transactions | ❌ No real transactions | ✅ Real blockchain transactions |
| GitHub OAuth | ❌ Mock user | ✅ Real GitHub OAuth |
| Webhooks | ❌ No webhooks | ✅ Real GitHub webhooks |

## Troubleshooting

### Mock server won't start

- Check if port 3001 is available: `lsof -i :3001`
- Try a different port: `PORT=3002 pnpm run mock:dev`

### Frontend can't connect to mock server

- Ensure mock server is running
- Check CORS settings if running on different ports
- Verify the API URL in frontend configuration

### Mock data not showing

- Check browser console for errors
- Verify `VITE_MOCK_MODE=true` is set
- Clear browser cache and reload
- Check that mock server is responding: `curl http://localhost:3001/health`

## Development Tips

1. **Use mock mode for UI development** - Faster iteration without backend dependencies
2. **Use real mode for integration testing** - Test full stack functionality
3. **Mock data is deterministic** - Same inputs return same outputs (good for testing)
4. **Extend mock data** - Add more mock data in `mockData.ts` and `mockDataProviders.ts`

## Example: Running on Lovable

1. **Start mock server locally**:
   ```bash
   cd dotrep-v2
   pnpm run mock:dev
   ```

2. **In Lovable**:
   - Set environment variable: `VITE_MOCK_MODE=true`
   - Configure API URL to point to your local mock server (if needed)
   - Or use Lovable's built-in proxy to forward `/api/trpc` requests

3. **Test the application**:
   - All features should work with mock data
   - No database or blockchain setup required
   - Fast development cycle

## Next Steps

- Add more mock data scenarios
- Implement mock data persistence (localStorage)
- Add mock data editor UI
- Create mock data import/export

