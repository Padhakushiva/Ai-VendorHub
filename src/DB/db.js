const mongoose=require('mongoose');

async function connectDB(){
    try{
        await mongoose.connect(process.env.MONGO_URI, {
            connectTimeoutMS: 10000,
            serverSelectionTimeoutMS: 10000,
            retryWrites: true,
            w: 'majority'
        });
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error.message);
        process.exit(1);
    }
}
module.exports=connectDB;