const { Kafka } = require('kafkajs');
const Customer = require('./models/Customer');
const redisClient = require('./redisClient');
const { respondToCustomerDetailRequest } = require('./kafkaProducer');

const kafka = new Kafka({
    clientId: 'customer-service',
    brokers: ['kafka:9092']
});

const consumer = kafka.consumer({ groupId: 'customer-group' });

const consumeCustomers = async () => {
    await consumer.connect();
    await consumer.subscribe({ topic: 'customer-topic', fromBeginning: false });
    await consumer.subscribe({ topic: 'get-customer-detail', fromBeginning: false });

    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            const data = JSON.parse(message.value.toString());

            if (topic === 'customer-topic') {
                try {
                    const newCustomer = new Customer(data);
                    await newCustomer.save();
                    await redisClient.set(`customer:${newCustomer._id}`, JSON.stringify(newCustomer));
                    console.log('Customer saved to MongoDB and Redis:', newCustomer);
                } catch (error) {
                    console.error('Error processing customer:', error);
                }
            } else if (topic === 'get-customer-detail') {
                const { correlationId, customerId } = data;
                try {
                    const customer = await Customer.findById(customerId);
                    await respondToCustomerDetailRequest(correlationId, customer || null);
                    console.log('Customer detail response sent:', { correlationId, customer });
                } catch (error) {
                    console.error('Error fetching customer details:', error);
                }
            }
        },
    });
};

module.exports = { consumeCustomers };
