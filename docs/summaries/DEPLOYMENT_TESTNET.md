# DotRep Testnet Deployment Guide

This guide explains how to deploy DotRep to Polkadot Cloud testnet (Westend).

## Prerequisites

1. **GCP Account**: Google Cloud Platform account with billing enabled
2. **gcloud CLI**: Installed and authenticated
3. **kubectl**: Kubernetes CLI installed
4. **Docker**: For building images
5. **Node.js**: For running deployment scripts

## Step 1: Configure GCP Project

```bash
# Set your GCP project ID
export GCP_PROJECT_ID="your-gcp-project-id"
gcloud config set project $GCP_PROJECT_ID

# Enable required APIs
gcloud services enable container.googleapis.com
gcloud services enable compute.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Authenticate
gcloud auth login
gcloud auth application-default login
```

## Step 2: Update Deployment Configuration

Edit `config/create.remote.dotrep-testnet.json`:

1. Update `remote.projectID` with your GCP project ID
2. Update `remote.domain` with your domain (optional)
3. Update `dotrep.image.repository` with your GCR repository
4. Update `dotrep.env.DATABASE_URL` with your database connection string
5. Update `dotrep.env.JWT_SECRET` with a secure secret

```bash
# Edit the configuration file
nano config/create.remote.dotrep-testnet.json
```

## Step 3: Build and Push Docker Image

```bash
cd dotrep-v2

# Build the Docker image
docker build -t dotrep-v2:testnet .

# Tag for GCR
docker tag dotrep-v2:testnet gcr.io/$GCP_PROJECT_ID/dotrep-v2:testnet

# Push to GCR
docker push gcr.io/$GCP_PROJECT_ID/dotrep-v2:testnet
```

## Step 4: Deploy to Testnet

```bash
# From the project root
node . create --config config/create.remote.dotrep-testnet.json --verbose
```

This will:
1. Create a GKE cluster (if needed)
2. Deploy the DotRep application
3. Set up ingress with TLS
4. Configure monitoring

## Step 5: Verify Deployment

```bash
# Check deployment status
node . status dotrep-testnet

# Get Kubernetes pods
kubectl get pods -n default

# Check service
kubectl get svc -n default

# Check ingress
kubectl get ingress -n default
```

## Step 6: Access the Application

After deployment completes, you'll get:
- **Application URL**: `https://testnet.dotrep.io` (if domain configured)
- **Load Balancer IP**: Check with `kubectl get ingress`

## Environment Variables

The deployment uses these testnet-specific settings:

- **POLKADOT_WS_ENDPOINT**: `wss://westend-rpc.polkadot.io`
- **POLKADOT_CHAIN**: `westend`
- **Database**: Configure your testnet database URL
- **JWT_SECRET**: Change this in production

## Connecting to Westend Testnet

DotRep is configured to connect to Westend testnet with:

- **Chain**: Westend (Polkadot testnet)
- **RPC Endpoints**: 
  - `wss://westend-rpc.polkadot.io`
  - `wss://westend.api.onfinality.io/public-ws`
  - `wss://westend-rpc.dwellir.com`

## Troubleshooting

### Check Pod Logs

```bash
# Get pod name
kubectl get pods

# View logs
kubectl logs <pod-name>
```

### Check Application Health

```bash
# Port forward to local machine
kubectl port-forward svc/dotrep-testnet 3000:3000

# Test health endpoint
curl http://localhost:3000/health
```

### Database Connection Issues

Ensure your database is accessible from GKE:
- Use Cloud SQL Proxy for Cloud SQL
- Configure firewall rules
- Check connection string format

### Polkadot Connection Issues

Verify WebSocket connection:
```bash
# Test WebSocket endpoint
curl -I https://westend-rpc.polkadot.io
```

## Updating the Deployment

### Update Image

```bash
# Build new image
cd dotrep-v2
docker build -t dotrep-v2:testnet-v2 .

# Tag and push
docker tag dotrep-v2:testnet-v2 gcr.io/$GCP_PROJECT_ID/dotrep-v2:testnet-v2
docker push gcr.io/$GCP_PROJECT_ID/dotrep-v2:testnet-v2

# Update deployment
kubectl set image deployment/dotrep-testnet dotrep-v2=gcr.io/$GCP_PROJECT_ID/dotrep-v2:testnet-v2
```

### Redeploy

```bash
node . redeploy dotrep-testnet --verbose
```

## Cleanup

To remove the deployment:

```bash
node . destroy dotrep-testnet --verbose
```

This will delete:
- Kubernetes deployment
- Services
- Ingress
- ConfigMaps
- Secrets

**Note**: GKE cluster will NOT be deleted unless `keep: false` is set.

## Monitoring

Monitoring is enabled by default. Access:
- **Prometheus**: Configured automatically
- **Grafana**: Deploy separately if needed
- **Logs**: View in GCP Cloud Logging

## Next Steps

After successful deployment:

1. **Verify Polkadot Connection**: Check logs for successful WebSocket connection
2. **Test Reputation Functions**: Submit contributions and verify on-chain
3. **Monitor Performance**: Check CPU/memory usage
4. **Set Up Alerts**: Configure monitoring alerts

## Production Checklist

Before moving to production:

- [ ] Change JWT_SECRET to secure random value
- [ ] Use production database
- [ ] Configure proper domain and TLS
- [ ] Set up monitoring alerts
- [ ] Enable backup strategy
- [ ] Configure resource limits
- [ ] Review security settings
- [ ] Test all functionality

## Support

For issues or questions:
- Check logs: `kubectl logs <pod-name>`
- View events: `kubectl get events`
- Check status: `node . status dotrep-testnet`

---

**Deployed on**: Westend Testnet (Polkadot Cloud)
**Chain**: westend
**RPC**: wss://westend-rpc.polkadot.io


