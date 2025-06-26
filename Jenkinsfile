pipeline {
    agent any
    
    environment {
        AWS_REGION = 'us-east-1'
        ECR_REPOSITORY = 'cfx-test-nodejs'
        EKS_CLUSTER_NAME = 'test-project-eks-cluster'
        IMAGE_TAG = "${BUILD_NUMBER}"
        CURRENT_STAGE = 'NONE'
    }
    
    stages {
        stage('Debug - Checkout') {
            steps {
                script {
                    env.CURRENT_STAGE = 'CHECKOUT'
                    echo "=== STAGE: ${env.CURRENT_STAGE} ==="
                    
                    try {
                        checkout scm
                        echo "✅ SCM checkout successful"
                        
                        // Check workspace
                        sh 'pwd && ls -la'
                        
                        // Try git operations
                        try {
                            env.GIT_COMMIT = sh(returnStdout: true, script: 'git rev-parse HEAD').trim()
                            echo "✅ Git commit: ${env.GIT_COMMIT}"
                        } catch (Exception e) {
                            echo "⚠️ Git operation failed: ${e.getMessage()}"
                            env.GIT_COMMIT = "unknown-${env.BUILD_NUMBER}"
                        }
                        
                        echo "✅ CHECKOUT stage completed successfully"
                        
                    } catch (Exception e) {
                        env.CURRENT_STAGE = 'CHECKOUT_FAILED'
                        echo "❌ CHECKOUT stage failed: ${e.getMessage()}"
                        throw e
                    }
                }
            }
        }
        
        stage('Debug - Prerequisites Check') {
            steps {
                script {
                    env.CURRENT_STAGE = 'PREREQUISITES'
                    echo "=== STAGE: ${env.CURRENT_STAGE} ==="
                    
                    try {
                        // Check for required files
                        echo "Checking for required files..."
                        
                        if (fileExists('package.json')) {
                            echo "✅ package.json found"
                            sh 'cat package.json'
                        } else {
                            echo "❌ package.json NOT found"
                        }
                        
                        if (fileExists('Dockerfile')) {
                            echo "✅ Dockerfile found"
                        } else {
                            echo "❌ Dockerfile NOT found"
                        }
                        
                        echo "✅ PREREQUISITES stage completed successfully"
                        
                    } catch (Exception e) {
                        env.CURRENT_STAGE = 'PREREQUISITES_FAILED'
                        echo "❌ PREREQUISITES stage failed: ${e.getMessage()}"
                        throw e
                    }
                }
            }
        }
        
        stage('Debug - Basic Commands') {
            steps {
                script {
                    env.CURRENT_STAGE = 'BASIC_COMMANDS'
                    echo "=== STAGE: ${env.CURRENT_STAGE} ==="
                    
                    try {
                        // Test basic commands
                        echo "Testing basic commands..."
                        
                        sh 'which node || echo "Node not found"'
                        sh 'which npm || echo "NPM not found"'
                        sh 'which docker || echo "Docker not found"'
                        sh 'which aws || echo "AWS CLI not found"'
                        
                        echo "✅ BASIC_COMMANDS stage completed successfully"
                        
                    } catch (Exception e) {
                        env.CURRENT_STAGE = 'BASIC_COMMANDS_FAILED'
                        echo "❌ BASIC_COMMANDS stage failed: ${e.getMessage()}"
                        throw e
                    }
                }
            }
        }
        
        stage('Debug - Environment Test') {
            steps {
                script {
                    env.CURRENT_STAGE = 'ENVIRONMENT_TEST'
                    echo "=== STAGE: ${env.CURRENT_STAGE} ==="
                    
                    try {
                        echo "Testing environment variables..."
                        echo "AWS_REGION: ${env.AWS_REGION}"
                        echo "ECR_REPOSITORY: ${env.ECR_REPOSITORY}"
                        echo "EKS_CLUSTER_NAME: ${env.EKS_CLUSTER_NAME}"
                        echo "IMAGE_TAG: ${env.IMAGE_TAG}"
                        echo "BUILD_NUMBER: ${env.BUILD_NUMBER}"
                        echo "GIT_COMMIT: ${env.GIT_COMMIT}"
                        
                        echo "✅ ENVIRONMENT_TEST stage completed successfully"
                        env.CURRENT_STAGE = 'ALL_STAGES_COMPLETED'
                        
                    } catch (Exception e) {
                        env.CURRENT_STAGE = 'ENVIRONMENT_TEST_FAILED'
                        echo "❌ ENVIRONMENT_TEST stage failed: ${e.getMessage()}"
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
                    echo "=== POST ACTIONS DEBUG ==="
                    echo "Current Stage When Post Executed: ${env.CURRENT_STAGE}"
                    echo "Build Result: ${currentBuild.currentResult}"
                    echo "Build Number: ${env.BUILD_NUMBER}"
                    
                    // Print all environment variables for debugging
                    echo "=== ALL ENVIRONMENT VARIABLES ==="
                    sh 'printenv | sort'
                    echo "================================="
                    
                } catch (Exception e) {
                    echo "Error in post always: ${e.getMessage()}"
                }
            }
        }
        
        success {
            script {
                try {
                    echo "🎉 All stages completed successfully!"
                    echo "Final stage reached: ${env.CURRENT_STAGE}"
                } catch (Exception e) {
                    echo "Error in post success: ${e.getMessage()}"
                }
            }
        }
        
        failure {
            script {
                try {
                    echo "❌ Pipeline failed!"
                    echo "Failed at stage: ${env.CURRENT_STAGE}"
                    echo "Build result: ${currentBuild.currentResult}"
                    
                    // Simplified failure logging - removed problematic rawBuild access
                    echo "Build URL: ${env.BUILD_URL}"
                    echo "Job Name: ${env.JOB_NAME}"
                    echo "Build Cause: ${currentBuild.getBuildCauses()}"
                    
                } catch (Exception e) {
                    echo "Error in post failure: ${e.getMessage()}"
                }
            }
        }
    }
}
