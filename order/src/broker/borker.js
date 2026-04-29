const amqplib = require('amqplib');

let channel, connection;

async function connect() {
    if (connection && channel) return { connection, channel };

    try {
        connection = await amqplib.connect(process.env.RABBIT_URL || 'amqp://localhost');
        console.log('✓ Connected to RabbitMQ');
        channel = await connection.createChannel();
        console.log('✓ RabbitMQ channel created');
        return { connection, channel };
    }
    catch (error) {
        console.error('✗ Error connecting to RabbitMQ:', error.message);
        console.warn('⚠ Continuing without RabbitMQ - events will not be published');
        return { connection: null, channel: null };
    }
}

async function publishToQueue(queueName, data = {}) {
    try {
        // Ensure connection is established
        if (!channel || !connection) {
            const result = await connect();
            channel = result.channel;
            connection = result.connection;
        }

        // If channel is still null, skip publishing but don't crash
        if (!channel) {
            console.warn(`⚠ Skipping queue message (no RabbitMQ connection): ${queueName}`);
            return;
        }

        await channel.assertQueue(queueName, { durable: true });
        channel.sendToQueue(queueName, Buffer.from(JSON.stringify(data)));
        console.log('✓ Message sent to queue:', queueName);
    } catch (error) {
        console.error(`✗ Error publishing to queue ${queueName}:`, error.message);
        // Don't throw - let the order creation succeed even if messaging fails
    }
}

async function subscribeToQueue(queueName, callback) {
    try {
        if (!channel || !connection) {
            const result = await connect();
            channel = result.channel;
            connection = result.connection;
        }

        if (!channel) {
            console.warn(`⚠ Cannot subscribe to queue (no RabbitMQ connection): ${queueName}`);
            return;
        }

        await channel.assertQueue(queueName, { durable: true });

        channel.consume(queueName, async (msg) => {
            if (msg !== null) {
                const data = JSON.parse(msg.content.toString());
                await callback(data);
                channel.ack(msg);
            }
        })

        console.log(`✓ Subscribed to queue: ${queueName}`);
    } catch (error) {
        console.error(`✗ Error subscribing to queue ${queueName}:`, error.message);
    }
}

module.exports = {
    connect,
    channel: () => channel,
    connection: () => connection,
    publishToQueue,
    subscribeToQueue
}
