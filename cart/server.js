require('dotenv').config();
const app=require('./src/app');
const connectDB=require('./src/DB/db');

connectDB();


const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
    console.log(`Cart Server is running on port ${PORT}`);
});