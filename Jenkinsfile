pipeline {
    agent any
    
    environment {
        AWS_REGION = 'us-east-1'
        ECR_REPOSITORY = 'cfx-test-nodejs'
        EKS_CLUSTER_NAME = 'test-project-eks-cluster'
        IMAGE_TAG = "${BUILD_NUMBER}"
    }
    
    stages {
        stage('Test Stage 1') {
            steps {
                echo "=== Test Stage 1 Started ==="
                echo "This is a basic test"
                echo "Build Number: ${BUILD_NUMBER}"
                echo "=== Test Stage 1 Completed ==="
            }
        }
        
        stage('Test Stage 2') {
            steps {
                script {
                    echo "=== Test Stage 2 Started ==="
                    echo "AWS_REGION: ${env.AWS_REGION}"
                    echo "ECR_REPOSITORY: ${env.ECR_REPOSITORY}"
                    echo "IMAGE_TAG: ${env.IMAGE_TAG}"
                    echo "=== Test Stage 2 Completed ==="
                }
            }
        }
    }
    
    post {
        always {
            echo "Post actions executed successfully"
        }
        success {
            echo "Pipeline completed successfully"
        }
        failure {
            echo "Pipeline failed"
        }
    }
}
