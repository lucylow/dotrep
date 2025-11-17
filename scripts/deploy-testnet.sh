#!/bin/bash

# DotRep Testnet Deployment Script
# This script deploys DotRep to Polkadot Cloud testnet (Westend)

set -e

echo "🚀 DotRep Testnet Deployment"
echo "=============================="

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if gcloud is installed (for GCP deployment)
if ! command -v gcloud &> /dev/null; then
    echo "⚠️  gcloud CLI is not installed. GCP deployment may fail."
    echo "   Install from: https://cloud.google.com/sdk/docs/install"
fi

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo "⚠️  kubectl is not installed. Kubernetes deployment may fail."
    echo "   Install from: https://kubernetes.io/docs/tasks/tools/"
fi

echo "✅ Prerequisites check complete"
echo ""

# Configuration
CONFIG_FILE="config/create.remote.dotrep-testnet.json"
GCP_PROJECT_ID="${GCP_PROJECT_ID:-}"
IMAGE_TAG="${IMAGE_TAG:-testnet}"

# Check if config file exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ Configuration file not found: $CONFIG_FILE"
    exit 1
fi

# If GCP_PROJECT_ID is not set, try to get from config
if [ -z "$GCP_PROJECT_ID" ]; then
    GCP_PROJECT_ID=$(node -e "const config = require('./$CONFIG_FILE'); console.log(config.remote.projectID);")
    if [ "$GCP_PROJECT_ID" = "your-gcp-project-id" ]; then
        echo "⚠️  Please set GCP_PROJECT_ID environment variable or update config file"
        echo "   export GCP_PROJECT_ID='your-gcp-project-id'"
        exit 1
    fi
fi

echo "📦 Build Configuration:"
echo "   Config: $CONFIG_FILE"
echo "   Project: $GCP_PROJECT_ID"
echo "   Image Tag: $IMAGE_TAG"
echo ""

# Step 1: Build Docker image
echo "🔨 Step 1: Building Docker image..."
cd dotrep-v2

if [ ! -f "Dockerfile" ]; then
    echo "❌ Dockerfile not found in dotrep-v2 directory"
    exit 1
fi

docker build -t dotrep-v2:$IMAGE_TAG .
echo "✅ Docker image built: dotrep-v2:$IMAGE_TAG"

# Step 2: Tag and push to GCR
echo ""
echo "📤 Step 2: Pushing to Google Container Registry..."
GCR_IMAGE="gcr.io/$GCP_PROJECT_ID/dotrep-v2:$IMAGE_TAG"
docker tag dotrep-v2:$IMAGE_TAG $GCR_IMAGE

# Configure docker to use gcloud as credential helper
gcloud auth configure-docker

# Push image
docker push $GCR_IMAGE
echo "✅ Image pushed to: $GCR_IMAGE"

# Step 3: Deploy to Kubernetes
echo ""
echo "☸️  Step 3: Deploying to Kubernetes..."
cd ..

# Update config with actual image
node -e "
const fs = require('fs');
const config = require('./$CONFIG_FILE');
config.dotrep.image.repository = 'gcr.io/$GCP_PROJECT_ID/dotrep-v2';
config.dotrep.image.tag = '$IMAGE_TAG';
fs.writeFileSync('./$CONFIG_FILE', JSON.stringify(config, null, 2));
console.log('✅ Configuration updated with image: gcr.io/$GCP_PROJECT_ID/dotrep-v2:$IMAGE_TAG');
"

# Deploy
echo "🚀 Starting deployment..."
node . create --config $CONFIG_FILE --verbose

echo ""
echo "✅ Deployment initiated!"
echo ""
echo "📊 Next steps:"
echo "   1. Check deployment status: node . status dotrep-testnet"
echo "   2. View pods: kubectl get pods"
echo "   3. View logs: kubectl logs -f <pod-name>"
echo "   4. Check ingress: kubectl get ingress"
echo ""
echo "🌐 Application will be available at: https://testnet.dotrep.io (if domain configured)"
echo ""


