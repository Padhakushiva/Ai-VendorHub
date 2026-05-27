const request = require('supertest');
const app = require('../../src/app');
const { getAuthCookie } = require('../setup/auth');
const orderModel = require('../../src/models/order.model');

describe('Advanced Order Service features from implementation guide', () => {
    const orderId = '507f1f77bcf86cd799439077';
    const userId = '68bc6369c17579622cbdd9fe';

    const baseOrder = {
        _id: orderId,
        user: userId,
        status: 'PENDING',
        items: [
            {
                product: '507f1f77bcf86cd799439021',
                title: 'Snapshot Product',
                image: 'https://example.com/item.png',
                variant: { color: 'Black', storage: '128GB' },
                quantity: 1,
                unitPrice: { amount: 100, currency: 'INR' },
                finalPrice: { amount: 100, currency: 'INR' },
                price: { amount: 100, currency: 'INR' },
                productSnapshot: {
                    productId: '507f1f77bcf86cd799439021',
                    title: 'Snapshot Product',
                    image: 'https://example.com/item.png',
                    variant: { color: 'Black', storage: '128GB' },
                    quantity: 1,
                    finalPrice: { amount: 100, currency: 'INR' },
                },
            },
        ],
        totalPrice: { amount: 168, currency: 'INR' },
        totals: {
            subtotal: 100,
            discount: 0,
            tax: 18,
            shipping: 50,
            total: 168,
            currency: 'INR',
        },
        paymentSummary: {
            status: 'PENDING',
            subtotal: 100,
            taxes: 18,
            shipping: 50,
            total: 168,
            currency: 'INR',
        },
        shippingAddress: {
            street: '123 Main St',
            city: 'Metropolis',
            state: 'CA',
            zip: '90210',
            country: 'USA',
        },
        inventoryReservation: {
            status: 'RESERVED',
            reservedAt: new Date(),
            reservedUntil: new Date(Date.now() + 30 * 60 * 1000),
        },
        orderExpiry: {
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            status: 'ACTIVE',
        },
        timeline: [
            {
                type: 'created',
                status: 'PENDING',
                message: 'Order created from cart',
                actor: 'user',
            },
        ],
    };

    beforeEach(async () => {
        await orderModel.deleteMany({});
    });

    it('preserves immutable product snapshot on order detail', async () => {
        await orderModel.create(baseOrder);

        const res = await request(app)
            .get(`/api/orders/${orderId}`)
            .set('Cookie', getAuthCookie())
            .expect(200);

        expect(res.body.order.items[0]).toMatchObject({
            title: 'Snapshot Product',
            image: 'https://example.com/item.png',
            finalPrice: { amount: 100, currency: 'INR' },
        });
        expect(res.body.order.items[0].productSnapshot).toMatchObject({
            title: 'Snapshot Product',
            image: 'https://example.com/item.png',
            finalPrice: { amount: 100, currency: 'INR' },
        });
    });

    it('allows valid state-machine transitions and blocks invalid transitions', async () => {
        await orderModel.create(baseOrder);

        const paidRes = await request(app)
            .patch(`/api/orders/${orderId}/status`)
            .set('Cookie', getAuthCookie({ extra: { role: 'admin' } }))
            .send({ status: 'PAID', paymentId: 'pay_test_123', paymentMethod: 'razorpay' })
            .expect(200);

        expect(paidRes.body.order.status).toBe('PAID');
        expect(paidRes.body.order.paymentSummary).toMatchObject({
            status: 'PAID',
            paymentId: 'pay_test_123',
            method: 'razorpay',
        });
        expect(paidRes.body.order.inventoryReservation.status).toBe('CONFIRMED');
        expect(paidRes.body.order.timeline.some((event) => event.type === 'paid')).toBe(true);

        const invalidRes = await request(app)
            .patch(`/api/orders/${orderId}/status`)
            .set('Cookie', getAuthCookie({ extra: { role: 'admin' } }))
            .send({ status: 'DELIVERED' })
            .expect(409);

        expect(invalidRes.body.message).toMatch(/Invalid order status transition/i);
    });

    it('expires unpaid pending orders and releases inventory', async () => {
        await orderModel.create({
            ...baseOrder,
            _id: '507f1f77bcf86cd799439078',
            orderExpiry: {
                expiresAt: new Date(Date.now() - 60 * 1000),
                status: 'ACTIVE',
            },
        });

        const res = await request(app)
            .post('/api/orders/expiry/scan')
            .set('Cookie', getAuthCookie({ extra: { role: 'admin' } }))
            .send({ limit: 10 })
            .expect(200);

        expect(res.body.expired).toBe(1);

        const expired = await orderModel.findById('507f1f77bcf86cd799439078').lean();
        expect(expired.status).toBe('EXPIRED');
        expect(expired.orderExpiry.status).toBe('EXPIRED');
        expect(expired.inventoryReservation.status).toBe('RELEASED');
        expect(expired.timeline.some((event) => event.type === 'expired')).toBe(true);
    });
});
