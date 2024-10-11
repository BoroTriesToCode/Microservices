const { Kafka } = require('kafkajs');

const kafka = new Kafka({
    clientId: 'product-service',
    brokers: ['kafka:9092']
});

const producer = kafka.producer();

const produceProduct = async (product) => {
    await producer.connect();
    await producer.send({
        topic: 'product-topic',
        messages: [{ value: JSON.stringify(product) }],
    });
    await producer.disconnect();
};

const produceProductDetailRequest = async (correlationId, productId) => {
    await producer.connect();
    await producer.send({
        topic: 'get-product-detail',
        messages: [{ value: JSON.stringify({ correlationId, productId }) }],
    });
    await producer.disconnect();
};

module.exports = { produceProduct, produceProductDetailRequest };
