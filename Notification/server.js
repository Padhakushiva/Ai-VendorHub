require('dotenv').config();
const app=require('./SRC/app');
const connectDB = require('./SRC/DB/db');

connectDB().catch((error) => {
    console.warn('Notification DB connection failed:', error.message);
});

app.listen(process.env.PORT || 3006,()=>{
    console.log("Notification service is running on port 3006");
});
