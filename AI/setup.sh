#!/bin/bash

# 🚀 AI Service - Quick Setup Script
# This script sets up the AI service environment

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║    🤖  AI Service Quick Setup                             ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo "✅ Dependencies installed"
else
    echo "✅ Dependencies already installed"
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚙️  Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created"
    echo ""
    echo "📝 IMPORTANT: Edit .env and add your Google API key:"
    echo "   GOOGLE_API_KEY=your_google_api_key_here"
    echo ""
else
    echo "✅ .env file already exists"
fi

# Show next steps
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  ✅ Setup Complete!                                        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📋 Next Steps:"
echo "  1. Edit .env and add your Google Gemini API key"
echo "  2. Start server: npm run dev"
echo "  3. Test endpoints: node src/tests/integration.test.js"
echo ""
echo "🌐 Server: http://localhost:3005"
echo "📚 Docs: See README.md and AI_API_DOCUMENTATION.md"
echo ""
