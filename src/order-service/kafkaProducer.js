const { Kafka } = require('kafkajs');

const kafka = new Kafka({
    clientId: 'order-service',
    brokers: ['kafka:9092']
});

const producer = kafka.producer();

const produceOrder = async (order) => {
    await producer.connect();
    await producer.send({
        topic: 'order-topic',
        messages: [{ value: JSON.stringify(order) }],
    });
};

const produceProductUpdate = async (update) => {
    await producer.connect();
    await producer.send({
        topic: 'product-update-topic',
        messages: [{ value: JSON.stringify(update) }],
    });
};

const produceGetOrderDetail = async (correlationId, orderId) => {
    await producer.connect();
    await producer.send({
        topic: 'get-order-detail',
        messages: [{ value: JSON.stringify({ correlationId, orderId }) }],
    });
};

module.exports = { produceOrder, produceProductUpdate, produceGetOrderDetail };
