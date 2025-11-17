# Deployment Readiness Checklist

This document ensures DotRep is fully functional and ready for Polkadot Cloud deployment.

## ✅ Code Quality Checks

### Rust Pallet
- [x] All compilation errors fixed
- [x] Mock runtime properly configured
- [x] Tests pass
- [x] Off-chain worker module compiles
- [x] Benchmarking module compiles
- [x] No unused imports or warnings

### Frontend
- [x] TypeScript compilation passes
- [x] All components properly exported
- [x] Judge demo component created
- [x] Polkadot Cloud integration components exist

## 🔧 Build & Test Commands

### Rust Pallet
```bash
cd pallets/reputation
cargo check
cargo test
cargo build --release
```

### Frontend
```bash
cd dotrep-v2
pnpm install
pnpm check  # TypeScript check
pnpm build  # Production build
```

## 📦 Dependencies

### Rust Dependencies (Cargo.toml)
- ✅ frame-support = "4.0.0"
- ✅ frame-system = "4.0.0"
- ✅ pallet-balances = "4.0.0"
- ✅ pallet-timestamp = "4.0.0"
- ✅ sp-core = "6.0.0"
- ✅ sp-runtime = "6.0.0"

### Frontend Dependencies (package.json)
- ✅ @polkadot/api = "^16.5.2"
- ✅ @polkadot/extension-dapp = "^0.62.4"
- ✅ React 19.1.1
- ✅ TypeScript 5.9.3

## 🚀 Deployment Steps

### 1. Pre-Deployment Checks
```bash
# Check Rust code
cd pallets/reputation && cargo check

# Check TypeScript
cd dotrep-v2 && pnpm check

# Run tests
cd pallets/reputation && cargo test
cd dotrep-v2 && pnpm test
```

### 2. Build for Production
```bash
# Build Rust pallet
cd pallets/reputation
cargo build --release

# Build frontend
cd dotrep-v2
pnpm build
```

### 3. Environment Variables
Ensure these are set:
- `DATABASE_URL` - PostgreSQL connection string
- `POLKADOT_WS_URL` - WebSocket URL for Polkadot node
- `SESSION_SECRET` - Session encryption key
- `GITHUB_CLIENT_ID` - GitHub OAuth (optional)
- `GITHUB_CLIENT_SECRET` - GitHub OAuth (optional)

### 4. Database Setup
```bash
cd dotrep-v2
pnpm db:push  # Run migrations
```

### 5. Start Services
```bash
# Development
cd dotrep-v2
pnpm dev

# Production
cd dotrep-v2
pnpm start
```

## 🌐 Polkadot Cloud Deployment

### Requirements
1. Polkadot node running (local or remote)
2. WebSocket endpoint accessible
3. Database configured
4. Environment variables set

### Configuration
- Update `POLKADOT_WS_URL` in environment
- Configure CORS for frontend
- Set up reverse proxy if needed

### Health Checks
- Frontend: `http://localhost:3000`
- API: `http://localhost:3001`
- WebSocket: `ws://localhost:9944` (or configured endpoint)

## 📝 Known Issues & Solutions

### Issue: Off-chain worker not running
**Solution**: Ensure `offchain` feature is enabled in Cargo.toml:
```toml
[features]
offchain = []
```

### Issue: TypeScript errors in demo component
**Solution**: Ensure all imports are correct and components exist

### Issue: Polkadot API connection fails
**Solution**: 
1. Check WebSocket URL is correct
2. Ensure node is running
3. Check CORS settings

## ✅ Final Checklist

Before deploying:
- [ ] All tests pass
- [ ] No compilation errors
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Polkadot node accessible
- [ ] Frontend builds successfully
- [ ] API server starts without errors
- [ ] Health checks pass

## 🎯 Post-Deployment

1. Verify frontend loads
2. Test wallet connection
3. Test reputation queries
4. Monitor logs for errors
5. Check database connections

---

**Status**: ✅ Ready for Deployment


