# Polkadot Cloud Setup with OnFinality

This guide will help you set up your DotRep project to work with Polkadot Cloud using OnFinality API endpoints.

## OnFinality API Key Configuration

**⚠️ SECURITY:** Never commit your API key to version control! Always use environment variables.

### Recommended: Use ONFINALITY_API_KEY

The application can automatically build endpoints from your API key. Set this in your `.env`:

```bash
# OnFinality API Key (get from https://app.onfinality.io)
ONFINALITY_API_KEY=e9abf123-1540-4a3f-864c-16e3e20a4f3b
```

The application will automatically build:
- WebSocket: `wss://polkadot.api.onfinality.io/ws?apikey=${ONFINALITY_API_KEY}`
- HTTP RPC: `https://polkadot.api.onfinality.io/rpc?apikey=${ONFINALITY_API_KEY}`

### Alternative: Set Endpoints Directly

If you prefer to set endpoints directly:

```bash
# Polkadot OnFinality Endpoints
POLKADOT_WS_ENDPOINT=wss://polkadot.api.onfinality.io/ws?apikey=e9abf123-1540-4a3f-864c-16e3e20a4f3b
POLKADOT_HTTP_ENDPOINT=https://polkadot.api.onfinality.io/rpc?apikey=e9abf123-1540-4a3f-864c-16e3e20a4f3b

# Frontend WebSocket endpoint (Vite environment variable)
VITE_POLKADOT_WS_ENDPOINT=wss://polkadot.api.onfinality.io/ws?apikey=e9abf123-1540-4a3f-864c-16e3e20a4f3b
```

## Environment Variables Setup

Create a `.env` file in the `dotrep-v2` directory with the following variables:

```bash
# OnFinality API Key (recommended - endpoints built automatically)
ONFINALITY_API_KEY=e9abf123-1540-4a3f-864c-16e3e20a4f3b

# Database Configuration
DATABASE_URL=mysql://user:password@localhost:3306/dotrep

# Redis Configuration (optional)
REDIS_URL=redis://localhost:6379

# JWT Secret for authentication
JWT_SECRET=your-jwt-secret-here-change-in-production

# Server Configuration
NODE_ENV=development
PORT=3000
```

## Quick Start

### 1. Local Development Setup

1. **Copy environment variables:**
   ```bash
   cd dotrep-v2
   cp .env.example .env  # If .env.example exists, or create .env manually
   ```

2. **Set the OnFinality API key in `.env`:**
   ```bash
   echo "ONFINALITY_API_KEY=e9abf123-1540-4a3f-864c-16e3e20a4f3b" >> .env
   echo "VITE_POLKADOT_WS_ENDPOINT=wss://polkadot.api.onfinality.io/ws?apikey=e9abf123-1540-4a3f-864c-16e3e20a4f3b" >> .env
   ```
   
   **Note:** The backend will automatically build endpoints from `ONFINALITY_API_KEY`. The frontend still needs `VITE_POLKADOT_WS_ENDPOINT` set explicitly.

3. **Install dependencies:**
   ```bash
   pnpm install
   ```

4. **Start the development server:**
   ```bash
   pnpm dev
   ```

5. **Start the worker (in another terminal):**
   ```bash
   pnpm dev:worker
   ```

### 2. Docker Compose Setup

The `docker-compose.cloud.yml` file has been updated with OnFinality endpoints as defaults.

1. **Start services:**
   ```bash
   docker-compose -f docker-compose.cloud.yml up --build
   ```

2. **Or override with environment variables:**
   ```bash
   POLKADOT_WS_ENDPOINT=wss://polkadot.api.onfinality.io/ws?apikey=e9abf123-1540-4a3f-864c-16e3e20a4f3b \
   docker-compose -f docker-compose.cloud.yml up
   ```

### 3. Kubernetes/Cloud Deployment

The configuration file `config/create.remote.sample-dotrep-cloud.json` has been updated with OnFinality endpoints.

1. **Deploy using the deployer:**
   ```bash
   node . create --config config/create.remote.sample-dotrep-cloud.json --verbose
   ```

