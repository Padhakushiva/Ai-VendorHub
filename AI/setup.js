#!/usr/bin/env node

/**
 * 🚀 AI Service - Complete Setup & Verification Script
 * 
 * This script verifies the AI service setup and provides quick-start instructions
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  title: (text) => console.log(`\n${colors.cyan}${colors.bright}${text}${colors.reset}`),
  success: (text) => console.log(`${colors.green}✅ ${text}${colors.reset}`),
  error: (text) => console.log(`${colors.red}❌ ${text}${colors.reset}`),
  warning: (text) => console.log(`${colors.yellow}⚠️  ${text}${colors.reset}`),
  info: (text) => console.log(`${colors.blue}ℹ️  ${text}${colors.reset}`),
  code: (text) => console.log(`${colors.bright}${text}${colors.reset}`),
};

const checkFile = (filepath, description) => {
  if (fs.existsSync(filepath)) {
    log.success(`${description}: ${filepath}`);
    return true;
  } else {
    log.error(`Missing: ${description}`);
    return false;
  }
};

const verifySetup = () => {
  log.title('🔍 Verifying AI Service Setup');

  const checks = {
    'Core Files': [
      ['server.js', 'Main server file'],
      ['src/app.js', 'Express app'],
      ['package.json', 'Dependencies'],
    ],
    'Routes': [['src/routes/ai.routes.js', 'AI routes']],
    'Controllers': [
      ['src/controllers/searchIntent.controller.js', 'Search intent'],
      ['src/controllers/description.controller.js', 'Description generator'],
      ['src/controllers/categoryTag.controller.js', 'Category/tag suggestion'],
      ['src/controllers/reviewSummary.controller.js', 'Review summary'],
    ],
    'Services': [
      ['src/services/searchIntent.service.js', 'Search intent service'],
      ['src/services/description.service.js', 'Description service'],
      ['src/services/categoryTag.service.js', 'Category/tag service'],
      ['src/services/reviewSummary.service.js', 'Review summary service'],
    ],
    'Documentation': [
      ['README.md', 'Main README'],
      ['AI_API_DOCUMENTATION.md', 'API documentation'],
      ['AI_SETUP_GUIDE.md', 'Setup guide'],
      ['.env.example', 'Environment template'],
    ],
  };

  let allPassed = true;

  for (const [category, files] of Object.entries(checks)) {
    log.info(`\n${colors.bright}${category}:${colors.reset}`);
    for (const [file, desc] of files) {
      if (!checkFile(file, desc)) {
        allPassed = false;
      }
    }
  }

  return allPassed;
};

const showQuickStart = () => {
  log.title('🚀 Quick Start Guide');

  console.log(`
${colors.bright}1. Install Dependencies:${colors.reset}
   npm install

${colors.bright}2. Setup Environment:${colors.reset}
   cp .env.example .env
   # Edit .env and add your Google API key

${colors.bright}3. Start Development Server:${colors.reset}
   npm run dev

${colors.bright}4. Test Endpoints:${colors.reset}
   node src/tests/integration.test.js

${colors.bright}5. Or use cURL:${colors.reset}
   curl -X POST http://localhost:3005/ai/search-intent \\
     -H "Authorization: Bearer token" \\
     -H "Content-Type: application/json" \\
     -d '{"query": "shoes under 2000"}'
`);
};

const showEndpoints = () => {
  log.title('📋 Available Endpoints');

  const endpoints = [
    {
      method: 'GET',
      path: '/',
      auth: false,
      description: 'Service info',
    },
    {
      method: 'GET',
      path: '/health',
      auth: false,
      description: 'Health check',
    },
    {
      method: 'POST',
      path: '/ai/search-intent',
      auth: true,
      description: 'Natural language search',
    },
    {
      method: 'POST',
      path: '/ai/generate-description',
      auth: false,
      description: 'Generate product description',
    },
    {
      method: 'POST',
      path: '/ai/suggest-category-tags',
      auth: false,
      description: 'Suggest categories and tags',
    },
    {
      method: 'POST',
      path: '/ai/review-summary/:productId',
      auth: true,
      description: 'Summarize product reviews',
    },
  ];

  console.log(`
${colors.bright}Port: 3005${colors.reset}
${colors.bright}Base URL: http://localhost:3005${colors.reset}
`);

  endpoints.forEach((ep) => {
    const authLabel = ep.auth ? `${colors.red}🔐${colors.reset}` : `${colors.green}🔓${colors.reset}`;
    console.log(
      `${colors.bright}${ep.method.padEnd(6)}${colors.reset} ${ep.path.padEnd(40)} ${authLabel} ${ep.description}`
    );
  });
};

const showEnvironment = () => {
  log.title('⚙️ Required Environment Variables');

  const envVars = [
    {
      name: 'GOOGLE_API_KEY',
      description: 'Google Gemini API key',
      required: true,
      source: 'https://aistudio.google.com/app/apikey',
    },
    {
      name: 'NODE_ENV',
      description: 'Environment mode',
      required: false,
      default: 'development',
    },
    {
      name: 'PORT',
      description: 'Server port',
      required: false,
      default: '3005',
    },
    {
      name: 'PRODUCT_SERVICE_URL',
      description: 'Product service URL',
      required: false,
      default: 'http://localhost:3000',
    },
  ];

  envVars.forEach((env) => {
    const required = env.required ? `${colors.red}REQUIRED${colors.reset}` : `${colors.green}Optional${colors.reset}`;
    console.log(`
${colors.bright}${env.name}${colors.reset}
  Status: ${required}
  Description: ${env.description}
  ${env.default ? `Default: ${env.default}` : ''}
  ${env.source ? `Get from: ${env.source}` : ''}`);
  });
};

const showStructure = () => {
  log.title('📁 Project Structure');

  console.log(`
AI/
├── 📄 server.js                        # Entry point (starts on port 3005)
├── 📄 package.json                     # Dependencies & scripts
├── 📄 .env.example                     # Environment template
├── 📘 README.md                        # Quick overview
├── 📘 AI_API_DOCUMENTATION.md          # Complete API docs
├── 📘 AI_SETUP_GUIDE.md                # Detailed setup & troubleshooting
│
└── 📁 src/
    ├── 📄 app.js                       # Express configuration
    │
    ├── 📁 routes/
    │   └── 📄 ai.routes.js             # All endpoint routes
    │
    ├── 📁 controllers/                 # Request handlers
    │   ├── 📄 searchIntent.controller.js
    │   ├── 📄 description.controller.js
    │   ├── 📄 categoryTag.controller.js
    │   └── 📄 reviewSummary.controller.js
    │
    ├── 📁 services/                    # Business logic
    │   ├── 📄 searchIntent.service.js
    │   ├── 📄 description.service.js
    │   ├── 📄 categoryTag.service.js
    │   └── 📄 reviewSummary.service.js
    │
    ├── 📁 tests/
    │   └── 📄 integration.test.js       # API tests
    │
    ├── 📁 agent/                       # Legacy AI agent (optional)
    │   ├── 📄 agent.js
    │   ├── 📄 tools.js
    │   └── 📄 test.js
    │
    └── 📁 sokcets/                     # WebSocket (optional)
        └── 📄 sockets.server.js
`);
};

const main = () => {
  console.log(`
${colors.cyan}${colors.bright}
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║    🤖  AI Service - Ai-VendorHub Marketplace Project     ║
║                                                            ║
║          Intelligent Features for Better Discovery        ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
${colors.reset}`);

  const setupOk = verifySetup();

  if (setupOk) {
    log.success('All files are in place!');
  } else {
    log.warning('Some files are missing. Please review the setup.');
  }

  showStructure();
  showEndpoints();
  showEnvironment();
  showQuickStart();

  log.title('📚 Resources');
  console.log(`
${colors.bright}Documentation:${colors.reset}
  • Full API Docs: See AI_API_DOCUMENTATION.md
  • Setup Guide: See AI_SETUP_GUIDE.md
  • Quick Start: See README.md

${colors.bright}Testing:${colors.reset}
  • Integration Tests: node src/tests/integration.test.js
  • Manual Testing: Use cURL or Postman

${colors.bright}Troubleshooting:${colors.reset}
  • Check error logs in console
  • Verify .env configuration
  • Ensure all services are running
  • Review AI_SETUP_GUIDE.md for common issues
`);

  log.title('✅ Setup Complete!');
  console.log(`
${colors.bright}Next Steps:${colors.reset}
  1. Configure .env with your Google API key
  2. Start the server: npm run dev
  3. Test endpoints: node src/tests/integration.test.js
  4. Integrate with your frontend

${colors.bright}Server will run on:${colors.reset} http://localhost:3005

Happy coding! 🚀
`);
};

main();
