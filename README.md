# Node.js EKS Application

Simple Node.js web application deployed on Amazon EKS with Jenkins CI/CD pipeline.

## 🚀 Features

- Express.js web server with REST API
- Docker containerized
- Jenkins automated deployment
- Amazon EKS hosting
- Custom domain: nodejs.rinando.my.id

## 📋 Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Start server
npm start
```

Application runs on `http://localhost:3000`

### Docker

```bash
# Build image
docker build -t cfx-test-nodejs .

# Run container
docker run -p 3000:3000 cfx-test-nodejs
```

## 🔧 API Endpoints

- `GET /` - Main page
- `GET /health` - Health check
- `GET /api/users` - Get users
- `POST /api/users` - Create user

## 🚀 Deployment

### Prerequisites

- Jenkins with AWS plugins
- EKS cluster: `test-project-eks-cluster`
- AWS Load Balancer Controller
- Domain: `nodejs.rinando.my.id`

### Jenkins Pipeline

The pipeline automatically:
1. Builds Docker image
2. Pushes to ECR: `112113402575.dkr.ecr.us-east-1.amazonaws.com/cfx-test-nodejs`
3. Deploys to EKS

### Kubernetes Setup

**Files needed:**
- `k8s/deployment.yml` - App deployment and service
- `k8s/ingress.yml` - ALB ingress and network policies

**Deploy manually:**
```bash
kubectl apply -f k8s/deployment.yml
kubectl apply -f k8s/ingress.yml
```

## 🔐 Security Features

- Non-root container user
- Read-only filesystem
- Network policies
- Resource limits
- Health checks

## 🐛 Troubleshooting

```bash
# Check deployment
kubectl get pods -l app=nodejs-app
kubectl logs -f deployment/nodejs-app

# Check service
kubectl get svc cfx-nodejs-service

# Check ingress
kubectl get ingress multi-app-ingress
kubectl describe ingress multi-app-ingress

# Test locally
kubectl port-forward service/cfx-nodejs-service 8080:80
```

## 📂 Project Structure

```
├── Dockerfile          # Container config
├── Jenkinsfile         # CI/CD pipeline
├── app.js              # Main application
├── package.json        # Dependencies
├── k8s/
│   ├── deployment.yml  # K8s deployment
│   └── ingress.yml     # ALB ingress
└── README.md           # This file
```

## 🌐 Live Application

**URL:** 
- Production: https://nodejs.rinando.my.id
- Health Check: https://nodejs.rinando.my.id/health
- API Endpoints: https://nodejs.rinando.my.id/api/users
---

**Stack:** Node.js • Docker • Jenkins • Amazon EKS • AWS ALB

## 🚨 Troubleshooting

### Common Issues

1. **ECR Authentication Failed**
   ```bash
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
   ```

2. **EKS Cluster Access**
   ```bash
   aws eks update-kubeconfig --region us-east-1 --name test-project-eks-cluster
   ```

3. **Pod Not Starting**
   ```bash
   kubectl describe pod <pod-name>
   kubectl logs <pod-name>
   ```

4. **Service Not Accessible**
   ```bash
   kubectl get services
   kubectl describe service cfx-nodejs-service
   kubectl get ingress multi-app-ingress
   kubectl describe ingress multi-app-ingress
   
   # Check ALB status
   kubectl get targetgroupbindings
   ```

5. **DNS Resolution Issues**
   ```bash
   # Check if domain points to ALB
   nslookup nodejs.rinando.my.id
   
   # Get ALB DNS name
   kubectl get ingress multi-app-ingress -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
   ```

### Debug Commands

```bash
# Check deployment status
kubectl rollout status deployment/nodejs-app

# View application logs
kubectl logs -f deployment/nodejs-app

# Check pod health
kubectl get pods -l app=nodejs-app

# Test service connectivity
kubectl port-forward service/cfx-nodejs-service 8080:80

# Check ingress status
kubectl get ingress multi-app-ingress
kubectl describe ingress multi-app-ingress

# Verify AWS Load Balancer Controller
kubectl get pods -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller

# Check network policies
kubectl get networkpolicy
kubectl describe networkpolicy nodejs-app-network-policy

# Access application via custom domain
curl -H "Host: nodejs.rinando.my.id" http://<alb-dns-name>
```

### Service Account Setup

Create the required service account:

```bash
# Create service account
kubectl create serviceaccount nodejs-app-sa

# If using IAM roles for service accounts (IRSA)
kubectl annotate serviceaccount nodejs-app-sa \
  eks.amazonaws.com/role-arn=arn:aws:iam::112113402575:role/NodejsAppRole
```
