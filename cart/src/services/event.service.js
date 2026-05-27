let amqp = null;

try {
  amqp = require('amqplib');
} catch (error) {
  amqp = null;
}

let channelPromise = null;

const RABBITMQ_URL = process.env.RABBITMQ_URL || process.env.AMQP_URL;
const EXCHANGE_NAME = process.env.CART_EVENT_EXCHANGE || 'cart.events';

const getChannel = async () => {
  if (!amqp || !RABBITMQ_URL) return null;

  if (!channelPromise) {
    channelPromise = amqp.connect(RABBITMQ_URL)
      .then(async (connection) => {
        const channel = await connection.createChannel();
        await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
        return channel;
      })
      .catch((error) => {
        console.warn('Cart event publisher disabled:', error.message);
        channelPromise = null;
        return null;
      });
  }

  return channelPromise;
};

const publishCartEvent = async (eventName, payload = {}) => {
  const eventPayload = {
    event: eventName,
    service: 'cart',
    occurredAt: new Date().toISOString(),
    ...payload,
  };

  const channel = await getChannel();
  if (!channel) return false;

  channel.publish(
    EXCHANGE_NAME,
    eventName,
    Buffer.from(JSON.stringify(eventPayload)),
    {
      contentType: 'application/json',
      persistent: true,
    },
  );

  return true;
};

module.exports = {
  publishCartEvent,
};