2. **Or update your existing deployment config:**
   ```json
   {
     "dotrep": {
       "env": {
         "POLKADOT_WS_ENDPOINT": "wss://polkadot.api.onfinality.io/ws?apikey=e9abf123-1540-4a3f-864c-16e3e20a4f3b",
         "POLKADOT_HTTP_ENDPOINT": "https://polkadot.api.onfinality.io/rpc?apikey=e9abf123-1540-4a3f-864c-16e3e20a4f3b"
       },
       "polkadot": {
         "wsEndpoints": [
           "wss://polkadot.api.onfinality.io/ws?apikey=e9abf123-1540-4a3f-864c-16e3e20a4f3b"
         ],
         "httpEndpoints": [
           "https://polkadot.api.onfinality.io/rpc?apikey=e9abf123-1540-4a3f-864c-16e3e20a4f3b"
         ]
       }
     }
   }
   ```

## Verification

### Test WebSocket Connection

You can test the WebSocket connection using the Polkadot.js API:

```typescript
import { ApiPromise, WsProvider } from '@polkadot/api';

const provider = new WsProvider('wss://polkadot.api.onfinality.io/ws?apikey=e9abf123-1540-4a3f-864c-16e3e20a4f3b');
const api = await ApiPromise.create({ provider });

// Get chain info
const [chain, nodeName, nodeVersion] = await Promise.all([
  api.rpc.system.chain(),
  api.rpc.system.name(),
  api.rpc.system.version()
]);

console.log(`Connected to ${chain} (${nodeName} v${nodeVersion})`);
```

### Test HTTP RPC Connection

You can test the HTTP endpoint using curl:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"id":1,"jsonrpc":"2.0","method":"system_health","params":[]}' \
  https://polkadot.api.onfinality.io/rpc?apikey=e9abf123-1540-4a3f-864c-16e3e20a4f3b
```

## Configuration Files Updated

The following files have been updated to use OnFinality endpoints:

1. **`dotrep-v2/docker-compose.cloud.yml`** - Docker Compose configuration
2. **`config/create.remote.sample-dotrep-cloud.json`** - Kubernetes deployment configuration

## Frontend Configuration

The frontend uses the `VITE_POLKADOT_WS_ENDPOINT` environment variable. Make sure it's set in your `.env` file:

```bash
VITE_POLKADOT_WS_ENDPOINT=wss://polkadot.api.onfinality.io/ws?apikey=e9abf123-1540-4a3f-864c-16e3e20a4f3b
```

Vite will automatically expose this as `import.meta.env.VITE_POLKADOT_WS_ENDPOINT` in your frontend code.

## Backend Configuration

The backend uses the `POLKADOT_WS_ENDPOINT` environment variable. The `PolkadotApiService` class in `server/_core/polkadotApi.ts` will automatically use this endpoint.

## Troubleshooting

### Connection Issues

1. **Check API key:** Ensure your OnFinality API key is correct and active
2. **Check network:** Ensure your network allows WebSocket connections to OnFinality
3. **Check logs:** Review server logs for connection errors

### Frontend Not Connecting

1. **Check environment variable:** Ensure `VITE_POLKADOT_WS_ENDPOINT` is set
2. **Rebuild frontend:** Run `pnpm build` after changing environment variables
3. **Check browser console:** Look for WebSocket connection errors

### Backend Not Connecting

1. **Check environment variable:** Ensure `POLKADOT_WS_ENDPOINT` is set
2. **Check server logs:** Look for connection errors in the server output
3. **Test endpoint directly:** Use the curl command above to verify the endpoint works

## Security Notes

⚠️ **Important:** The API key in the endpoints is sensitive. 

- **Never commit `.env` files** to version control
- **Use environment variables** in production deployments
- **Rotate API keys** if they are exposed
- **Use secret management** (AWS Secrets Manager, HashiCorp Vault, etc.) in production

## Next Steps

1. **Test the connection** using the verification steps above
2. **Deploy to your environment** using the updated configuration files
3. **Monitor connection health** using the built-in health checks
4. **Set up monitoring** for API usage and connection status

## Additional Resources

- [OnFinality Documentation](https://onfinality.io/docs)
- [Polkadot.js API Documentation](https://polkadot.js.org/docs/)
- [Polkadot Cloud Integration Guide](./POLKADOT_CLOUD_INTEGRATION.md)

