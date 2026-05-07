const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
require("dotenv").config();

async function test() {
    try {
        const model = new ChatGoogleGenerativeAI({
            model: "gemini-1.5-flash",
            temperature: 0.5,
            apiKey: process.env.GOOGLE_API_KEY,
        });
        console.log("Calling gemini-1.5-flash...");
        const res = await model.invoke("Say hello world");
        console.log("Response:", res.content);
    } catch (e) {
        console.error("Error:", e.message);
    }
}
test();
