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
                        
                        // Update ECR registry URL - force string interpolation
                        def awsAccountId = env.AWS_ACCOUNT_ID
                        def awsRegion = env.AWS_REGION
                        def ecrRepo = env.ECR_REPOSITORY
                        def imageTag = env.IMAGE_TAG
                        
                        env.ECR_REGISTRY = "${awsAccountId}.dkr.ecr.${awsRegion}.amazonaws.com"
                        env.FULL_IMAGE_URI = "${awsAccountId}.dkr.ecr.${awsRegion}.amazonaws.com/${ecrRepo}:${imageTag}"
                        
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
                        
                        // Check Docker daemon access and current user
                        sh 'whoami'
                        sh 'groups'
                        sh 'ls -la /var/run/docker.sock'
                        
                        // Try docker without sudo first, then with sudo as fallback
                        def dockerCmd = ""
                        try {
                            sh 'docker version'
                            dockerCmd = "docker"
                            echo "✅ Docker accessible without sudo"
                        } catch (Exception e) {
                            echo "⚠️ Docker not accessible without sudo, trying with sudo..."
                            sh 'sudo docker version'
                            dockerCmd = "sudo docker"
                            echo "✅ Docker accessible with sudo"
                        }
                        
                        // Build Docker image
                        sh """
                            ${dockerCmd} build -t ${env.ECR_REPOSITORY}:${env.IMAGE_TAG} .
                            ${dockerCmd} tag ${env.ECR_REPOSITORY}:${env.IMAGE_TAG} ${env.FULL_IMAGE_URI}
                            ${dockerCmd} tag ${env.ECR_REPOSITORY}:${env.IMAGE_TAG} ${env.ECR_REGISTRY}/${env.ECR_REPOSITORY}:latest
                        """
                        
                        // List Docker images
                        sh "${dockerCmd} images | grep cfx-test-nodejs || echo 'No cfx-test-nodejs images found'"
                        
                        // Store docker command for later stages
                        env.DOCKER_CMD = dockerCmd
                        
                        echo "✅ DOCKER_BUILD stage completed successfully"
                        
                    } catch (Exception e) {
                        env.CURRENT_STAGE = 'DOCKER_BUILD_FAILED'
                        echo "❌ DOCKER_BUILD stage failed: ${e.getMessage()}"
                        echo "💡 To fix permanently, run: sudo usermod -aG docker jenkins && sudo systemctl restart jenkins"
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
        
                    // 1. Get AWS account ID dynamically
                    env.AWS_ACCOUNT_ID = sh(
                        script: "aws sts get-caller-identity --query Account --output text",
                        returnStdout: true
                    ).trim()
        
                    // 2. Now set ECR registry and image URI using updated AWS_ACCOUNT_ID
                    def ECR_REGISTRY = "${env.AWS_ACCOUNT_ID}.dkr.ecr.${env.AWS_REGION}.amazonaws.com"
                    def FULL_IMAGE_URI = "${ECR_REGISTRY}/${env.ECR_REPOSITORY}:${env.IMAGE_TAG}"
        
                    echo "✅ AWS_ACCOUNT_ID: ${env.AWS_ACCOUNT_ID}"
                    echo "✅ ECR_REGISTRY: ${ECR_REGISTRY}"
                    echo "✅ FULL_IMAGE_URI: ${FULL_IMAGE_URI}"
        
                    // 3. Login to ECR
                    sh """
                        aws ecr get-login-password --region ${env.AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}
                    """
        
                    echo "✅ ECR login successful"
        
                    // 4. Check if repository exists or create it
                    sh """
                        aws ecr describe-repositories --repository-names ${env.ECR_REPOSITORY} --region ${env.AWS_REGION} || \
                        aws ecr create-repository --repository-name ${env.ECR_REPOSITORY} --region ${env.AWS_REGION}
                    """
        
                    echo "✅ ECR repository verified/created"
        
                    // 5. Tag and push Docker image
                    def dockerCmd = env.DOCKER_CMD ?: "docker" // or sudo docker if needed
                    def imageName = "${env.ECR_REPOSITORY}"
                    def imageTag = "${env.BUILD_NUMBER}"
                    def fullImageUri = "${ECR_REGISTRY}/${imageName}:${imageTag}"
                    def latestImageUri = "${ECR_REGISTRY}/${imageName}:latest"
                    
                    sh """
                        # Build the image with both tags
                        ${dockerCmd} build -t ${imageName}:${imageTag} -t ${imageName}:latest .
                    
                        # Tag both for ECR
                        ${dockerCmd} tag ${imageName}:${imageTag} ${fullImageUri}
                        ${dockerCmd} tag ${imageName}:latest ${latestImageUri}
                    
                        # Push both tags to ECR
                        ${dockerCmd} push ${fullImageUri}
                        ${dockerCmd} push ${latestImageUri}
                    """
        
                    echo "✅ Image pushed to ECR successfully"
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
                       withEnv(["KUBECONFIG=${env.KUBECONFIG}"]) {
                        sh """
                            echo "== PATH =="
                            echo \$PATH
                            echo "== AWS CLI =="
                            which aws && aws --version
                            echo "== Kubeconfig =="
                            aws sts get-caller-identity
                            aws eks --region us-east-1 update-kubeconfig --name ${env.EKS_CLUSTER_NAME} --kubeconfig ${env.KUBECONFIG}
                            echo "== Kubeconfig current context =="
                            kubectl config current-context
                            echo "== Nodes =="
                            kubectl get nodes
                        """
                    }
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
                
                // Check if deployment.yml exists
                if (!fileExists('deployment.yml')) {
                    error "❌ deployment.yml not found! Please ensure deployment.yml exists in the repository."
                }
                echo "✅ deployment.yml found"
                
                // Display the deployment file content for verification
                echo "📄 Current deployment.yml content:"
                sh 'cat deployment.yml'
                
                // Update the image tag in deployment.yml to use the current build
                sh """
                    # Create a backup of the original deployment.yml
                    cp deployment.yml deployment.yml.backup
                    
                    # Update the image tag to use the current build number
                    sed -i 's|image: .*cfx-test-go:.*|image: ${env.FULL_IMAGE_URI}|g' deployment.yml
                    
                    echo "📄 Updated deployment.yml with current image:"
                    cat deployment.yml
                """
                
                // Apply deployment using the existing deployment.yml
                withEnv(["KUBECONFIG=${env.KUBECONFIG}"]) {
                    sh """
                        echo "Applying Kubernetes manifests..."
                        kubectl apply -f deployment.yml
                        
                        echo "Waiting for deployment rollout..."
                        kubectl rollout status deployment/go-web-app --timeout=300s
                        
                        echo "Current cluster status:"
                        kubectl get deployments
                        kubectl get services
                        kubectl get pods -l app=go-web-app
                        
                        echo "Deployment details:"
                        kubectl describe deployment go-web-app
                    """
                }
                
                // Restore original deployment.yml
                sh 'mv deployment.yml.backup deployment.yml || true'
                
                // Get service URL
                try {
                    def serviceUrl = sh(
                        returnStdout: true,
                        script: """
                            export KUBECONFIG=${env.KUBECONFIG}
                            kubectl get service go-web-app-service -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo ""
                        """
                    ).trim()
                    
                    if (serviceUrl && serviceUrl != "") {
                        echo "🌐 Application URL: http://${serviceUrl}"
                        env.APP_URL = "http://${serviceUrl}"
                    } else {
                        echo "⚠️ LoadBalancer URL not yet available. It may take a few minutes to provision."
                        echo "💡 You can check the service status with: kubectl get service go-web-app-service"
                        
                        // Try to get the service details
                        sh """
                            export KUBECONFIG=${env.KUBECONFIG}
                            echo "Service details:"
                            kubectl get service go-web-app-service -o wide || true
                        """
                    }
                } catch (Exception e) {
                    echo "⚠️ Could not get service URL: ${e.getMessage()}"
                    echo "💡 Service may still be provisioning. Check with: kubectl get service go-web-app-service"
                }
                
                // Verify pods are running
                sh """
                    export KUBECONFIG=${env.KUBECONFIG}
                    echo "Verifying pod status..."
                    kubectl get pods -l app=go-web-app
                    
                    # Check if any pods are not running
                    if kubectl get pods -l app=go-web-app --no-headers | grep -v Running | grep -v Completed; then
                        echo "⚠️ Some pods are not in Running state. Checking pod logs..."
                        kubectl logs -l app=go-web-app --tail=50 || true
                    else
                        echo "✅ All pods are running successfully"
                    fi
                """
                
                echo "✅ EKS_DEPLOY stage completed successfully"
                env.CURRENT_STAGE = 'ALL_STAGES_COMPLETED'
                
            } catch (Exception e) {
                env.CURRENT_STAGE = 'EKS_DEPLOY_FAILED'
                echo "❌ EKS_DEPLOY stage failed: ${e.getMessage()}"
                
                // Restore original deployment.yml if backup exists
                sh 'mv deployment.yml.backup deployment.yml 2>/dev/null || true'
                
                // Show troubleshooting info
                try {
                    sh """
                        export KUBECONFIG=${env.KUBECONFIG}
                        echo "=== TROUBLESHOOTING INFO ==="
                        echo "Current deployments:"
                        kubectl get deployments || true
                        echo "Current pods:"
                        kubectl get pods -l app=go-web-app || true
                        echo "Recent events:"
                        kubectl get events --sort-by=.metadata.creationTimestamp --field-selector type=Warning || true
                    """
                } catch (Exception debugE) {
                    echo "Could not gather troubleshooting info: ${debugE.getMessage()}"
                }
                
                throw e
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
                    def dockerCmd = env.DOCKER_CMD ?: "sudo docker"
                    sh "${dockerCmd} system prune -f || true"
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
