const redis = require('redis');
const { promisify } = require('util');

const redisClient = redis.createClient({
    host: 'redis',
    port: 6379
});

redisClient.on('error', (err) => {
    console.log('Redis error:', err);
});

const getAsync = promisify(redisClient.get).bind(redisClient);
const setAsync = promisify(redisClient.set).bind(redisClient);
const delAsync = promisify(redisClient.del).bind(redisClient);

module.exports = { redisClient, getAsync, setAsync, delAsync };
