pipeline {
    agent any
    
    environment {
        AWS_REGION = 'us-east-1'  // Change to your preferred region
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
                        env.ECR_REGISTRY = "${env.AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
                        
                        echo "AWS Account ID: ${env.AWS_ACCOUNT_ID}"
                        echo "ECR Registry: ${env.ECR_REGISTRY}"
                        
                        // Login to ECR
                        sh """
                            aws ecr get-login-password --region ${AWS_REGION} | \\
                            docker login --username AWS --password-stdin ${env.ECR_REGISTRY}
                        """
                        
                        // Create ECR repository if it doesn't exist
                        sh """
                            aws ecr describe-repositories --repository-names ${ECR_REPOSITORY} --region ${AWS_REGION} || \\
                            aws ecr create-repository --repository-name ${ECR_REPOSITORY} --region ${AWS_REGION}
                        """
                        
                        // Tag and push images
                        sh """
                            docker tag ${ECR_REPOSITORY}:${IMAGE_TAG} ${env.ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}
                            docker tag ${ECR_REPOSITORY}:latest ${env.ECR_REGISTRY}/${ECR_REPOSITORY}:latest
                            docker tag ${ECR_REPOSITORY}:${SHORT_COMMIT} ${env.ECR_REGISTRY}/${ECR_REPOSITORY}:${SHORT_COMMIT}
                            
                            docker push ${env.ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}
                            docker push ${env.ECR_REGISTRY}/${ECR_REPOSITORY}:latest
                            docker push ${env.ECR_REGISTRY}/${ECR_REPOSITORY}:${SHORT_COMMIT}
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
                        sh "aws eks update-kubeconfig --region ${AWS_REGION} --name ${EKS_CLUSTER_NAME}"
                        
                        // Create k8s directory if it doesn't exist
                        sh "mkdir -p k8s"
                        
                        // Update deployment manifest with new image
                        sh """
                            sed -i 's|YOUR_ECR_REPOSITORY_URI:latest|${env.ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}|g' k8s/deployment.yaml
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
    }
    
    post {
        always {
            script {
                // Clean up Docker images - use env variables properly
                def ecrRepo = env.ECR_REPOSITORY ?: 'nodejs-eks-app'
                def imageTag = env.IMAGE_TAG ?: env.BUILD_NUMBER
                def shortCommit = env.SHORT_COMMIT ?: 'latest'
                def ecrRegistry = env.ECR_REGISTRY ?: "${env.AWS_ACCOUNT_ID}.dkr.ecr.${env.AWS_REGION}.amazonaws.com"
                
                sh """
                    docker rmi ${ecrRepo}:${imageTag} || true
                    docker rmi ${ecrRepo}:latest || true
                    docker rmi ${ecrRepo}:${shortCommit} || true
                    docker rmi ${ecrRegistry}/${ecrRepo}:${imageTag} || true
                    docker rmi ${ecrRegistry}/${ecrRepo}:latest || true
                    docker rmi ${ecrRegistry}/${ecrRepo}:${shortCommit} || true
                    
                    # Clean up any dangling images
                    docker image prune -f || true
                """
            }
        }
        
        success {
            echo "✅ Deployment successful!"
            script {
                def ecrRepo = env.ECR_REPOSITORY ?: 'nodejs-eks-app'
                def imageTag = env.IMAGE_TAG ?: env.BUILD_NUMBER
                
                // Send success notification (optional)
                if (env.SLACK_WEBHOOK) {
                    sh """
                        curl -X POST -H 'Content-type: application/json' \\
                        --data '{"text":"✅ Deployment successful for ${ecrRepo}:${imageTag} in cluster ${env.EKS_CLUSTER_NAME}"}' \\
                        '${env.SLACK_WEBHOOK}'
                    """
                }
                
                // Archive build info
                writeFile file: 'build-info.txt', text: """
Build Number: ${env.BUILD_NUMBER}
Git Commit: ${env.GIT_COMMIT}
Image Tag: ${imageTag}
ECR Repository: ${ecrRepo}
Deployment Time: ${new Date()}
"""
                archiveArtifacts artifacts: 'build-info.txt', allowEmptyArchive: true
            }
        }
        
        failure {
            echo "❌ Deployment failed!"
            script {
                def ecrRepo = env.ECR_REPOSITORY ?: 'nodejs-eks-app'
                def imageTag = env.IMAGE_TAG ?: env.BUILD_NUMBER
                
                // Send failure notification (optional)
                if (env.SLACK_WEBHOOK) {
                    sh """
                        curl -X POST -H 'Content-type: application/json' \\
                        --data '{"text":"❌ Deployment failed for ${ecrRepo}:${imageTag} in cluster ${env.EKS_CLUSTER_NAME}. Build: ${env.BUILD_URL}"}' \\
                        '${env.SLACK_WEBHOOK}'
                    """
                }
                
                // Collect logs for debugging
                sh """
                    echo "=== Docker Images ===" > debug-info.txt
                    docker images >> debug-info.txt || true
                    echo "=== Kubernetes Pods ===" >> debug-info.txt
                    kubectl get pods -l app=nodejs-app >> debug-info.txt || true
                    echo "=== Kubernetes Events ===" >> debug-info.txt
                    kubectl get events --sort-by=.metadata.creationTimestamp >> debug-info.txt || true
                """
                archiveArtifacts artifacts: 'debug-info.txt', allowEmptyArchive: true
            }
        }
    }
}
