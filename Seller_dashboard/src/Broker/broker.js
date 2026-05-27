const amqplib = require('amqplib');


let channel,connection; 

async function connect(){
    if(connection) return connection;
    if (!process.env.RABBITMQ_URL) {
        throw new Error("RABBITMQ_URL is not configured");
    }

    try{
        connection = await amqplib.connect(process.env.RABBITMQ_URL);
        console.log("Connected to RabbitMQ");
        channel = await connection.createChannel();
        
    }
    catch(error){
        console.error("Error connecting to RabbitMQ:", error);
        throw error;
    }
}

async function publishToQueue(queueName, data={}){
    if(!channel || ! connection)  await connect();

    await channel.assertQueue(queueName, { 
        durable: true
     });

    channel.sendToQueue(queueName, Buffer.from(JSON.stringify(data)));

    console.log("Message Sent to queue : ",queueName,data);
    
}

async function SubscribeToQueue(queueName, callback){
    if(!channel || ! connection)  await connect();

    await channel.assertQueue(queueName, { 
        durable: true
     });

    channel.consume(queueName, async (msg) => {
        if(msg !== null){
            try {
                const data = JSON.parse(msg.content.toString());
                await callback(data);
                channel.ack(msg);
            } catch (error) {
                console.error(`Error processing queue ${queueName}:`, error);
                channel.nack(msg, false, false);
            }
        }
    });
}

async function SubscribeToExchange(exchangeName, routingPattern, queueName, callback){
    if(!channel || ! connection)  await connect();

    await channel.assertExchange(exchangeName, "topic", {
        durable: true
    });

    const assertedQueue = await channel.assertQueue(queueName, {
        durable: true
    });

    await channel.bindQueue(assertedQueue.queue, exchangeName, routingPattern);

    channel.consume(assertedQueue.queue, async (msg) => {
        if(msg !== null){
            try {
                const data = JSON.parse(msg.content.toString());
                await callback(data);
                channel.ack(msg);
            } catch (error) {
                console.error(`Error processing exchange ${exchangeName}:${routingPattern}:`, error);
                channel.nack(msg, false, false);
            }
        }
    });
}

module.exports = {
    connect,
    publishToQueue,
    SubscribeToQueue,
    SubscribeToExchange,
    channel,
    connection
}
