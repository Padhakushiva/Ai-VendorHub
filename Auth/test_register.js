async function testRegister() {
    try {
        const response = await fetch('http://localhost:3001/api/auth/register/seller', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'tushar123',
                email: 'tushar@example.com',
                password: 'Password123!',
                fullName: { firstName: 'Tushar', lastName: 'Sharma' },
                role: 'seller'
            })
        });
        
        const data = await response.json();
        console.log("Status:", response.status);
        console.log("Response:", data);
    } catch (e) {
        console.error("Error:", e.message);
    }
}

testRegister();
