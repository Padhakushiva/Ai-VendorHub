const amqplib = require('amqplib');

let channel, connection;
let connectingPromise = null;

function resetBrokerState() {
    channel = null;
    connection = null;
    connectingPromise = null;
}

function attachBrokerErrorHandlers(nextConnection, nextChannel) {
    nextConnection.on('error', (error) => {
        console.warn('RabbitMQ connection error:', error.message);
        resetBrokerState();
    });

    nextConnection.on('close', () => {
        console.warn('RabbitMQ connection closed. Auth service will continue without broker until reconnect.');
        resetBrokerState();
    });

    nextChannel.on('error', (error) => {
        console.warn('RabbitMQ channel error:', error.message);
        channel = null;
    });

    nextChannel.on('close', () => {
        console.warn('RabbitMQ channel closed. It will reconnect on next publish.');
        channel = null;
    });
}

async function connect(){
    if(connection && channel) return connection;
    if(connectingPromise) return connectingPromise;

    connectingPromise = (async () => {
    try {
        const nextConnection = await amqplib.connect(process.env.RABBITMQ_URL, {
            heartbeat: Number(process.env.RABBITMQ_HEARTBEAT_SECONDS) || 60
        });
        console.log("Connected to RabbitMQP");
        const nextChannel = await nextConnection.createChannel();
        attachBrokerErrorHandlers(nextConnection, nextChannel);
        connection = nextConnection;
        channel = nextChannel;
        return connection;
    }
    catch (error) {
        console.warn("RabbitMQ unavailable. Auth service will continue without broker:", error.message);
        resetBrokerState();
        return null;
    }
    })();

    return connectingPromise;
}

async function publishToQueue(queueName, data={}){
    try {
        if(!channel || ! connection)  await connect();

        if(!channel) {
            console.warn(`Skipped RabbitMQ publish. Broker unavailable for queue: ${queueName}`);
            return false;
        }

        await channel.assertQueue(queueName, { 
            durable: true
        });

        channel.sendToQueue(queueName, Buffer.from(JSON.stringify(data)));

        console.log("Message Sent to queue : ",queueName,data);
        return true;
    } catch (error) {
        console.warn(`RabbitMQ publish failed for ${queueName}:`, error.message);
        resetBrokerState();
        return false;
    }
    
}

async function SubscribeToQueue(queueName, callback){
    if(!channel || ! connection)  await connect();

    if(!channel) {
        console.warn(`Skipped RabbitMQ subscribe. Broker unavailable for queue: ${queueName}`);
        return false;
    }

    await channel.assertQueue(queueName, { 
        durable: true
     });

    channel.consume(queueName, async (msg) => {
        if(msg !== null){
            const data = JSON.parse(msg.content.toString());
            callback(data);
            channel.ack(msg);
        }
    });

    return true;
}

module.exports = {
    connect,
    publishToQueue,
    SubscribeToQueue,
    channel,
    connection
}
