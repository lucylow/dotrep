#!/bin/bash

# Deploy Escrow Contract to Local Hardhat Network
# Usage: ./scripts/deploy_escrow.sh

set -e

echo "🔨 Compiling Escrow contract..."

# Check if Hardhat is installed
if ! command -v npx &> /dev/null; then
    echo "❌ npx not found. Please install Node.js and npm."
    exit 1
fi

# Create hardhat config if it doesn't exist
if [ ! -f "hardhat.config.js" ]; then
    echo "📝 Creating hardhat.config.js..."
    cat > hardhat.config.js << 'EOF'
require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.19",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545"
    }
  }
};
EOF
fi

# Compile
npx hardhat compile

echo "🚀 Deploying Escrow contract..."

# Deploy script
cat > scripts/deploy_escrow_script.js << 'EOF'
const hre = require("hardhat");

async function main() {
  const feePercent = 250; // 2.5%
  
  console.log("Deploying Escrow with fee percent:", feePercent);
  
  const Escrow = await hre.ethers.getContractFactory("Escrow");
  const escrow = await Escrow.deploy(feePercent);

  await escrow.waitForDeployment();

  const address = await escrow.getAddress();
  console.log("✅ Escrow deployed to:", address);
  console.log("\n📋 Add to your .env file:");
  console.log(`ESCROW_CONTRACT_ADDRESS=${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
EOF

# Run deployment
npx hardhat run scripts/deploy_escrow_script.js --network localhost

echo ""
echo "✅ Deployment complete!"
echo ""
echo "💡 To start a local Hardhat node:"
echo "   npx hardhat node"
echo ""
echo "💡 Then run this script again to deploy to the local node."

