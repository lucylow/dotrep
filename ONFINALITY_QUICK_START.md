# Quick Start: OnFinality Setup

Your project has been configured to work with Polkadot Cloud using OnFinality endpoints.

## OnFinality API Key

Your API key: `e9abf123-1540-4a3f-864c-16e3e20a4f3b`

**⚠️ SECURITY:** Never commit this to version control! Always use environment variables.

## Quick Setup

### 1. Create `.env` file in `dotrep-v2/` directory:

```bash
cd dotrep-v2
cat > .env << 'EOF'
# OnFinality API Key (endpoints built automatically)
ONFINALITY_API_KEY=e9abf123-1540-4a3f-864c-16e3e20a4f3b

# Frontend endpoint (Vite needs explicit endpoint)
VITE_POLKADOT_WS_ENDPOINT=wss://polkadot.api.onfinality.io/ws?apikey=e9abf123-1540-4a3f-864c-16e3e20a4f3b

# Other required variables
DATABASE_URL=mysql://user:password@localhost:3306/dotrep
JWT_SECRET=your-jwt-secret-here
NODE_ENV=development
PORT=3000
EOF
```

**Note:** The backend automatically builds endpoints from `ONFINALITY_API_KEY`. The frontend still needs `VITE_POLKADOT_WS_ENDPOINT` set explicitly.

### 2. Start Development Server:

```bash
pnpm install
pnpm dev
```

### 3. Test Connection:

The application will automatically connect to OnFinality when started. Check the console logs for connection status.

## Files Updated

✅ `dotrep-v2/server/_core/env.ts` - Added `ONFINALITY_API_KEY` and endpoint builders
✅ `dotrep-v2/server/_core/polkadotApi.ts` - Updated to use OnFinality endpoint builder
✅ `dotrep-v2/docker-compose.cloud.yml` - Docker Compose configuration (uses env vars)
✅ `config/create.remote.sample-dotrep-cloud.json` - Kubernetes deployment config (uses env vars)
✅ `config/create.remote.sample-enhanced-cloud.json` - Enhanced cloud config (uses env vars)
✅ `dotrep-v2/server/polkadot/polkadot_api_client.ts` - API client (supports both env var names)
✅ `dotrep-v2/ONFINALITY_SETUP.md` - Complete setup guide
✅ `dotrep-v2/ONFINALITY_SECURE_SETUP.md` - Secure API key configuration guide

## Documentation

For detailed setup instructions, see:
- **`dotrep-v2/ONFINALITY_SECURE_SETUP.md`** - Secure API key configuration (recommended)
- **`dotrep-v2/ONFINALITY_SETUP.md`** - Complete setup guide with troubleshooting

## Next Steps

1. ✅ Create `.env` file with OnFinality endpoints
2. ✅ Install dependencies: `pnpm install`
3. ✅ Start development server: `pnpm dev`
4. ✅ Verify connection in console logs
5. ✅ Deploy using updated configuration files

## Security Note

⚠️ **Never commit `.env` files to version control!** The API key is sensitive.

