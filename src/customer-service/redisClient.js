const redis = require('redis');
const client = redis.createClient({
    host: 'redis',
    port: 6379
});

client.on('error', (err) => {
    console.log('Redis error:', err);
});

module.exports = client;
