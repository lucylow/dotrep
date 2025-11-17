# 🚀 Dockerized Polkadot Development Stack

A one-command development environment for Polkadot hackathon projects using Docker Compose.

## ✨ Features

- **One-Command Setup**: Get a full Polkadot development environment running in seconds
- **Complete Stack**: Polkadot node, Polkadot-JS Apps, Block Explorer, and Asset Hub
- **Production Ready**: Includes monitoring, health checks, and proper networking
- **Sample Projects**: Pre-configured examples for common use cases
- **Developer Friendly**: Hot-reload, debugging support, and comprehensive documentation

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│           Docker Compose Stack                  │
├─────────────────┬───────────────┬───────────────┤
│  Polkadot Node  │  Polkadot JS  │  Block        │
│  Container      │  Apps Container│  Explorer     │
│                 │               │  Container    │
└─────────────────┴───────────────┴───────────────┘
         │                 │               │
         └─────────────────┼───────────────┘
                           │
┌─────────────────────────────────────────────────┐
│           Shared Docker Network                   │
└─────────────────────────────────────────────────┘
```

## 📋 Prerequisites

- **Docker**: Version 20.10 or higher
- **Docker Compose**: Version 2.0 or higher
- **Git**: For cloning the repository
- **8GB+ RAM**: Recommended for smooth operation
- **20GB+ Disk Space**: For Docker images and chain data

### Verify Installation

```bash
docker --version
docker-compose --version
```

## 🚀 Quick Start

### 1. Clone and Start

```bash
# Clone the repository (if not already done)
git clone <repository-url>
cd polkadot-deployer-master

# Start all services
docker-compose up -d

# Wait for services to be ready (optional)
./scripts/init-chain.sh
```

### 2. Access the Services

Once started, access the following services:

- **Polkadot-JS Apps**: http://localhost:3000
- **Block Explorer**: http://localhost:3001
- **Prometheus**: http://localhost:9090
- **WebSocket RPC**: ws://localhost:9944
- **HTTP RPC**: http://localhost:9933

### 3. Connect to Local Node

1. Open http://localhost:3000
2. Go to **Settings** → **Networks**
3. Add custom endpoint: `ws://localhost:9944`
4. Name it "Local Node" and save
5. Select "Local Node" from the network dropdown

## 📦 Services

### Polkadot Node

The main Polkadot node running in development mode.

- **Ports**: 9944 (WebSocket), 9933 (HTTP RPC), 30333 (P2P)
- **Data**: Persisted in `./data`
- **Chain**: Development chain with instant finality

### Polkadot-JS Apps

Web-based UI for interacting with Polkadot chains.

- **Port**: 3000
- **Features**: Accounts, Extrinsics, Chain State, Developer Tools

### Block Explorer

Visual block explorer for inspecting chain data.

- **Port**: 3001
- **Features**: Block history, transactions, events

### Asset Hub

Parachain for creating and managing fungible assets.

- **Ports**: 9945 (WebSocket), 9934 (HTTP RPC)
- **Chain**: Rococo Local
- **Use Case**: Asset creation, minting, transfers

### Monitoring (Prometheus)

Metrics collection and monitoring.

- **Port**: 9090
- **Metrics**: Node health, block production, network stats

## 🛠️ Usage

### Starting Services

```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d polkadot-node

# View logs
docker-compose logs -f polkadot-node
```

### Stopping Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (clears chain data)
docker-compose down -v
```

### Rebuilding Containers

```bash
# Rebuild after code changes
docker-compose build

# Rebuild without cache
docker-compose build --no-cache
```

### Checking Status

```bash
# View running containers
docker-compose ps

# Check service health
docker-compose ps | grep -E "Up|Exit"

# View logs
docker-compose logs --tail=100 polkadot-node
```

## 📚 Sample Projects

The repository includes several sample projects to help you get started:

### Basic Pallet

Learn the fundamentals of creating a custom Substrate pallet.

```bash
cd samples/basic-pallet
# Follow the README.md instructions
```

**Location**: `./samples/basic-pallet/`

### Asset Creation

Create and manage fungible tokens using Asset Hub.

```bash
cd samples/asset-creation
# Follow the README.md instructions
```

**Location**: `./samples/asset-creation/`

### NFT Pallet

Build a Non-Fungible Token system.

```bash
cd samples/nft-pallet
# Follow the README.md instructions
```

**Location**: `./samples/nft-pallet/`

### Cross-Chain (XCM)

Send messages and transfer assets between chains.

```bash
cd samples/cross-chain
# Follow the README.md instructions
```

**Location**: `./samples/cross-chain/`

## 🔧 Configuration

### Chain Specification

Edit `./config/chain-spec.json` to customize the chain:

```json
{
  "name": "Development",
  "id": "dev",
  "chainType": "Development",
  "properties": {
    "tokenDecimals": 12,
    "tokenSymbol": "DOT"
  }
}
```

### Docker Compose Override

Create `docker-compose.override.yml` for local customizations:

```yaml
version: '3.8'
services:
  polkadot-node:
    command: [
      "--dev",
      "--ws-external",
      "--rpc-external",
      "--rpc-cors=all",
      "--base-path=/data",
      "--unsafe-rpc-external"  # Add custom flags
    ]
