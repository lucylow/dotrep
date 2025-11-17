#!/bin/bash

# Initialize Polkadot development chain
# This script waits for the node to be ready and performs initial setup

set -e

echo "🚀 Initializing Polkadot development environment..."

# Wait for node to be ready
echo "⏳ Waiting for Polkadot node to be ready..."
./scripts/wait-for-it.sh localhost:9944 -t 60

if [ $? -ne 0 ]; then
    echo "❌ Failed to connect to Polkadot node"
    exit 1
fi

echo "✅ Polkadot node is ready!"

# Wait a bit more for the node to fully initialize
sleep 5

# Check if we can connect via RPC
echo "🔍 Checking RPC connection..."
RPC_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{"id":1, "jsonrpc":"2.0", "method": "system_health", "params":[]}' \
    http://localhost:9933 || echo "{}")

if echo "$RPC_RESPONSE" | grep -q "peers"; then
    echo "✅ RPC connection successful"
else
    echo "⚠️  RPC connection check failed, but continuing..."
fi

# Display connection information
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Polkadot Development Environment Ready!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📡 Connection Endpoints:"
echo "   • WebSocket RPC: ws://localhost:9944"
echo "   • HTTP RPC:      http://localhost:9933"
echo ""
echo "🌐 Web Interfaces:"
echo "   • Polkadot-JS Apps:  http://localhost:3000"
echo "   • Block Explorer:    http://localhost:3001"
echo "   • Prometheus:         http://localhost:9090"
echo ""
echo "💡 Quick Start:"
echo "   1. Open http://localhost:3000 in your browser"
echo "   2. Connect to 'Local Node (127.0.0.1:9944)'"
echo "   3. Start developing!"
echo ""
echo "📚 Sample Projects:"
echo "   • Basic Pallet:      ./samples/basic-pallet"
echo "   • Asset Creation:    ./samples/asset-creation"
echo "   • NFT Pallet:        ./samples/nft-pallet"
echo "   • Cross-Chain:       ./samples/cross-chain"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"


