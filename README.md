# Node.js Application on Amazon EKS

A modern Node.js web application with automated CI/CD pipeline using Jenkins, Docker, and Amazon EKS (Elastic Kubernetes Service).

## 🚀 Features

- **Express.js Web Server** - Fast, unopinionated web framework
- **RESTful API** - User management endpoints with JSON responses
- **Health Check Endpoint** - Kubernetes-ready health monitoring
- **Docker Containerized** - Lightweight Alpine-based container
- **Jenkins CI/CD Pipeline** - Automated build, test, and deployment
- **Amazon EKS Deployment** - Scalable Kubernetes orchestration
- **ECR Integration** - AWS container registry for image storage

## 📋 Prerequisites

Before running this application, ensure you have:

- Node.js 18+ installed locally
- Docker installed and running
- AWS CLI configured with appropriate permissions
- Jenkins server with required plugins
- Amazon EKS cluster set up
- kubectl configured for your EKS cluster

### Required AWS Permissions

Your AWS IAM user/role needs the following permissions:
- ECR: `ecr:*` (for container registry operations)
- EKS: `eks:DescribeCluster`, `eks:ListClusters`
- STS: `sts:GetCallerIdentity`

## 🏗️ Project Structure

```
├── Dockerfile              # Container configuration
├── Jenkinsfile             # CI/CD pipeline definition
├── app.js                  # Main application file
├── package.json            # Node.js dependencies
├── package-lock.json       # Dependency lock file
├── k8s/
│   ├── deployment.yml      # Kubernetes deployment and service manifests
│   └── ingress.yml         # AWS ALB Ingress and Network Policies
└── README.md              # This file
```

## 🌐 Application URLs

- **Production**: https://nodejs.rinando.my.id
- **Health Check**: https://nodejs.rinando.my.id/health
- **API Endpoints**: https://nodejs.rinando.my.id/api/users

## 🔧 Local Development

### Installation

1. Clone the repository:
```bash
git clone <your-repository-url>
cd <repository-name>
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The application will be available at `http://localhost:3000`

### Available Scripts

- `npm start` - Start the production server
- `npm run dev` - Start development server with nodemon (if configured)
- `npm test` - Run tests (if configured)

## 🐳 Docker

### Building the Image

```bash
docker build -t cfx-test-nodejs .
```

### Running the Container

```bash
docker run -p 3000:3000 cfx-test-nodejs
```

### Image Features

- **Base Image**: Node.js 18 Alpine (lightweight)
- **Security**: Non-root user execution
- **Health Check**: Built-in container health monitoring
- **Production Ready**: Optimized for production deployment

## 🚀 API Endpoints

