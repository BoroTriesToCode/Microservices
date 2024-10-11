const { Kafka } = require('kafkajs');
const Product = require('./models/Product');
const redisClient = require('./redisClient');

const kafka = new Kafka({
    clientId: 'product-service',
    brokers: ['kafka:9092']
});

const consumer = kafka.consumer({ groupId: 'product-group' });
const producer = kafka.producer();

const updateAllProductsCache = async () => {
    try {
        const allProducts = await Product.find();
        await redisClient.set('all-products', JSON.stringify(allProducts));
        console.log('All-products cache updated.');
    } catch (error) {
        console.error('Error updating all-products cache:', error);
    }
};

const consumeProducts = async () => {
    try {
        await consumer.connect();
        await producer.connect();
        console.log('Connected to Kafka as product-service.');

        await consumer.subscribe({ topic: 'product-update-topic', fromBeginning: false });
        await consumer.subscribe({ topic: 'get-product-detail', fromBeginning: false });

        console.log('Subscribed to topics: product-update-topic, get-product-detail');

        await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                const data = JSON.parse(message.value.toString());
                console.log(`Message received on topic ${topic}:`, data);

                if (topic === 'product-update-topic') {
                    try {
                        const product = await Product.findById(data.productId);
                        if (product) {
                            product.quantity -= data.quantity;
                            await product.save();
                            await redisClient.set(`product:${product._id}`, JSON.stringify(product));
                            console.log('Product stock updated in MongoDB and Redis:', product);
                            await updateAllProductsCache();
                        } else {
                            console.log('Product not found for update:', data.productId);
                        }
                    } catch (error) {
                        console.error('Error updating product stock:', error);
                    }
                } else if (topic === 'get-product-detail') {
                    const { correlationId, productId } = data;
                    try {
                        console.log(`Fetching details for product ID: ${productId}`);
                        const product = await Product.findById(productId);
                        const responseTopic = 'product-responses';
                        const response = { correlationId, data: product || null };
                        await producer.send({
                            topic: responseTopic,
                            messages: [{ value: JSON.stringify(response) }],
                        });
                        console.log('Product detail response sent:', response);
                    } catch (error) {
                        console.error('Error fetching product details:', error);
                    }
                }
            },
        });

        console.log('Kafka consumer running.');

    } catch (error) {
        console.error('Error in Kafka consumer setup:', error);
    }
};

module.exports = { consumeProducts };
