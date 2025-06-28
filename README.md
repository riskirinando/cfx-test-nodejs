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
│   ├── deployment.yml      # Kubernetes deployment manifest
│   └── service.yml         # Kubernetes service manifest
└── README.md              # This file
```

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
- `ECR_REPOSITORY`: ECR repository name
- `EKS_CLUSTER_NAME`: Target EKS cluster
- `IMAGE_TAG`: Uses Jenkins build number

### Required Jenkins Plugins

- AWS Steps Plugin
- Docker Pipeline Plugin
- Kubernetes Plugin
- Pipeline: AWS Steps

## ☸️ Kubernetes Deployment

### Deployment Strategy

The application uses:
- **Rolling Updates** - Zero-downtime deployments
- **Health Checks** - Kubernetes readiness and liveness probes
- **Resource Limits** - CPU and memory constraints
- **Load Balancer Service** - External traffic routing

### Kubernetes Manifests

Create the following files in the `k8s/` directory:

#### deployment.yml
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cfx-nodejs-app
  labels:
    app: cfx-nodejs-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: cfx-nodejs-app
  template:
    metadata:
      labels:
        app: cfx-nodejs-app
    spec:
      containers:
      - name: cfx-nodejs-app
        image: IMAGE_PLACEHOLDER
        ports:
        - containerPort: 3000
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

#### service.yml
```yaml
apiVersion: v1
kind: Service
metadata:
  name: cfx-nodejs-service
spec:
  selector:
    app: cfx-nodejs-app
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: LoadBalancer
```

## 🔐 Security Features

- **Non-root Container User** - Enhanced container security
- **Input Validation** - API request validation
- **Error Handling** - Proper error responses without sensitive data
- **Health Checks** - Application monitoring and auto-recovery
- **Resource Limits** - Kubernetes resource constraints

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
   ```

### Debug Commands

```bash
# Check deployment status
kubectl rollout status deployment/cfx-nodejs-app

# View application logs
kubectl logs -f deployment/cfx-nodejs-app

# Check pod health
kubectl get pods -l app=cfx-nodejs-app

# Test service connectivity
kubectl port-forward service/cfx-nodejs-service 8080:80
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
