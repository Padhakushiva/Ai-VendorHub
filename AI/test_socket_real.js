/**
 * Socket.io End-to-End Test for AI Agent
 *
 * Usage:
 *   TEST_JWT_TOKEN=<your-jwt-token> node test_socket_real.js
 *
 * To get a JWT token:
 *   1. Start Auth service: cd Auth && npm start
 *   2. POST /api/auth/login with credentials
 *   3. Copy the token from the response
 */

const io = require('socket.io-client');
const jwt = require('jsonwebtoken');

// Get token from env or generate a test one
const JWT_SECRET = process.env.JWT_SECRET || 'f81dcb1e2670124624d0794b272ba1ab9926a5ffcb5ca23c66b9cfa622caf8af';
const TEST_TOKEN = process.env.TEST_JWT_TOKEN || jwt.sign(
  { userId: 'test-user-001', email: 'test@example.com', role: 'user' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

console.log('🔗 Connecting to AI server...');
console.log(`🔑 Using ${process.env.TEST_JWT_TOKEN ? 'provided' : 'generated test'} JWT token`);

// Connect with multiple auth methods for compatibility
const socket = io('http://localhost:3005', {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 3,
  // Method 1: Auth object (recommended for socket.io v4+)
  auth: {
    token: TEST_TOKEN,
  },
  // Method 2: Cookie header
  extraHeaders: {
    Cookie: `token=${TEST_TOKEN}`,
  },
});

// ─── Event Handlers ───

socket.on('connect', () => {
  console.log('✅ Connected to AI server (socket ID:', socket.id, ')');
});

socket.on('connected', (data) => {
  console.log('📢 Server welcome:', data.message);

  // Send test queries
  console.log('\n📤 Sending test query: "Show me phones under 50000"');
  socket.emit('message', { query: 'Show me phones under 50000' });
});

socket.on('typing', (data) => {
  if (data.isTyping) {
    console.log('⏳ AI is typing...');
  }
});

socket.on('response', (data) => {
  console.log('\n✅ AI Response received:');
  console.log('─'.repeat(50));
  console.log(data.message);
  console.log('─'.repeat(50));
  console.log(`📅 Timestamp: ${data.timestamp}`);

  // Send a second test query after first response
  if (!socket._secondQuerySent) {
    socket._secondQuerySent = true;
    console.log('\n📤 Sending test query 2: "Who is the PM of India?"');
    socket.emit('message', { query: 'Who is the PM of India?' });
  } else {
    console.log('\n✅ All tests completed! Disconnecting...');
    socket.disconnect();
    process.exit(0);
  }
});

socket.on('connect_error', (err) => {
  console.error('❌ Connection error:', err.message);
  if (err.message.includes('Authentication')) {
    console.error('\n💡 Tip: Provide a valid JWT token:');
    console.error('   TEST_JWT_TOKEN=<your-token> node test_socket_real.js');
    console.error('\n   Or start the Auth service and get a token via POST /api/auth/login');
  }
  process.exit(1);
});

socket.on('error', (data) => {
  console.error('❌ Error from server:', data);
});

socket.on('disconnect', (reason) => {
  console.log(`📴 Disconnected: ${reason}`);
});

// Timeout safety
setTimeout(() => {
  console.error('❌ Timeout — no response within 30s');
  socket.disconnect();
  process.exit(1);
}, 30000);