```

### Environment Variables

Set environment variables in `.env` file:

```bash
# .env
POLKADOT_NODE_ARGS=--dev --ws-external
WS_URL=ws://polkadot-node:9944
```

## 🐛 Troubleshooting

### Port Already in Use

If ports are already in use, modify `docker-compose.yml`:

```yaml
services:
  polkadot-node:
    ports:
      - "9945:9944"  # Change host port
```

### Container Won't Start

1. **Check logs**:
   ```bash
   docker-compose logs polkadot-node
   ```

2. **Verify Docker resources**:
   ```bash
   docker system df
   docker system prune -a  # Clean up if needed
   ```

3. **Rebuild containers**:
   ```bash
   docker-compose build --no-cache
   docker-compose up -d
   ```

### Node Not Syncing

1. **Check node health**:
   ```bash
   curl http://localhost:9933/health
   ```

2. **Verify WebSocket connection**:
   ```bash
   curl -H "Content-Type: application/json" \
     -d '{"id":1, "jsonrpc":"2.0", "method": "system_health", "params":[]}' \
     http://localhost:9933
   ```

3. **Restart the node**:
   ```bash
   docker-compose restart polkadot-node
   ```

### Out of Disk Space

Clean up Docker resources:

```bash
# Remove unused containers, networks, images
docker system prune -a --volumes

# Remove specific volumes
docker volume ls
docker volume rm <volume-name>
```

## 🔒 Security Notes

⚠️ **This setup is for DEVELOPMENT ONLY**

- Uses `--dev` mode (insecure, instant finality)
- RPC endpoints are exposed without authentication
- Not suitable for production use
- Never use with real funds

For production deployments, refer to the main [polkadot-deployer documentation](./README.md).

## 📖 Advanced Usage

### Custom Chain Spec

1. Generate a custom chain spec:
   ```bash
   docker-compose exec polkadot-node \
     polkadot build-spec --chain=dev > config/custom-chain-spec.json
   ```

2. Update `docker-compose.yml` to use it:
   ```yaml
   command: [
     "--chain=/config/custom-chain-spec.json",
     # ... other args
   ]
   ```

### Adding Custom Pallets

1. Create your pallet in `./pallets/`
2. Integrate into runtime
3. Rebuild the node container:
   ```bash
   docker-compose build polkadot-node
   docker-compose up -d polkadot-node
   ```

### Network Configuration

Services communicate via the `polkadot-network` Docker network:

```bash
# Inspect network
docker network inspect polkadot-deployer-master_polkadot-network

# Connect external container
docker run --network polkadot-deployer-master_polkadot-network ...
```

## 🎯 Development Workflow

### 1. Start Environment

```bash
docker-compose up -d
./scripts/init-chain.sh
```

### 2. Develop Your Pallet

```bash
# Create your pallet
mkdir -p pallets/my-pallet/src
# ... write your code
```

### 3. Test Locally

```bash
# Use Polkadot-JS Apps at http://localhost:3000
# Or use CLI tools
polkadot-js-api --ws ws://localhost:9944 ...
```

### 4. Iterate

```bash
# Rebuild and restart
docker-compose restart polkadot-node
```

## 📊 Monitoring

### Prometheus Metrics

Access Prometheus at http://localhost:9090

**Key Metrics**:
- `substrate_block_height` - Current block height
- `substrate_finalized_height` - Finalized block height
- `substrate_peers_count` - Number of connected peers

### Health Checks

All services include health checks:

```bash
# Check node health
curl http://localhost:9933/health

# Check container health
docker-compose ps
```

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📝 License

See [LICENSE](./LICENSE) file for details.

## 🔗 Resources

- [Polkadot Wiki](https://wiki.polkadot.network/)
- [Substrate Documentation](https://docs.substrate.io/)
- [Polkadot-JS Documentation](https://polkadot.js.org/docs/)
- [XCM Documentation](https://wiki.polkadot.network/docs/learn-xcm)

## 💡 Tips for Hackathons

1. **Start Early**: Build times can be long, start building images early
2. **Use Samples**: Leverage the sample projects as starting points
3. **Monitor Resources**: Keep an eye on Docker resource usage
4. **Document Your Work**: Update READMEs as you build
5. **Test Often**: Use the block explorer to verify transactions

## 🎉 Getting Help

- Check the [Troubleshooting](#-troubleshooting) section
- Review sample project READMEs
- Open an issue on GitHub
- Join the [Polkadot Discord](https://discord.gg/polkadot)

---

**Happy Building! 🚀**

