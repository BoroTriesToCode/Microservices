const express = require('express');
const Order = require('../models/Order');
const { getAsync, setAsync } = require('../redisClient');
const { produceOrder, produceProductUpdate } = require('../kafkaProducer');
const router = express.Router();

const updateAllOrdersCache = async () => {
    try {
        const allOrders = await Order.find({});
        await setAsync('all-orders', JSON.stringify(allOrders));
        console.log('All-orders cache updated.');
    } catch (error) {
        console.error('Error updating all-orders cache:', error);
    }
};

router.get('/', async (req, res) => {
    try {
        const cacheKey = 'all-orders';
        const cachedOrders = await getAsync(cacheKey);
        if (cachedOrders) {
            return res.send(JSON.parse(cachedOrders));
        }
        const orders = await Order.find({});
        await setAsync(cacheKey, JSON.stringify(orders));
        res.send(orders);
    } catch (error) {
        console.error('Error retrieving orders:', error);
        res.status(500).send('Internal Server Error');
    }
});

router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const cachedOrder = await getAsync(`order:${id}`);
        if (cachedOrder) {
            return res.send(JSON.parse(cachedOrder));
        }
        const order = await Order.findById(id);
        if (order) {
            await setAsync(`order:${id}`, JSON.stringify(order));
            return res.send(order);
        }
        res.status(404).send('Order not found');
    } catch (error) {
        console.error('Error retrieving order:', error);
        res.status(500).send('Internal Server Error');
    }
});

router.post('/', async (req, res) => {
    const order = new Order(req.body);
    try {
        await order.save();
        await setAsync(`order:${order._id}`, JSON.stringify(order));
        await produceOrder(order);

        const productUpdate = {
            productId: order.productId,
            quantity: order.quantity
        };
        await produceProductUpdate(productUpdate);

        await updateAllOrdersCache();

        res.status(201).send(order);
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;
