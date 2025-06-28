const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes
app.get('/api/users', (req, res) => {
  const users = [
    { id: 1, name: 'Riski Rinando', email: 'riskirinando@gmail.com' }
  ];
  res.json(users);
});

app.post('/api/users', (req, res) => {
  const { name, email } = req.body;
  
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }
  
  const newUser = {
    id: Date.now(),
    name,
    email
  };
  
  res.status(201).json(newUser);
});

// Main route
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Node.js EKS App</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #333; }
            .status { background: #d4edda; color: #155724; padding: 10px; border-radius: 4px; margin: 20px 0; }
            .api-section { background: #f8f9fa; padding: 20px; border-radius: 4px; margin: 20px 0; }
            button { background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; }
            button:hover { background: #0056b3; }
            .result { background: #e9ecef; padding: 10px; border-radius: 4px; margin-top: 10px; white-space: pre-wrap; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🚀 Node.js Application on Amazon EKS Fargate Cluster</h1>
            <div class="status">
                ✅ Application is running successfully!
            </div>
            
            <div class="api-section">
                <h3>API Endpoints</h3>
                <p><strong>GET /health</strong> - Health check endpoint</p>
                <button onclick="checkHealth()">Check Health</button>
                
                <p><strong>GET /api/users</strong> - Get all users</p>
                <button onclick="getUsers()">Get Users</button>
                
                <div id="result" class="result" style="display: none;"></div>
            </div>
            
            <div class="api-section">
                <h3>Environment Info</h3>
                <p>Node.js Version: ${process.version}</p>
                <p>Environment: ${process.env.NODE_ENV || 'development'}</p>
                <p>Container: ${process.env.HOSTNAME || 'local'}</p>
                <p>Timestamp: ${new Date().toISOString()}</p>
            </div>
        </div>
        
        <script>
            async function checkHealth() {
                try {
                    const response = await fetch('/health');
                    const data = await response.json();
                    document.getElementById('result').style.display = 'block';
                    document.getElementById('result').textContent = JSON.stringify(data, null, 2);
                } catch (error) {
                    document.getElementById('result').style.display = 'block';
                    document.getElementById('result').textContent = 'Error: ' + error.message;
                }
            }
            
            async function getUsers() {
                try {
                    const response = await fetch('/api/users');
                    const data = await response.json();
                    document.getElementById('result').style.display = 'block';
                    document.getElementById('result').textContent = JSON.stringify(data, null, 2);
                } catch (error) {
                    document.getElementById('result').style.display = 'block';
                    document.getElementById('result').textContent = 'Error: ' + error.message;
                }
            }
        </script>
    </body>
    </html>
  `);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📊 Health check available at http://localhost:${port}/health`);
});
