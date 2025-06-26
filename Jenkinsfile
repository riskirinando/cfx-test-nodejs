pipeline {
    agent any
    
    environment {
        AWS_REGION = 'us-east-1'  // Change to your preferred region
        ECR_REPOSITORY = 'cfx-test-nodejs'
        EKS_CLUSTER_NAME = 'test-project-eks-cluster'
        ECR_REGISTRY = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
        IMAGE_TAG = "${BUILD_NUMBER}"
        KUBECONFIG = credentials('kubeconfig')
        AWS_CREDENTIALS = credentials('aws-credentials')
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
                        // Login to ECR
                        sh """
                            aws ecr get-login-password --region ${AWS_REGION} | \\
                            docker login --username AWS --password-stdin ${ECR_REGISTRY}
                        """
                        
                        // Create ECR repository if it doesn't exist
                        sh """
                            aws ecr describe-repositories --repository-names ${ECR_REPOSITORY} --region ${AWS_REGION} || \\
                            aws ecr create-repository --repository-name ${ECR_REPOSITORY} --region ${AWS_REGION}
                        """
                        
                        // Tag and push images
                        sh """
                            docker tag ${ECR_REPOSITORY}:${IMAGE_TAG} ${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}
                            docker tag ${ECR_REPOSITORY}:latest ${ECR_REGISTRY}/${ECR_REPOSITORY}:latest
                            docker tag ${ECR_REPOSITORY}:${SHORT_COMMIT} ${ECR_REGISTRY}/${ECR_REPOSITORY}:${SHORT_COMMIT}
                            
                            docker push ${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}
                            docker push ${ECR_REGISTRY}/${ECR_REPOSITORY}:latest
                            docker push ${ECR_REGISTRY}/${ECR_REPOSITORY}:${SHORT_COMMIT}
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
                        
                        // Update deployment manifest with new image
                        sh """
                            sed -i 's|YOUR_ECR_REPOSITORY_URI:latest|${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}|g' k8s/deployment.yaml
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
            // Clean up Docker images
            sh """
                docker rmi ${ECR_REPOSITORY}:${IMAGE_TAG} || true
                docker rmi ${ECR_REPOSITORY}:latest || true
                docker rmi ${ECR_REPOSITORY}:${SHORT_COMMIT} || true
                docker rmi ${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG} || true
                docker rmi ${ECR_REGISTRY}/${ECR_REPOSITORY}:latest || true
                docker rmi ${ECR_REGISTRY}/${ECR_REPOSITORY}:${SHORT_COMMIT} || true
            """
        }
        
        success {
            echo "✅ Deployment successful!"
            script {
                // Send notification (optional)
                if (env.SLACK_WEBHOOK) {
                    sh """
                        curl -X POST -H 'Content-type: application/json' \\
                        --data '{"text":"✅ Deployment successful for ${ECR_REPOSITORY}:${IMAGE_TAG}"}' \\
                        ${env.SLACK_WEBHOOK}
                    """
                }
            }
        }
        
        failure {
            echo "❌ Deployment failed!"
            script {
                // Send notification (optional)
                if (env.SLACK_WEBHOOK) {
                    sh """
                        curl -X POST -H 'Content-type: application/json' \\
                        --data '{"text":"❌ Deployment failed for ${ECR_REPOSITORY}:${IMAGE_TAG}"}' \\
                        ${env.SLACK_WEBHOOK}
                    """
                }
            }
        }
    }
}
