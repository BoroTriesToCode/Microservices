const { Kafka } = require('kafkajs');
const Order = require('./models/Order');
const redisClient = require('./redisClient');
const { produceProductUpdate } = require('./kafkaProducer');

const kafka = new Kafka({
    clientId: 'order-service',
    brokers: ['kafka:9092']
});

const consumer = kafka.consumer({ groupId: 'order-group' });
const producer = kafka.producer();

const consumeOrders = async () => {
    await consumer.connect();
    await consumer.subscribe({ topic: 'order-topic', fromBeginning: false });
    await consumer.subscribe({ topic: 'get-order-detail', fromBeginning: false });

    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            const data = JSON.parse(message.value.toString());

            if (topic === 'order-topic') {
                try {
                    const newOrder = new Order(data);
                    await newOrder.save();
                    await redisClient.set(`order:${newOrder._id}`, JSON.stringify(newOrder));
                    console.log('Order saved to MongoDB and Redis:', newOrder);

                    const productUpdate = {
                        productId: newOrder.productId,
                        quantity: newOrder.quantity
                    };
                    await produceProductUpdate(productUpdate);
                    console.log('Product update produced:', productUpdate);
                } catch (error) {
                    console.error('Error processing order:', error);
                }
            } else if (topic === 'get-order-detail') {
                const { correlationId, orderId } = data;
                try {
                    const order = await Order.findById(orderId);
                    const responseTopic = 'order-responses';
                    const response = { correlationId, data: order || null };
                    await producer.send({
                        topic: responseTopic,
                        messages: [{ value: JSON.stringify(response) }],
                    });
                    console.log('Order detail response sent:', response);
                } catch (error) {
                    console.error('Error fetching order details:', error);
                }
            }
        },
    });
};

const connectProducer = async () => {
    await producer.connect();
    console.log('Producer connected');
};

connectProducer().catch(console.error);

module.exports = { consumeOrders };
