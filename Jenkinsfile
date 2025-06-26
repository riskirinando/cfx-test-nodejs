pipeline {
    agent any
    
    environment {
        AWS_REGION = 'us-east-1'
        ECR_REPOSITORY = 'cfx-test-nodejs'
        EKS_CLUSTER_NAME = 'test-project-eks-cluster'
        IMAGE_TAG = "${BUILD_NUMBER}"
        KUBECONFIG = credentials('kubeconfig')
        AWS_CREDENTIALS = credentials('aws-credentials')
        // AWS_ACCOUNT_ID will be set dynamically in the pipeline
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.GIT_COMMIT = sh(returnStdout: true, script: 'git rev-parse HEAD').trim()
                    env.SHORT_COMMIT = env.GIT_COMMIT.take(7)
                    
                    // Debug environment variables
                    echo "=== Environment Variables Debug ==="
                    echo "AWS_REGION: ${env.AWS_REGION}"
                    echo "ECR_REPOSITORY: ${env.ECR_REPOSITORY}"
                    echo "EKS_CLUSTER_NAME: ${env.EKS_CLUSTER_NAME}"
                    echo "IMAGE_TAG: ${env.IMAGE_TAG}"
                    echo "==============================="
                }
            }
        }
        
        stage('Build and Test') {
            steps {
                script {
                    // Install dependencies
                    sh 'npm ci'
                    
                    // Run linting
                    sh 'npm run lint'
                    
                    // Run tests (if available)
                    sh 'npm test || true'
                }
            }
        }
        
        stage('Build Docker Image') {
            steps {
                script {
                    // Build Docker image
                    def image = docker.build("${ECR_REPOSITORY}:${IMAGE_TAG}")
                    
                    // Tag with latest
                    sh "docker tag ${ECR_REPOSITORY}:${IMAGE_TAG} ${ECR_REPOSITORY}:latest"
                    
                    // Tag with git commit
                    sh "docker tag ${ECR_REPOSITORY}:${IMAGE_TAG} ${ECR_REPOSITORY}:${SHORT_COMMIT}"
                }
            }
        }
        
        stage('Security Scan') {
            steps {
                script {
                    // Run security scan on Docker image
                    sh """
                        docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \\
                        -v \$(pwd):/app aquasec/trivy:latest \\
                        image --exit-code 1 --severity HIGH,CRITICAL \\
                        ${ECR_REPOSITORY}:${IMAGE_TAG} || true
                    """
                }
            }
        }
        
        stage('Push to ECR') {
            steps {
                script {
                    withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: 'aws-credentials']]) {
                        // Get AWS Account ID dynamically
                        env.AWS_ACCOUNT_ID = sh(
                            script: 'aws sts get-caller-identity --query Account --output text',
                            returnStdout: true
                        ).trim()
                        
                        // Set ECR Registry URL
                        env.ECR_REGISTRY = "${env.AWS_ACCOUNT_ID}.dkr.ecr.${env.AWS_REGION}.amazonaws.com"
                        
                        echo "AWS Account ID: ${env.AWS_ACCOUNT_ID}"
                        echo "ECR Registry: ${env.ECR_REGISTRY}"
                        
                        // Login to ECR
                        sh """
                            aws ecr get-login-password --region ${env.AWS_REGION} | \\
                            docker login --username AWS --password-stdin ${env.ECR_REGISTRY}
                        """
                        
                        // Create ECR repository if it doesn't exist
                        sh """
                            aws ecr describe-repositories --repository-names ${env.ECR_REPOSITORY} --region ${env.AWS_REGION} || \\
                            aws ecr create-repository --repository-name ${env.ECR_REPOSITORY} --region ${env.AWS_REGION}
                        """
                        
                        // Tag and push images
                        sh """
                            docker tag ${env.ECR_REPOSITORY}:${env.IMAGE_TAG} ${env.ECR_REGISTRY}/${env.ECR_REPOSITORY}:${env.IMAGE_TAG}
                            docker tag ${env.ECR_REPOSITORY}:latest ${env.ECR_REGISTRY}/${env.ECR_REPOSITORY}:latest
                            docker tag ${env.ECR_REPOSITORY}:${env.SHORT_COMMIT} ${env.ECR_REGISTRY}/${env.ECR_REPOSITORY}:${env.SHORT_COMMIT}
                            
                            docker push ${env.ECR_REGISTRY}/${env.ECR_REPOSITORY}:${env.IMAGE_TAG}
                            docker push ${env.ECR_REGISTRY}/${env.ECR_REPOSITORY}:latest
                            docker push ${env.ECR_REGISTRY}/${env.ECR_REPOSITORY}:${env.SHORT_COMMIT}
                        """
                    }
                }
            }
        }
        
        stage('Deploy to EKS') {
            steps {
                script {
                    withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: 'aws-credentials']]) {
                        // Update kubeconfig
                        sh "aws eks update-kubeconfig --region ${env.AWS_REGION} --name ${env.EKS_CLUSTER_NAME}"
                        
                        // Create k8s directory if it doesn't exist
                        sh "mkdir -p k8s"
                        
                        // Update deployment manifest with new image
                        sh """
                            sed -i 's|YOUR_ECR_REPOSITORY_URI:latest|${env.ECR_REGISTRY}/${env.ECR_REPOSITORY}:${env.IMAGE_TAG}|g' k8s/deployment.yaml
                        """
                        
                        // Apply Kubernetes manifests
                        sh """
                            kubectl apply -f k8s/deployment.yaml
                            kubectl apply -f k8s/ingress.yaml
                        """
                        
                        // Wait for deployment to complete
                        sh """
                            kubectl rollout status deployment/nodejs-app --timeout=300s
                        """
                        
                        // Verify deployment
                        sh """
                            kubectl get pods -l app=nodejs-app
                            kubectl get services nodejs-app-service
                        """
                    }
                }
            }
        }
        
        stage('Health Check') {
            steps {
                script {
                    // Wait for pods to be ready
                    sh """
                        kubectl wait --for=condition=ready pod -l app=nodejs-app --timeout=300s
                    """
                    
                    // Get service endpoint and test
                    sh """
                        kubectl get ingress nodejs-app-ingress
                        
                        # Port forward for testing (in background)
                        kubectl port-forward service/nodejs-app-service 8080:80 &
                        PF_PID=\$!
                        
                        # Wait a moment for port forward to establish
                        sleep 5
                        
                        # Test health endpoint
                        curl -f http://localhost:8080/health || exit 1
                        
                        # Clean up port forward
                        kill \$PF_PID || true
                    """
                }
            }
        }
        
        stage('Cleanup') {
            steps {
                script {
                    // Clean up Docker images to save disk space
                    echo "Cleaning up Docker images..."
                    sh """
                        # Clean up local images
                        docker rmi ${env.ECR_REPOSITORY}:${env.IMAGE_TAG} || true
                        docker rmi ${env.ECR_REPOSITORY}:latest || true
                        docker rmi ${env.ECR_REPOSITORY}:${env.SHORT_COMMIT} || true
                        
                        if [ -n "${env.ECR_REGISTRY}" ]; then
                            docker rmi ${env.ECR_REGISTRY}/${env.ECR_REPOSITORY}:${env.IMAGE_TAG} || true
                            docker rmi ${env.ECR_REGISTRY}/${env.ECR_REPOSITORY}:latest || true
                            docker rmi ${env.ECR_REGISTRY}/${env.ECR_REPOSITORY}:${env.SHORT_COMMIT} || true
                        fi
                        
                        # Clean up dangling images
                        docker image prune -f || true
                        
                        echo "Docker cleanup completed"
                    """
                }
            }
        }
    }
    
    post {
        always {
            script {
                echo "=== Build Cleanup Started ==="
                
                // Use explicit environment variable access
                def awsRegion = env.AWS_REGION ?: 'us-east-1'
                def ecrRepo = env.ECR_REPOSITORY ?: 'cfx-test-nodejs'
                def eksCluster = env.EKS_CLUSTER_NAME ?: 'test-project-eks-cluster'
                def imageTag = env.IMAGE_TAG ?: env.BUILD_NUMBER
                def gitCommit = env.GIT_COMMIT ?: 'N/A'
                
                // Log build information
                def buildInfo = """
                Build Number: ${env.BUILD_NUMBER}
                Git Commit: ${gitCommit}
                Image Tag: ${imageTag}
                ECR Repository: ${ecrRepo}
                Build Time: ${new Date()}
                EKS Cluster: ${eksCluster}
                AWS Region: ${awsRegion}
                Build Status: ${currentBuild.currentResult}
                """
                
                echo buildInfo
                
                // Simple cleanup that doesn't require node context
                echo "Docker image cleanup will be handled by Jenkins Docker plugin or manually"
                echo "=== Build Cleanup Completed ==="
            }
        }
        
        success {
            script {
                echo "✅ Deployment successful!"
                def ecrRepo = env.ECR_REPOSITORY ?: 'cfx-test-nodejs'
                def imageTag = env.IMAGE_TAG ?: env.BUILD_NUMBER
                def eksCluster = env.EKS_CLUSTER_NAME ?: 'test-project-eks-cluster'
                def awsRegion = env.AWS_REGION ?: 'us-east-1'
                
                echo """
                🎉 SUCCESS SUMMARY:
                - Application: ${ecrRepo}
                - Version: ${imageTag}
                - Cluster: ${eksCluster}
                - Region: ${awsRegion}
                - Build URL: ${env.BUILD_URL}
                """
                
                // Set build description
                currentBuild.description = "✅ Deployed ${ecrRepo}:${imageTag} to ${eksCluster}"
            }
        }
        
        failure {
            script {
                echo "❌ Deployment failed!"
                def ecrRepo = env.ECR_REPOSITORY ?: 'cfx-test-nodejs'
                def imageTag = env.IMAGE_TAG ?: env.BUILD_NUMBER
                def eksCluster = env.EKS_CLUSTER_NAME ?: 'test-project-eks-cluster'
                def awsRegion = env.AWS_REGION ?: 'us-east-1'
                
                echo """
                💥 FAILURE SUMMARY:
                - Application: ${ecrRepo}
                - Version: ${imageTag}
                - Cluster: ${eksCluster}
                - Region: ${awsRegion}
                - Build URL: ${env.BUILD_URL}
                - Failed Stage: ${env.STAGE_NAME ?: 'Unknown'}
                """
                
                // Set build description
                currentBuild.description = "❌ Failed to deploy ${ecrRepo}:${imageTag} to ${eksCluster}"
                
                echo """
                🔍 TROUBLESHOOTING TIPS:
                1. Check AWS credentials and permissions
                2. Verify EKS cluster is accessible
                3. Check ECR repository permissions
                4. Review Kubernetes manifests
                5. Check application logs: kubectl logs -l app=nodejs-app
                """
            }
        }
        
        unstable {
            script {
                echo "⚠️ Build completed with warnings"
                def ecrRepo = env.ECR_REPOSITORY ?: 'cfx-test-nodejs'
                def imageTag = env.IMAGE_TAG ?: env.BUILD_NUMBER
                def eksCluster = env.EKS_CLUSTER_NAME ?: 'test-project-eks-cluster'
                currentBuild.description = "⚠️ Unstable deployment ${ecrRepo}:${imageTag}"
            }
        }
    }
}
