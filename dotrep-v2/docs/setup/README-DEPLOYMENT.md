# DotRep v2 - Deployment Guide

This guide explains how to deploy DotRep v2 using the polkadot-deployer infrastructure.

## Prerequisites

- Docker installed and running
- Kubernetes cluster (local with Kind or remote on GCP/AWS/Azure/DO)
- kubectl configured to access your cluster
- Helm 3.x installed (for Helm chart deployment)

## Building the Docker Image

First, build the Docker image for dotrep-v2:

```bash
cd dotrep-v2
docker build -t dotrep-v2:latest .
```

For remote deployments, tag and push to your container registry:

```bash
docker tag dotrep-v2:latest gcr.io/YOUR_PROJECT_ID/dotrep-v2:latest
docker push gcr.io/YOUR_PROJECT_ID/dotrep-v2:latest
```

## Deployment Options

### Option 1: Using Kubernetes Manifests (Direct)

Apply the Kubernetes manifests directly:

```bash
kubectl apply -f dotrep-v2/k8s/deployment.yaml
kubectl apply -f dotrep-v2/k8s/service.yaml
kubectl apply -f dotrep-v2/k8s/ingress.yaml  # Optional, for external access
```

### Option 2: Using Helm Chart

Install using Helm:

```bash
cd dotrep-v2/helm
helm install dotrep-v2 . -f values.yaml
```

Or with custom values:

```bash
helm install dotrep-v2 . -f values.yaml --set image.tag=v1.0.0
```

### Option 3: Using polkadot-deployer Configuration

Create a deployment using the polkadot-deployer tool with a custom configuration:

#### Local Deployment

```bash
node . create --config config/create.local.sample-dotrep-v2.json --verbose
```

#### Remote Deployment (GCP)

1. Edit `config/create.remote.sample-dotrep-v2.json` with your project details
2. Set environment variables:
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
   export CLOUDFLARE_EMAIL=your-email@example.com
   export CLOUDFLARE_API_KEY=your-api-key
   ```
3. Deploy:
   ```bash
   node . create --config config/create.remote.sample-dotrep-v2.json --verbose
   ```

## Environment Variables

The following environment variables can be configured:

- `NODE_ENV`: Environment mode (development/production)
- `PORT`: Server port (default: 3000)
- `DATABASE_URL`: MySQL database connection string
- `JWT_SECRET`: Secret for JWT token signing
- `OAUTH_SERVER_URL`: OAuth server URL for GitHub integration
- `CLOUDFLARE_API_KEY`: Cloudflare API key (for DNS management)
- `CLOUDFLARE_EMAIL`: Cloudflare email (for DNS management)

### Using Kubernetes Secrets

Create a secret for sensitive data:

```bash
kubectl create secret generic dotrep-secrets \
  --from-literal=database-url='mysql://user:pass@host:3306/db' \
  --from-literal=jwt-secret='your-secret-key'
```

Then reference in your deployment:

```yaml
env:
- name: DATABASE_URL
  valueFrom:
    secretKeyRef:
      name: dotrep-secrets
      key: database-url
```

## Health Checks

The application exposes two health check endpoints:

- `/health`: Liveness probe - returns 200 if the server is running
- `/ready`: Readiness probe - returns 200 if the server and database are ready

These are automatically configured in the Kubernetes manifests and Helm chart.

## Scaling

### Manual Scaling

```bash
kubectl scale deployment dotrep-v2 --replicas=3
```

### Horizontal Pod Autoscaling

Enable autoscaling in the Helm values:

```yaml
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 5
  targetCPUUtilizationPercentage: 80
```

## Monitoring

The application is compatible with the polkadot-deployer monitoring stack. Enable monitoring in your deployment configuration:

```json
{
  "monitoring": {
    "enabled": true
  }
}
```

This will deploy Prometheus, Grafana, and other monitoring tools that can scrape metrics from the dotrep-v2 application.

## Troubleshooting

### Check Pod Status

```bash
kubectl get pods -l app=dotrep-v2
```

### View Logs

```bash
kubectl logs -l app=dotrep-v2 --tail=100
```

### Check Service

```bash
kubectl get svc dotrep-v2
```

### Port Forward for Local Testing

```bash
kubectl port-forward svc/dotrep-v2 3000:3000
```

Then access at `http://localhost:3000`

### Database Connection Issues

Ensure your database is accessible from the Kubernetes cluster. For local development, you may need to use a service like Cloud SQL Proxy for GCP or RDS Proxy for AWS.

## Updating the Deployment

### Update Image

```bash
kubectl set image deployment/dotrep-v2 dotrep-v2=dotrep-v2:v1.1.0
```

### Rolling Update

```bash
kubectl rollout restart deployment/dotrep-v2
```

### Check Rollout Status

```bash
kubectl rollout status deployment/dotrep-v2
```

## Cleanup

### Delete Deployment

```bash
kubectl delete -f dotrep-v2/k8s/
```

### Delete Helm Release

```bash
helm uninstall dotrep-v2
```

### Delete using polkadot-deployer

```bash
node . destroy dotrep-v2-testnet
```

## Polkadot Cloud Deployment

DotRep v2 is fully compatible with Polkadot Cloud deployment infrastructure. Use the provided configuration:

```bash
node . create --config config/create.remote.sample-dotrep-cloud.json --verbose
```

### Key Features

- **Polkadot SDK Integration**: Full integration with Polkadot runtime
- **XCM Support**: Cross-chain reputation queries
- **Governance**: On-chain proposal system
- **NFT Support**: Soulbound achievement tokens
- **Multi-Chain**: Support for multiple parachains

### Configuration

The deployment configuration includes:

- Polkadot WebSocket endpoints
- XCM gateway settings
- Governance parameters
- Chain-specific configurations
- Autoscaling settings
- Health checks

See `POLKADOT_SDK_INTEGRATION.md` for detailed integration documentation.

## Production Considerations

1. **Use Production Database**: Configure a managed database service (Cloud SQL, RDS, etc.)
2. **Enable TLS**: Configure ingress with TLS certificates
3. **Resource Limits**: Set appropriate CPU and memory limits
4. **Backup Strategy**: Implement database backups
5. **Monitoring**: Enable full monitoring stack
6. **Logging**: Configure centralized logging (Loki, Cloud Logging, etc.)
7. **Secrets Management**: Use Kubernetes secrets or external secret management
8. **High Availability**: Deploy multiple replicas across zones
9. **CI/CD**: Set up automated deployment pipeline
10. **Security**: Enable network policies, pod security policies, and RBAC
11. **Polkadot Connection**: Configure reliable WebSocket endpoints for Polkadot nodes
12. **XCM Configuration**: Set up cross-chain messaging for reputation queries

