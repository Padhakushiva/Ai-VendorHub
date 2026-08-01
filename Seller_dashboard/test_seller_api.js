const jwt = require('jsonwebtoken');

const mongoose = require('mongoose');

// Need to match auth service JWT_SECRET
const JWT_SECRET = '0eb47ac37bbf9154f8b9766f20e3e6209b3f53a1047629439daf3b31311af377';

async function testApi() {
    try {
        const token = jwt.sign({
            id: '6a6c25ec92c776836fadce14',
            username: 'jaatshaab526',
            email: 'jaatshaab526@gmail.com',
            role: 'seller'
        }, JWT_SECRET, { expiresIn: '1h' });

        console.log("Token generated:", token);

        const response = await fetch('http://localhost:3000/api/product/seller?limit=50', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        const data = await response.json();
        console.log("Response data:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Error:", e.message);
    }
}

testApi();
