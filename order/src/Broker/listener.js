const { SubscribeToQueue } = require('./broker');
const orderModel = require('../models/order.model');

async function setupListeners() {
    await SubscribeToQueue('PAYMENT_ORDERS.PAYMENT_SUCCESS', async (data) => {
        try {
            console.log('Received PAYMENT_SUCCESS event for order:', data.orderId);
            
            if (!data.orderId) {
                console.warn('PAYMENT_SUCCESS event missing orderId');
                return;
            }

            const update = {
                status: 'PAID',
                'paymentSummary.status': 'PAID',
                'paymentSummary.method': data.method || 'razorpay',
                'paymentSummary.paymentId': data.paymentId || data.gatewayPaymentId,
            };

            const updatedOrder = await orderModel.findByIdAndUpdate(data.orderId, update, { new: true });
            if (updatedOrder) {
                console.log(`Order ${data.orderId} marked as PAID`);
            } else {
                console.warn(`Order ${data.orderId} not found to mark as PAID`);
            }
        } catch (error) {
            console.error('Error processing PAYMENT_SUCCESS event:', error);
        }
    });

    await SubscribeToQueue('PAYMENT_ORDERS.PAYMENT_FAILED', async (data) => {
        try {
            console.log('Received PAYMENT_FAILED event for order:', data.orderId);
            
            if (!data.orderId) {
                console.warn('PAYMENT_FAILED event missing orderId');
                return;
            }

            const update = {
                'paymentSummary.status': 'FAILED',
            };

            const updatedOrder = await orderModel.findByIdAndUpdate(data.orderId, update, { new: true });
            if (updatedOrder) {
                console.log(`Order ${data.orderId} payment status marked as FAILED`);
            } else {
                console.warn(`Order ${data.orderId} not found to mark as FAILED`);
            }
        } catch (error) {
            console.error('Error processing PAYMENT_FAILED event:', error);
        }
    });
}

module.exports = { setupListeners };
