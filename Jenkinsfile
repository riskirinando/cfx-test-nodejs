pipeline {
    agent any
    
    environment {
        AWS_REGION = 'us-east-1'
        ECR_REPOSITORY = 'cfx-test-nodejs'
        EKS_CLUSTER_NAME = 'test-project-eks-cluster'
        IMAGE_TAG = "${BUILD_NUMBER}"
        KUBECONFIG = '/tmp/kubeconfig'
    }
    
    stages {
        stage('Checkout & Setup') {
            steps {
                script {
                    checkout scm
                    env.GIT_COMMIT = sh(returnStdout: true, script: 'git rev-parse HEAD').trim()
                    
                    // Get AWS Account ID
                    env.AWS_ACCOUNT_ID = sh(
                        returnStdout: true,
                        script: 'aws sts get-caller-identity --query Account --output text'
                    ).trim()
                    
                    env.ECR_REGISTRY = "${env.AWS_ACCOUNT_ID}.dkr.ecr.${env.AWS_REGION}.amazonaws.com"
                    env.FULL_IMAGE_URI = "${env.ECR_REGISTRY}/${env.ECR_REPOSITORY}:${env.IMAGE_TAG}"
                    
                    echo "Building image: ${env.FULL_IMAGE_URI}"
                }
            }
        }
        
        stage('Build & Push') {
            steps {
                script {
                    // ECR Login
                    sh """
                        aws ecr get-login-password --region ${env.AWS_REGION} | docker login --username AWS --password-stdin ${env.ECR_REGISTRY}
                    """
                    
                    // Create repository if it doesn't exist
                    sh """
                        aws ecr describe-repositories --repository-names ${env.ECR_REPOSITORY} --region ${env.AWS_REGION} || \
                        aws ecr create-repository --repository-name ${env.ECR_REPOSITORY} --region ${env.AWS_REGION}
                    """
                    
                    // Build and push
                    sh """
                        docker build -t ${env.ECR_REPOSITORY}:${env.IMAGE_TAG} .
                        docker tag ${env.ECR_REPOSITORY}:${env.IMAGE_TAG} ${env.FULL_IMAGE_URI}
                        docker tag ${env.ECR_REPOSITORY}:${env.IMAGE_TAG} ${env.ECR_REGISTRY}/${env.ECR_REPOSITORY}:latest
                        docker push ${env.FULL_IMAGE_URI}
                        docker push ${env.ECR_REGISTRY}/${env.ECR_REPOSITORY}:latest
                    """
                }
            }
        }
        
        stage('Deploy to EKS') {
            steps {
                script {
                    // Configure kubectl
                    sh """
                        aws eks --region ${env.AWS_REGION} update-kubeconfig --name ${env.EKS_CLUSTER_NAME} --kubeconfig ${env.KUBECONFIG}
                        export KUBECONFIG=${env.KUBECONFIG}
                        
                        # Update image in k8s/deployment.yml and apply
                        sed -i 's|IMAGE_PLACEHOLDER|${env.FULL_IMAGE_URI}|g' k8s/deployment.yml
                        kubectl apply -f k8s/deployment.yml
                        kubectl rollout status deployment/cfx-nodejs-app --timeout=300s
                    """
                    
                    // Get service URL (optional)
                    try {
                        env.APP_URL = sh(
                            returnStdout: true,
                            script: """
                                export KUBECONFIG=${env.KUBECONFIG}
                                kubectl get service cfx-nodejs-service -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo 'pending'
                            """
                        ).trim()
                        
                        if (env.APP_URL && env.APP_URL != 'pending') {
                            echo "🌐 Application URL: http://${env.APP_URL}"
                        }
                    } catch (Exception e) {
                        echo "Service URL not yet available"
                    }
                }
            }
        }
    }
    
    post {
        always {
            script {
                echo "=== BUILD SUMMARY ==="
                echo "Build: ${env.BUILD_NUMBER}"
                echo "Image: ${env.FULL_IMAGE_URI}"
                echo "Status: ${currentBuild.currentResult}"
                
                // Cleanup
                sh 'docker system prune -f || true'
                sh "rm -f ${env.KUBECONFIG} || true"
            }
        }
        
        success {
            echo "🎉 Deployment successful!"
        }
        
        failure {
            echo "❌ Deployment failed! Check logs above."
        }
    }
}
