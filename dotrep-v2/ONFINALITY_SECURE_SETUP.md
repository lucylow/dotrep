# Secure OnFinality API Key Configuration

This guide shows you how to securely configure your OnFinality API key for the DotRep application.

## Your OnFinality API Key

Your API key: `e9abf123-1540-4a3f-864c-16e3e20a4f3b`

**⚠️ IMPORTANT:** Never commit this API key to version control! Always use environment variables.

## Quick Setup

### 1. Create `.env` file

Create a `.env` file in the `dotrep-v2/` directory:

```bash
cd dotrep-v2
cat > .env << 'EOF'
# OnFinality API Key (get from https://app.onfinality.io)
ONFINALITY_API_KEY=e9abf123-1540-4a3f-864c-16e3e20a4f3b

# These will be auto-generated from ONFINALITY_API_KEY if not set
# Or set them manually if you prefer:
# POLKADOT_WS_ENDPOINT=wss://polkadot.api.onfinality.io/ws?apikey=e9abf123-1540-4a3f-864c-16e3e20a4f3b
# POLKADOT_HTTP_ENDPOINT=https://polkadot.api.onfinality.io/rpc?apikey=e9abf123-1540-4a3f-864c-16e3e20a4f3b

# Frontend endpoint (Vite will use this)
VITE_POLKADOT_WS_ENDPOINT=wss://polkadot.api.onfinality.io/ws?apikey=e9abf123-1540-4a3f-864c-16e3e20a4f3b

# Other required variables
DATABASE_URL=mysql://user:password@localhost:3306/dotrep
JWT_SECRET=your-jwt-secret-here-change-in-production
NODE_ENV=development
PORT=3000
EOF
```

### 2. Verify `.env` is in `.gitignore`

Make sure your `.env` file is not tracked by git:

```bash
# Check if .env is ignored
git check-ignore .env

# If not ignored, add to .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.*.local" >> .gitignore
```

## How It Works

The application automatically builds OnFinality endpoints from the `ONFINALITY_API_KEY` environment variable:

1. **Backend** (`server/_core/env.ts`):
   - `getOnFinalityWsEndpoint()` - Builds WebSocket endpoint
   - `getOnFinalityHttpEndpoint()` - Builds HTTP RPC endpoint

2. **Automatic Fallback**:
   - If `ONFINALITY_API_KEY` is set, endpoints are built automatically
   - If not set, falls back to `POLKADOT_WS_ENDPOINT` / `POLKADOT_HTTP_ENDPOINT` env vars
   - If neither is set, defaults to local node (`ws://127.0.0.1:9944`)

## Docker Compose Setup

For Docker Compose, set the environment variable:

```bash
# Option 1: Use .env file (recommended)
ONFINALITY_API_KEY=e9abf123-1540-4a3f-864c-16e3e20a4f3b docker-compose -f docker-compose.cloud.yml up

# Option 2: Export in shell
export ONFINALITY_API_KEY=e9abf123-1540-4a3f-864c-16e3e20a4f3b
docker-compose -f docker-compose.cloud.yml up
```

## Kubernetes/Cloud Deployment

For Kubernetes deployments, use secrets:

### 1. Create Kubernetes Secret

```bash
kubectl create secret generic onfinality-api-key \
  --from-literal=ONFINALITY_API_KEY=e9abf123-1540-4a3f-864c-16e3e20a4f3b
```

### 2. Update Deployment Config

In your `config/create.remote.sample-dotrep-cloud.json`, the endpoints will be built from the secret:

```json
{
  "dotrep": {
    "env": {
      "ONFINALITY_API_KEY": "${ONFINALITY_API_KEY}"
    }
  }
}
```

### 3. Deploy with Secret

```bash
# Set environment variable before deployment
export ONFINALITY_API_KEY=e9abf123-1540-4a3f-864c-16e3e20a4f3b

# Deploy
node . create --config config/create.remote.sample-dotrep-cloud.json --verbose
```

## Environment Variable Priority

The application uses the following priority order:

1. **`ONFINALITY_API_KEY`** (highest priority) - Automatically builds endpoints
2. **`POLKADOT_WS_ENDPOINT`** / **`POLKADOT_HTTP_ENDPOINT`** - Direct endpoint URLs
3. **Default** - `ws://127.0.0.1:9944` (local development)

## Security Best Practices

### ✅ DO:

- ✅ Store API key in `.env` file (never commit to git)
- ✅ Use environment variables in production
- ✅ Use Kubernetes secrets for cloud deployments
- ✅ Use secret management services (AWS Secrets Manager, HashiCorp Vault)
- ✅ Rotate API keys regularly
- ✅ Use different API keys for dev/staging/production

### ❌ DON'T:

- ❌ Commit `.env` files to version control
- ❌ Hardcode API keys in source code
- ❌ Share API keys in chat/email
- ❌ Use the same API key for all environments
- ❌ Log API keys in application logs

## Verifying Configuration

### Test Backend Connection

```typescript
import { getOnFinalityWsEndpoint } from './server/_core/env';

console.log('WebSocket Endpoint:', getOnFinalityWsEndpoint());
// Should output: wss://polkadot.api.onfinality.io/ws?apikey=e9abf123-1540-4a3f-864c-16e3e20a4f3b
```

### Test Frontend Connection

The frontend uses `VITE_POLKADOT_WS_ENDPOINT`. Make sure it's set in your `.env`:

```bash
# Check if variable is set
echo $VITE_POLKADOT_WS_ENDPOINT

# Or in your code
console.log(import.meta.env.VITE_POLKADOT_WS_ENDPOINT);
```

## Troubleshooting

### API Key Not Working

1. **Verify API key is correct**: Check at https://app.onfinality.io/workspaces/7395576692084289536/apiservices/7395577431372312576/settings
2. **Check environment variable**: `echo $ONFINALITY_API_KEY`
3. **Check .env file**: Make sure it's in the correct location (`dotrep-v2/.env`)
4. **Restart server**: Environment variables are loaded at startup

### Endpoints Not Building

If endpoints aren't being built automatically:

1. Check `ONFINALITY_API_KEY` is set: `process.env.ONFINALITY_API_KEY`
2. Set `POLKADOT_WS_ENDPOINT` manually as fallback
3. Check server logs for connection errors

## Getting Your API Key

1. Go to [OnFinality Dashboard](https://app.onfinality.io/workspaces/7395576692084289536/apiservices/7395577431372312576/settings)
2. Navigate to your API service settings
3. Copy your API key
4. Store it securely in your `.env` file

## Additional Resources

- [OnFinality Documentation](https://onfinality.io/docs)
- [Environment Variables Guide](./ONFINALITY_SETUP.md)
- [Polkadot Cloud Integration](./POLKADOT_CLOUD_INTEGRATION.md)

