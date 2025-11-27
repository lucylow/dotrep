# Quick Start: Mock Mode for Lovable

This guide will help you quickly set up and run DotRep in mock mode for Lovable development.

## Prerequisites

- Node.js 18+ and pnpm installed
- No database or blockchain setup required! 🎉

## Step 1: Install Dependencies

```bash
cd dotrep-v2
pnpm install
```

## Step 2: Start Mock Server

In one terminal, start the mock server:

```bash
pnpm run mock:dev
```

The mock server will start on `http://localhost:3001` and you'll see:
```
🎭 Mock Server running on http://localhost:3001/
⚡ tRPC API (mock) available at http://localhost:3001/api/trpc/*
📝 Running in MOCK MODE - all data is simulated
```

## Step 3: Configure Frontend (for Lovable)

### Option A: Use Environment Variable

In Lovable, set the environment variable:
```
VITE_MOCK_MODE=true
```

### Option B: Point to Mock Server

If running mock server separately, configure the frontend to use:
```
API_URL=http://localhost:3001
```

## Step 4: Verify It's Working

1. Open the application in your browser
2. You should see a yellow "🎭 Mock Mode" banner at the top
3. All features should work with mock data:
   - View contributors and their reputation
   - See contributions and achievements
   - Browse governance proposals
   - View NFTs
   - Use analytics dashboard

## Available Mock Data

- **5 Contributors** with reputation scores ranging from 750 to 2100
- **5 Contributions** across different repositories
- **4 Achievements** for various milestones
- **2 Governance Proposals** (Active and Pending)
- **Mock NFTs** based on reputation thresholds
- **Mock Chain Info** for Polkadot parachain

## Troubleshooting

### Port Already in Use

If port 3001 is busy, use a different port:
```bash
PORT=3002 pnpm run mock:dev
```

### Frontend Can't Connect

1. Check that mock server is running: `curl http://localhost:3001/health`
2. Check browser console for CORS errors
3. Verify environment variables are set correctly

### No Mock Data Showing

1. Clear browser cache
2. Check browser console for errors
3. Verify `VITE_MOCK_MODE=true` is set
4. Reload the page

## Next Steps

- **Extend mock data**: Edit `client/src/data/mockData.ts`
- **Add more scenarios**: Edit `server/_core/mockDataProviders.ts`
- **Switch to real mode**: See `MOCK_MODE_README.md` for details

## Commands Reference

```bash
# Start mock server (development with hot reload)
pnpm run mock:dev

# Start mock server (production)
pnpm run mock

# Start main server with mock mode
pnpm run dev:mock

# Start main server (real mode)
pnpm run dev
```

## For Lovable Specifically

1. **Start mock server locally** on your machine
2. **In Lovable**:
   - Set `VITE_MOCK_MODE=true`
   - The frontend will automatically use mock data
   - Or configure Lovable to proxy API requests to your local mock server

That's it! You're ready to develop on Lovable with mock data. 🚀

