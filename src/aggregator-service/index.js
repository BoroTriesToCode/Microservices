const express = require('express');
const { Kafka } = require('kafkajs');
const { promisify } = require('util');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = 3004;

// Kafka connection
const kafka = new Kafka({
    clientId: 'aggregator-service',
    brokers: ['kafka:9092']
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'aggregator-group' });

const run = async () => {
    await producer.connect();
    await consumer.connect();
    await consumer.subscribe({ topic: 'order-responses', fromBeginning: true });
    await consumer.subscribe({ topic: 'customer-responses', fromBeginning: true });
    await consumer.subscribe({ topic: 'product-responses', fromBeginning: true });

    consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            const response = JSON.parse(message.value.toString());
            handleResponse(response);
        },
    });

    app.listen(port, () => {
        console.log(`Aggregator Service listening at http://localhost:${port}`);
    });
};

const responseHandlers = {};

const handleResponse = (response) => {
    const { correlationId, data } = response;
    if (responseHandlers[correlationId]) {
        responseHandlers[correlationId](data);
        delete responseHandlers[correlationId];
    }
};

const publishAndWaitForResponse = async (requestTopic, responseTopic, message) => {
    const correlationId = uuidv4();
    const timeoutDuration = 30000; // 30 seconds

    const result = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            delete responseHandlers[correlationId];
            reject(new Error('Request timed out'));
        }, timeoutDuration);

        responseHandlers[correlationId] = (data) => {
            clearTimeout(timeout);
            resolve(data);
        };
    });

    await producer.send({
        topic: requestTopic,
        messages: [{ value: JSON.stringify({ correlationId, ...message }) }],
    });

    return result;
};

// Function to aggregate data
const aggregateOrderData = async (orderId) => {
    console.log(`Starting data aggregation for orderId: ${orderId}`);

    try {
        const order = await publishAndWaitForResponse('get-order-detail', 'order-responses', { orderId });
        if (!order) {
            throw new Error(`Order not found for orderId: ${orderId}`);
        }
        console.log(`Order found: ${JSON.stringify(order)}`);

        const customer = await publishAndWaitForResponse('get-customer-detail', 'customer-responses', { customerId: order.customerId });
        if (!customer) {
            throw new Error(`Customer not found for customerId: ${order.customerId}`);
        }
        console.log(`Customer found: ${JSON.stringify(customer)}`);

        const product = await publishAndWaitForResponse('get-product-detail', 'product-responses', { productId: order.productId });
        if (!product) {
            throw new Error(`Product not found for productId: ${order.productId}`);
        }
        console.log(`Product found: ${JSON.stringify(product)}`);

        const orderTotalCost = product.price * order.quantity;

        return {
            orderId: order._id,
            customerName: customer.name,
            customerEmail: customer.email,
            customerPhone: customer.phone,
            productName: product.name,
            productDescription: product.description,
            productPrice: product.price,
            productQuantity: order.quantity,
            orderTotalCost: orderTotalCost,
            orderStatus: order.status
        };
    } catch (error) {
        console.error('Error aggregating order data:', error);
        throw error;
    }
};

// API endpoint to get aggregated order data
app.get('/aggregated-orders/:id', async (req, res) => {
    const { id } = req.params;
    console.log(`Fetching aggregated order data for order ID: ${id}`);

    try {
        const aggregatedOrder = await aggregateOrderData(id);
        res.send(aggregatedOrder);
    } catch (error) {
        res.status(500).send('Internal Server Error');
    }
});

run().catch(console.error);
