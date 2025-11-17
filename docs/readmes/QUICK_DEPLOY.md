# Quick Deploy to Polkadot Cloud Testnet

This guide will help you deploy DotRep to Polkadot Cloud testnet (Westend) in 5 steps.

## ⚡ Quick Start

### Step 1: Install Prerequisites

```bash
# Install Node.js (if not installed)
# Visit: https://nodejs.org/

# Install Docker
# Visit: https://www.docker.com/get-started

# Install Google Cloud SDK (for GCP deployment)
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Install kubectl
# macOS:
brew install kubectl
# Linux:
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
```

### Step 2: Set Up GCP Project

```bash
# Login to GCP
gcloud auth login
gcloud auth application-default login

# Set your project ID
export GCP_PROJECT_ID="your-gcp-project-id"
gcloud config set project $GCP_PROJECT_ID

# Enable required APIs
gcloud services enable container.googleapis.com
gcloud services enable compute.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Configure Docker for GCR
gcloud auth configure-docker
```

### Step 3: Update Configuration

Edit `config/create.remote.dotrep-testnet.json`:

1. **Update GCP Project ID**:
   ```json
   "projectID": "your-actual-gcp-project-id"
   ```

2. **Update Database URL** (optional - can use local for testing):
   ```json
   "DATABASE_URL": "postgresql://user:pass@host:5432/dotrep_testnet"
   ```

3. **Update JWT Secret**:
   ```json
   "JWT_SECRET": "your-secure-random-secret"
   ```

### Step 4: Deploy

**Option A: Using the automated script**
```bash
export GCP_PROJECT_ID="your-gcp-project-id"
./scripts/deploy-testnet.sh
```

**Option B: Manual deployment**
```bash
# Build Docker image
cd dotrep-v2
docker build -t dotrep-v2:testnet .

# Tag and push to GCR
docker tag dotrep-v2:testnet gcr.io/$GCP_PROJECT_ID/dotrep-v2:testnet
docker push gcr.io/$GCP_PROJECT_ID/dotrep-v2:testnet

# Deploy
cd ..
node . create --config config/create.remote.dotrep-testnet.json --verbose
```

### Step 5: Verify Deployment

```bash
# Check deployment status
node . status dotrep-testnet

# View pods
kubectl get pods

# View logs
kubectl logs -f <pod-name>

# Check ingress
kubectl get ingress

# Port forward to test locally
kubectl port-forward svc/dotrep-testnet 3000:3000
# Then visit: http://localhost:3000
```

## 🌐 Access Your Application

After deployment, your application will be available at:

- **If domain configured**: `https://testnet.dotrep.io`
- **Or use Load Balancer IP**: Check with `kubectl get ingress`

## 🔗 Testnet Configuration

DotRep is configured to connect to:
- **Chain**: Westend (Polkadot Testnet)
- **RPC Endpoints**:
  - `wss://westend-rpc.polkadot.io`
  - `wss://westend.api.onfinality.io/public-ws`
  - `wss://westend-rpc.dwellir.com`

## 🛠️ Troubleshooting

### Issue: GCP authentication failed
```bash
gcloud auth login
gcloud auth application-default login
```

### Issue: Docker push failed
```bash
gcloud auth configure-docker
```

### Issue: kubectl not configured
```bash
gcloud container clusters get-credentials <cluster-name> --zone <zone>
```

### Issue: Pods not starting
```bash
# Check pod status
kubectl describe pod <pod-name>

# Check logs
kubectl logs <pod-name>

# Check events
kubectl get events --sort-by='.lastTimestamp'
```

## 📊 Monitoring

Access monitoring:
- **Prometheus**: Automatically configured
- **Logs**: `kubectl logs -f <pod-name>`
- **Events**: `kubectl get events`

## 🔄 Update Deployment

```bash
# Build new image
cd dotrep-v2
docker build -t dotrep-v2:testnet-v2 .

# Push
docker push gcr.io/$GCP_PROJECT_ID/dotrep-v2:testnet-v2

# Update
kubectl set image deployment/dotrep-testnet dotrep-v2=gcr.io/$GCP_PROJECT_ID/dotrep-v2:testnet-v2
```

## 🧹 Cleanup

To remove the deployment:
```bash
node . destroy dotrep-testnet --verbose
```

## ⚠️ Important Notes

1. **GCP Costs**: This will create GKE cluster resources that incur costs
2. **Database**: Configure a database URL or the app may fail to start
3. **Domain**: Domain configuration is optional but recommended for production
4. **Secrets**: Change JWT_SECRET and other secrets in production

## 📝 What's Next?

After successful deployment:
1. Verify Polkadot connection in logs
2. Test contribution submission
3. Test reputation queries
4. Monitor resource usage
5. Set up alerts

## 🆘 Need Help?

- Check logs: `kubectl logs -f <pod-name>`
- View status: `node . status dotrep-testnet`
- Read full guide: `DEPLOYMENT_TESTNET.md`

---

**Ready to deploy?** Run:
```bash
export GCP_PROJECT_ID="your-project-id"
./scripts/deploy-testnet.sh
```

