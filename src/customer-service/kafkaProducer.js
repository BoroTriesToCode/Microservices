const { Kafka } = require('kafkajs');

const kafka = new Kafka({
    clientId: 'customer-service',
    brokers: ['kafka:9092']
});

const producer = kafka.producer();

const produceCustomer = async (customer) => {
    await producer.connect();
    await producer.send({
        topic: 'customer-topic',
        messages: [{ value: JSON.stringify(customer) }],
    });
    await producer.disconnect();
};

const respondToCustomerDetailRequest = async (correlationId, customerData) => {
    await producer.connect();
    await producer.send({
        topic: 'customer-responses',
        messages: [{
            value: JSON.stringify({
                correlationId,
                data: customerData
            })
        }],
    });
    await producer.disconnect();
};

module.exports = { produceCustomer, respondToCustomerDetailRequest };
