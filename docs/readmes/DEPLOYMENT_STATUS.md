# DotRep Testnet Deployment Status

## ✅ What's Been Prepared

### 1. Testnet Configuration Created ✅
- **File**: `config/create.remote.dotrep-testnet.json`
- **Chain**: Westend (Polkadot Testnet)
- **RPC Endpoints**: Configured for Westend testnet
- **Environment**: Testnet-optimized settings

### 2. Deployment Script Created ✅
- **File**: `scripts/deploy-testnet.sh`
- **Features**: Automated build, push, and deploy
- **Status**: Ready to use

### 3. Documentation Created ✅
- **Quick Start**: `QUICK_DEPLOY.md`
- **Full Guide**: `DEPLOYMENT_TESTNET.md`
- **Status**: Complete

## 🔧 Prerequisites Status

| Tool | Status | Version |
|------|--------|---------|
| Node.js | ✅ Installed | v22.13.1 |
| Docker | ✅ Installed | v26.0.0 |
| gcloud CLI | ⚠️ Not Found | Required for GCP |
| kubectl | ⚠️ Not Checked | Required for K8s |

## 📋 Next Steps to Deploy

### Step 1: Install Missing Tools (if needed)

**Install Google Cloud SDK:**
```bash
# macOS
brew install google-cloud-sdk

# Linux
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Windows
# Download from: https://cloud.google.com/sdk/docs/install
```

**Install kubectl:**
```bash
# macOS
brew install kubectl

# Linux
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
```

### Step 2: Configure GCP

```bash
# Login to GCP
gcloud auth login
gcloud auth application-default login

# Set your project
export GCP_PROJECT_ID="your-gcp-project-id"
gcloud config set project $GCP_PROJECT_ID

# Enable APIs
gcloud services enable container.googleapis.com
gcloud services enable compute.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Configure Docker
gcloud auth configure-docker
```

### Step 3: Update Configuration

Edit `config/create.remote.dotrep-testnet.json`:

1. **Set GCP Project ID**:
   ```json
   "projectID": "your-actual-gcp-project-id"
   ```

2. **Set Database URL** (if using external database):
   ```json
   "DATABASE_URL": "postgresql://user:pass@host:5432/dotrep_testnet"
   ```

3. **Set JWT Secret**:
   ```json
   "JWT_SECRET": "generate-a-secure-random-secret"
   ```

### Step 4: Deploy

**Option A: Automated Script**
```bash
export GCP_PROJECT_ID="your-gcp-project-id"
./scripts/deploy-testnet.sh
```

**Option B: Manual Steps**
```bash
# 1. Build image
cd dotrep-v2
docker build -t dotrep-v2:testnet .

# 2. Tag and push
docker tag dotrep-v2:testnet gcr.io/$GCP_PROJECT_ID/dotrep-v2:testnet
gcloud auth configure-docker
docker push gcr.io/$GCP_PROJECT_ID/dotrep-v2:testnet

# 3. Deploy
cd ..
node . create --config config/create.remote.dotrep-testnet.json --verbose
```

## 🌐 What Gets Deployed

### Application Layer (dotrep-v2)
- **Image**: `gcr.io/$GCP_PROJECT_ID/dotrep-v2:testnet`
- **Replicas**: 2
- **Resources**: 2Gi memory, 1 CPU (request), 4Gi memory, 2 CPU (limit)

### Network Configuration
- **Chain**: Westend Testnet
- **RPC**: `wss://westend-rpc.polkadot.io`
- **Backup RPCs**: Configured for redundancy

### Features Enabled
- ✅ XCM Support (cross-chain queries)
- ✅ Governance Integration
- ✅ Health Checks
- ✅ Auto-scaling (1-3 replicas)
- ✅ TLS/SSL (via Let's Encrypt)
- ✅ Monitoring (Prometheus)

## 🔍 Verification Steps

After deployment, verify:

```bash
# Check deployment status
node . status dotrep-testnet

# View pods
kubectl get pods

# View logs
kubectl logs -f <pod-name>

# Test health endpoint
kubectl port-forward svc/dotrep-testnet 3000:3000
curl http://localhost:3000/health
```

## ⚠️ Important Notes

1. **GCP Costs**: This creates GKE resources that incur costs (~$50-100/month for minimal setup)
2. **Database**: You'll need a PostgreSQL database (can use Cloud SQL or external)
3. **Domain**: Optional but recommended for production (update `remote.domain` in config)
4. **Secrets**: Change JWT_SECRET before production deployment

## 🆘 Troubleshooting

### Issue: gcloud not found
```bash
# Install gcloud CLI (see Step 1 above)
# Then authenticate: gcloud auth login
```

### Issue: Docker push fails
```bash
gcloud auth configure-docker
gcloud auth login
```

### Issue: Permission denied
```bash
# Make sure you have GCP permissions:
# - Compute Admin
# - Kubernetes Engine Admin
# - Service Account User
```

### Issue: kubectl not configured
```bash
# After cluster is created:
gcloud container clusters get-credentials <cluster-name> --zone <zone>
```

## 📚 Documentation

- **Quick Start**: See `QUICK_DEPLOY.md`
- **Full Guide**: See `DEPLOYMENT_TESTNET.md`
- **Polkadot Integration**: See `dotrep-v2/POLKADOT_SDK_INTEGRATION.md`

## 🎯 Deployment Checklist

Before deploying:

- [ ] gcloud CLI installed and authenticated
- [ ] kubectl installed
- [ ] GCP project created and billing enabled
- [ ] Required APIs enabled
- [ ] Configuration file updated with project ID
- [ ] Database URL configured (if using external DB)
- [ ] JWT_SECRET set to secure value
- [ ] Docker is running
- [ ] Node.js dependencies installed (`npm install`)

## 🚀 Ready to Deploy?

Once all prerequisites are met:

```bash
export GCP_PROJECT_ID="your-gcp-project-id"
./scripts/deploy-testnet.sh
```

Or follow the manual steps in `DEPLOYMENT_TESTNET.md`.

---

**Status**: Configuration ready, awaiting GCP setup and credentials.

**Next Action**: Install gcloud CLI, configure GCP project, then run deployment.

