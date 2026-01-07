#!/bin/bash

# Architecture Review System - Local Development Script
# This script starts the frontend development server

set -e

echo "🚀 Architecture Review System - Local Development"
echo "================================================="
echo ""

# Check if .env file exists
if [ ! -f "packages/frontend/.env" ]; then
    echo "❌ Error: packages/frontend/.env not found"
    echo "   Run: ./scripts/setup.sh first"
    exit 1
fi

echo "✅ Environment file found"
echo ""

# Check if dependencies are installed
if [ ! -d "packages/frontend/node_modules" ]; then
    echo "📥 Installing frontend dependencies..."
    cd packages/frontend
    npm install
    cd ../..
    echo "✅ Dependencies installed"
    echo ""
fi

# Start frontend
echo "🚀 Starting frontend development server..."
echo "   URL: http://localhost:5173"
echo ""
echo "   Press Ctrl+C to stop"
echo ""

cd packages/frontend
npm run dev
