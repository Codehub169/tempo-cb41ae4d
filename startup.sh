#!/bin/bash

# Navigate to the directory where the script is located (optional, assumes execution from project root)
# cd "$(dirname "$0")"

# Inform the user about the process
echo "Starting up the Netra Jyoti Eye Clinic application..."

# Step 1: Install dependencies
echo "Installing npm dependencies..."
if npm install; then
    echo "Dependencies installed successfully."
else
    echo "Failed to install npm dependencies. Please check your npm and Node.js setup."
    exit 1
fi

# Step 2: Create data directory for SQLite database if it doesn't exist
# (server.js also handles this, but good practice for startup script)
echo "Ensuring data directory exists..."
if mkdir -p data; then
    echo "Data directory ensured."
else
    echo "Failed to create data directory."
    # This might not be a fatal error if server.js can create it, but good to note.
fi

# Step 3: Start the Node.js server
# The server.js file is configured to listen on port 9000.
echo "Starting the Express server on port 9000..."
node server.js

# If you prefer to use the npm start script defined in package.json:
# npm start

echo "Application startup script finished."
# Note: The script will hang here while server.js is running. Ctrl+C to stop.
