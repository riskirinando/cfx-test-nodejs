pipeline {
    agent any
    
    environment {
        AWS_REGION = 'us-east-1'
        ECR_REPOSITORY = 'cfx-test-nodejs'
        EKS_CLUSTER_NAME = 'test-project-eks-cluster'
        IMAGE_TAG = "${BUILD_NUMBER}"
        ECR_REGISTRY = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
        CURRENT_STAGE = 'NONE'
        KUBECONFIG = '/tmp/kubeconfig'
    }
    
    stages {
        stage('Checkout') {
            steps {
                script {
                    env.CURRENT_STAGE = 'CHECKOUT'
                    echo "=== STAGE: ${env.CURRENT_STAGE} ==="
                    
                    try {
                        checkout scm
                        echo "✅ SCM checkout successful"
                        
                        // Get Git commit hash
                        try {
                            env.GIT_COMMIT = sh(returnStdout: true, script: 'git rev-parse HEAD').trim()
                            echo "✅ Git commit: ${env.GIT_COMMIT}"
                        } catch (Exception e) {
                            echo "⚠️ Git operation failed: ${e.getMessage()}"
                            env.GIT_COMMIT = "unknown-${env.BUILD_NUMBER}"
                        }
                        
                        // List files to verify checkout
                        sh 'ls -la'
                        
                        echo "✅ CHECKOUT stage completed successfully"
                        
                    } catch (Exception e) {
                        env.CURRENT_STAGE = 'CHECKOUT_FAILED'
                        echo "❌ CHECKOUT stage failed: ${e.getMessage()}"
                        throw e
                    }
                }
            }
        }
        
        stage('Prerequisites Check') {
            steps {
                script {
                    env.CURRENT_STAGE = 'PREREQUISITES'
                    echo "=== STAGE: ${env.CURRENT_STAGE} ==="
                    
                    try {
                        // Check for required files
                        echo "Checking for required files..."
                        
                        if (!fileExists('Dockerfile')) {
                            error "❌ Dockerfile not found! Please ensure Dockerfile exists in the repository."
                        }
                        echo "✅ Dockerfile found"
                        
                        if (fileExists('package.json')) {
                            echo "✅ package.json found"
                            sh 'cat package.json'
                        }
                        
                        // Check required tools
                        sh 'docker --version'
                        sh 'aws --version'
                        sh 'kubectl version --client'
                        
                        echo "✅ PREREQUISITES stage completed successfully"
                        
                    } catch (Exception e) {
                        env.CURRENT_STAGE = 'PREREQUISITES_FAILED'
                        echo "❌ PREREQUISITES stage failed: ${e.getMessage()}"
                        throw e
                    }
                }
            }
        }
        
        stage('Get AWS Account ID') {
            steps {
                script {
                    env.CURRENT_STAGE = 'AWS_ACCOUNT_ID'
                    echo "=== STAGE: ${env.CURRENT_STAGE} ==="
                    
                    try {
                        // Check AWS CLI configuration first
                        sh 'aws sts get-caller-identity || echo "AWS CLI not configured or no permissions"'
                        
                        // Get AWS Account ID with better error handling
                        def awsAccountResult = sh(
                            returnStdout: true,
                            script: 'aws sts get-caller-identity --query Account --output text 2>/dev/null || echo "FAILED"'
                        ).trim()
                        
                        if (awsAccountResult == "FAILED" || awsAccountResult == "") {
                            echo "⚠️ Could not get AWS Account ID from AWS CLI, using fallback..."
                            // Fallback: try to extract from AWS CLI config or use a default
                            env.AWS_ACCOUNT_ID = "123456789012" // Replace with your actual account ID
                            echo "⚠️ Using fallback AWS Account ID: ${env.AWS_ACCOUNT_ID}"
                            echo "⚠️ Please ensure AWS CLI is properly configured with credentials"
                        } else {
                            env.AWS_ACCOUNT_ID = awsAccountResult
                            echo "✅ AWS Account ID: ${env.AWS_ACCOUNT_ID}"
                        }
                        
                        // Update ECR registry URL
                        env.ECR_REGISTRY = "${env.AWS_ACCOUNT_ID}.dkr.ecr.${env.AWS_REGION}.amazonaws.com"
                        env.FULL_IMAGE_URI = "${env.ECR_REGISTRY}/${env.ECR_REPOSITORY}:${env.IMAGE_TAG}"
                        
                        echo "✅ ECR Registry: ${env.ECR_REGISTRY}"
                        echo "✅ Full Image URI: ${env.FULL_IMAGE_URI}"
                        
                        echo "✅ AWS_ACCOUNT_ID stage completed successfully"
                        
                    } catch (Exception e) {
                        env.CURRENT_STAGE = 'AWS_ACCOUNT_ID_FAILED'
                        echo "❌ AWS_ACCOUNT_ID stage failed: ${e.getMessage()}"
                        throw e
                    }
                }
            }
        }
        
        stage('Docker Build') {
            steps {
                script {
                    env.CURRENT_STAGE = 'DOCKER_BUILD'
                    echo "=== STAGE: ${env.CURRENT_STAGE} ==="
                    
                    try {
                        echo "Building Docker image..."
                        echo "Image URI: ${env.FULL_IMAGE_URI}"
                        
                        // Check Docker daemon access first
                        sh 'docker version || echo "Docker daemon not accessible"'
                        sh 'whoami'
                        sh 'groups'
                        
                        // Build Docker image with sudo if needed
                        sh """
                            sudo docker build -t ${env.ECR_REPOSITORY}:${env.IMAGE_TAG} .
                            sudo docker tag ${env.ECR_REPOSITORY}:${env.IMAGE_TAG} ${env.FULL_IMAGE_URI}
                            sudo docker tag ${env.ECR_REPOSITORY}:${env.IMAGE_TAG} ${env.ECR_REGISTRY}/${env.ECR_REPOSITORY}:latest
                        """
                        
                        // List Docker images
                        sh 'sudo docker images | grep cfx-test-nodejs'
                        
                        echo "✅ DOCKER_BUILD stage completed successfully"
                        
                    } catch (Exception e) {
                        env.CURRENT_STAGE = 'DOCKER_BUILD_FAILED'
                        echo "❌ DOCKER_BUILD stage failed: ${e.getMessage()}"
                        echo "💡 Try running: sudo usermod -aG docker jenkins && sudo systemctl restart jenkins"
                        throw e
                    }
                }
            }
        }
        
        stage('ECR Login & Push') {
            steps {
                script {
                    env.CURRENT_STAGE = 'ECR_PUSH'
                    echo "=== STAGE: ${env.CURRENT_STAGE} ==="
                    
                    try {
                        echo "Logging into ECR..."
                        
                        // ECR Login with sudo
                        sh """
                            aws ecr get-login-password --region ${env.AWS_REGION} | sudo docker login --username AWS --password-stdin ${env.ECR_REGISTRY}
                        """
                        
                        echo "✅ ECR login successful"
                        
                        // Create ECR repository if it doesn't exist
                        sh """
                            aws ecr describe-repositories --repository-names ${env.ECR_REPOSITORY} --region ${env.AWS_REGION} || \
                            aws ecr create-repository --repository-name ${env.ECR_REPOSITORY} --region ${env.AWS_REGION}
                        """
                        
                        echo "✅ ECR repository verified/created"
                        
                        // Push images with sudo
                        echo "Pushing images to ECR..."
                        sh """
                            sudo docker push ${env.FULL_IMAGE_URI}
                            sudo docker push ${env.ECR_REGISTRY}/${env.ECR_REPOSITORY}:latest
                        """
                        
                        echo "✅ Images pushed successfully"
                        echo "✅ ECR_PUSH stage completed successfully"
                        
                    } catch (Exception e) {
                        env.CURRENT_STAGE = 'ECR_PUSH_FAILED'
                        echo "❌ ECR_PUSH stage failed: ${e.getMessage()}"
                        throw e
                    }
                }
            }
        }
        
        stage('Configure Kubectl') {
            steps {
                script {
                    env.CURRENT_STAGE = 'KUBECTL_CONFIG'
                    echo "=== STAGE: ${env.CURRENT_STAGE} ==="
                    
                    try {
                        echo "Configuring kubectl for EKS cluster..."
                        
                        // Update kubeconfig for EKS
                        sh """
                            aws eks update-kubeconfig --region ${env.AWS_REGION} --name ${env.EKS_CLUSTER_NAME} --kubeconfig ${env.KUBECONFIG}
                            export KUBECONFIG=${env.KUBECONFIG}
                            kubectl config current-context
                            kubectl get nodes
                        """
                        
                        echo "✅ kubectl configured successfully"
                        echo "✅ KUBECTL_CONFIG stage completed successfully"
                        
                    } catch (Exception e) {
                        env.CURRENT_STAGE = 'KUBECTL_CONFIG_FAILED'
                        echo "❌ KUBECTL_CONFIG stage failed: ${e.getMessage()}"
                        throw e
                    }
                }
            }
        }
        
        stage('Deploy to EKS') {
            steps {
                script {
                    env.CURRENT_STAGE = 'EKS_DEPLOY'
                    echo "=== STAGE: ${env.CURRENT_STAGE} ==="
                    
                    try {
                        echo "Deploying to EKS cluster..."
                        
                        // Create Kubernetes deployment manifest
                        writeFile file: 'k8s-deployment.yaml', text: """
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cfx-nodejs-app
  labels:
    app: cfx-nodejs-app
spec:
  replicas: 2
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
        image: ${env.FULL_IMAGE_URI}
        ports:
        - containerPort: 3000
        env:
        - name: BUILD_NUMBER
          value: "${env.BUILD_NUMBER}"
        - name: GIT_COMMIT
          value: "${env.GIT_COMMIT}"
---
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
"""
                        
                        // Apply deployment
                        sh """
                            export KUBECONFIG=${env.KUBECONFIG}
                            kubectl apply -f k8s-deployment.yaml
                            kubectl rollout status deployment/cfx-nodejs-app --timeout=300s
                            kubectl get deployments
                            kubectl get services
                            kubectl get pods
                        """
                        
                        // Get service URL
                        try {
                            def serviceUrl = sh(
                                returnStdout: true,
                                script: """
                                    export KUBECONFIG=${env.KUBECONFIG}
                                    kubectl get service cfx-nodejs-service -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
                                """
                            ).trim()
                            
                            if (serviceUrl) {
                                echo "🌐 Application URL: http://${serviceUrl}"
                                env.APP_URL = "http://${serviceUrl}"
                            }
                        } catch (Exception e) {
                            echo "⚠️ Could not get service URL: ${e.getMessage()}"
                        }
                        
                        echo "✅ EKS_DEPLOY stage completed successfully"
                        env.CURRENT_STAGE = 'ALL_STAGES_COMPLETED'
                        
                    } catch (Exception e) {
                        env.CURRENT_STAGE = 'EKS_DEPLOY_FAILED'
                        echo "❌ EKS_DEPLOY stage failed: ${e.getMessage()}"
                        throw e
                    }
                }
            }
        }
    }
    
    post {
        always {
            script {
                try {
                    echo "=== BUILD SUMMARY ==="
                    echo "Build Number: ${env.BUILD_NUMBER}"
                    echo "Git Commit: ${env.GIT_COMMIT}"
                    echo "Image Tag: ${env.IMAGE_TAG}"
                    echo "ECR Repository: ${env.ECR_REPOSITORY}"
                    echo "EKS Cluster: ${env.EKS_CLUSTER_NAME}"
                    echo "AWS Region: ${env.AWS_REGION}"
                    echo "Build Status: ${currentBuild.currentResult}"
                    echo "Final Stage: ${env.CURRENT_STAGE}"
                    if (env.APP_URL) {
                        echo "Application URL: ${env.APP_URL}"
                    }
                    echo "========================="
                    
                    // Cleanup
                    sh 'sudo docker system prune -f || true'
                    sh 'rm -f ${env.KUBECONFIG} || true'
                    
                } catch (Exception e) {
                    echo "Error in post always: ${e.getMessage()}"
                }
            }
        }
        
        success {
            script {
                try {
                    echo "🎉 Deployment completed successfully!"
                    echo "✅ Application: ${env.ECR_REPOSITORY}"
                    echo "✅ Version: ${env.IMAGE_TAG}"
                    echo "✅ Cluster: ${env.EKS_CLUSTER_NAME}"
                    echo "✅ Region: ${env.AWS_REGION}"
                    if (env.APP_URL) {
                        echo "🌐 Access your application at: ${env.APP_URL}"
                    }
                } catch (Exception e) {
                    echo "Error in post success: ${e.getMessage()}"
                }
            }
        }
        
        failure {
            script {
                try {
                    echo "❌ Deployment failed!"
                    echo "💥 FAILURE SUMMARY:"
                    echo "- Application: ${env.ECR_REPOSITORY}"
                    echo "- Version: ${env.IMAGE_TAG}"
                    echo "- Cluster: ${env.EKS_CLUSTER_NAME}"
                    echo "- Region: ${env.AWS_REGION}"
                    echo "- Build URL: ${env.BUILD_URL}"
                    echo "- Failed Stage: ${env.CURRENT_STAGE}"
                    
                } catch (Exception e) {
                    echo "Error in post failure: ${e.getMessage()}"
                }
            }
        }
    }
}
