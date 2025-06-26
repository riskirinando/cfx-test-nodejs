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
            sh """
                ${dockerCmd} tag cfx-test-nodejs ${FULL_IMAGE_URI}
                ${dockerCmd} tag cfx-test-nodejs ${ECR_REGISTRY}/${env.ECR_REPOSITORY}:latest
                ${dockerCmd} push ${FULL_IMAGE_URI}
                ${dockerCmd} push ${ECR_REGISTRY}/${env.ECR_REPOSITORY}:latest
            """

            echo "✅ Image pushed to ECR successfully"
        }
    }
}