### Health Check
```
GET /health
```
Returns application health status, uptime, and version information.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-06-28T10:30:00.000Z",
  "uptime": 3600.5,
  "version": "1.0.0"
}
```

### Users API

#### Get All Users
```
GET /api/users
```
Returns a list of sample users.

#### Create User
```
POST /api/users
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com"
}
```

## ⚙️ CI/CD Pipeline

The Jenkins pipeline automatically:

1. **Checkout & Setup** - Retrieves code and configures environment
2. **Build & Push** - Creates Docker image and pushes to Amazon ECR
3. **Deploy to EKS** - Updates Kubernetes deployment with new image

### Pipeline Configuration

The pipeline uses these environment variables:
- `AWS_REGION`: AWS region (default: us-east-1)
- `ECR_REPOSITORY`: cfx-test-nodejs
- `EKS_CLUSTER_NAME`: test-project-eks-cluster
- `IMAGE_TAG`: Uses Jenkins build number
- `AWS_ACCOUNT_ID`: 112113402575

### Required Jenkins Plugins

- AWS Steps Plugin
- Docker Pipeline Plugin
- Kubernetes Plugin
- Pipeline: AWS Steps

## ☸️ Kubernetes Deployment

### Deployment Strategy

The application uses:
- **Rolling Updates** - Zero-downtime deployments
- **Health Checks** - Kubernetes readiness and liveness probes with detailed timeouts
- **Resource Limits** - CPU (500m) and memory (512Mi) constraints
- **Security Hardening** - Non-root user, read-only filesystem, dropped capabilities
- **ClusterIP Service** - Internal cluster communication
- **AWS ALB Ingress** - External traffic routing through Application Load Balancer
- **Network Policies** - Pod-to-pod communication security
- **Custom Domain** - Accessible via nodejs.rinando.my.id

### Multi-Application Architecture

This setup supports multiple applications:
- **Node.js App** - Available at `nodejs.rinando.my.id`
- **Go API App** - Available at `api.rinando.my.id` (separate service)

### Kubernetes Manifests

The deployment includes three main manifest files:

#### deployment.yml
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nodejs-app
  namespace: default
  labels:
    app: nodejs-app
    version: v1
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nodejs-app
  template:
    metadata:
      labels:
        app: nodejs-app
        version: v1
    spec:
      containers:
      - name: nodejs-app
        image: 112113402575.dkr.ecr.us-east-1.amazonaws.com/cfx-test-nodejs:latest
        ports:
        - containerPort: 3000
          name: http
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3000"
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        securityContext:
          runAsNonRoot: true
          runAsUser: 1001
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
        volumeMounts:
        - name: tmp
          mountPath: /tmp
      volumes:
      - name: tmp
        emptyDir: {}
      securityContext:
        fsGroup: 1001
      serviceAccountName: nodejs-app-sa
---
apiVersion: v1
kind: Service
metadata:
  name: cfx-nodejs-service
  namespace: default
  labels:
    app: cfx-nodejs-app
spec:
  type: ClusterIP
  selector:
    app: cfx-nodejs-app 
  ports:
  - name: http
    port: 80
    targetPort: 3000
    protocol: TCP
```

#### ingress.yml
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: multi-app-ingress
  namespace: default
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTP": 80}]'
    alb.ingress.kubernetes.io/healthcheck-path: /health
    alb.ingress.kubernetes.io/healthcheck-interval-seconds: '30'
    alb.ingress.kubernetes.io/healthcheck-timeout-seconds: '5'
    alb.ingress.kubernetes.io/success-codes: '200'
    alb.ingress.kubernetes.io/tags: Environment=production,Application=multi-app
  labels:
    app: multi-app
spec:
  rules:
  # Node.js app
  - host: nodejs.rinando.my.id
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: cfx-nodejs-service
            port:
              number: 80
  # Go API app
  - host: api.rinando.my.id
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: go-api-service
            port:
              number: 80
---
# Network Policies for enhanced security
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: nodejs-app-network-policy
  namespace: default
spec:
  podSelector:
    matchLabels:
      app: nodejs-app
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector: {}
    ports:
    - protocol: TCP
      port: 3000
  egress:
  - {}
```

### Required Prerequisites

Before deploying, ensure you have:

1. **AWS Load Balancer Controller** installed in your EKS cluster
2. **Service Account** `nodejs-app-sa` created with appropriate permissions
3. **DNS Configuration** for your custom domains pointing to the ALB

## 🔐 Security Features

- **Non-root Container User** - Enhanced container security (UID 1001)
- **Read-only Root Filesystem** - Prevents runtime file modifications
- **Dropped Capabilities** - All Linux capabilities removed for minimal attack surface
- **Security Context** - Pod and container-level security constraints
- **Network Policies** - Controlled pod-to-pod communication
- **Service Account** - Kubernetes RBAC integration
- **Input Validation** - API request validation
- **Error Handling** - Proper error responses without sensitive data
- **Health Checks** - Application monitoring and auto-recovery
- **Resource Limits** - Kubernetes resource constraints prevent resource exhaustion

## 📊 Monitoring

### Health Monitoring

The `/health` endpoint provides:
- Application status
- Uptime information
- Version details
- Timestamp for request tracking

### Kubernetes Monitoring

The deployment includes:
- **Liveness Probes** - Restart unhealthy containers
- **Readiness Probes** - Control traffic routing
- **Resource Monitoring** - CPU and memory usage

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

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For questions or issues:
- Create an issue in this repository
- Contact the development team
- Check the troubleshooting section above

---

**Built with ❤️ using Node.js, Docker, Jenkins, and Amazon EKS**
