const io = require("socket.io-client");
const jwt = require("jsonwebtoken");
require("dotenv").config();

async function testSocket() {
  const token = jwt.sign({ userId: "test_user", email: "test@example.com" }, process.env.JWT_SECRET || "default_secret", { expiresIn: "1h" });

  const socket = io("http://localhost:3005", {
    auth: { token },
    transports: ["websocket", "polling"]
  });

  socket.on("connect", () => {
    console.log("Connected to AI socket. Socket ID:", socket.id);
    console.log("Sending query...");
    socket.emit("message", "Recommend best camera for me");
  });

  socket.on("typing", (data) => {
    if (data.isTyping) {
        console.log("AI is typing...");
    }
  });

  socket.on("response", (data) => {
    console.log("AI Response:", data.message);
    socket.disconnect();
    process.exit(0);
  });

  socket.on("error", (err) => {
    console.error("Socket error:", err);
    socket.disconnect();
    process.exit(1);
  });

  socket.on("connect_error", (err) => {
    console.error("Connection error:", err.message);
    process.exit(1);
  });

  setTimeout(() => {
    console.error("Test timed out after 30 seconds.");
    process.exit(1);
  }, 30000);
}

testSocket();
