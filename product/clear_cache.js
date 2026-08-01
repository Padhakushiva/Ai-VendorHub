const Redis = require('ioredis');
const dotenv = require('dotenv');
dotenv.config();

async function clearCache() {
  const client = new Redis({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD
  });

  client.on('error', (err) => console.log('Redis Client Error', err));

  await client.flushall();
  console.log('Redis cache cleared successfully!');
  await client.quit();
}

clearCache();
