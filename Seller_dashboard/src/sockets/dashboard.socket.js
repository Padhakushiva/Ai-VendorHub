const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const cookie = require("cookie");

let io = null;

function getToken(socket) {
    const cookieHeader = socket.handshake.headers.cookie || "";
    if (cookieHeader) {
        const cookies = cookie.parse(cookieHeader);
        if (cookies.token) return cookies.token;
    }

    const authHeader = socket.handshake.headers.authorization || "";
    if (authHeader.startsWith("Bearer ")) return authHeader.split(" ")[1];
    if (socket.handshake.auth?.token) return socket.handshake.auth.token;
    if (socket.handshake.query?.token) return socket.handshake.query.token;
    return null;
}

function getSellerId(user) {
    return user?._id || user?.id || user?.userId || user?.accountId;
}

function initDashboardSocket(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : true,
            credentials: true,
        },
    });

    io.use((socket, next) => {
        const token = getToken(socket);
        if (!token) return next(new Error("Authentication token missing"));

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (decoded.role !== "seller") return next(new Error("Only seller sockets are allowed"));
            socket.user = decoded;
            socket.sellerId = getSellerId(decoded);
            return next();
        } catch (error) {
            return next(new Error("Invalid or expired token"));
        }
    });

    io.on("connection", (socket) => {
        const room = `seller:${socket.sellerId}`;
        socket.join(room);
        socket.emit("dashboard.connected", {
            success: true,
            room,
            message: "Seller dashboard real-time feed connected",
            timestamp: new Date().toISOString(),
        });
    });

    return io;
}

function broadcastSellerEvent(sellerId, event) {
    if (!io || !sellerId) return false;
    io.to(`seller:${sellerId.toString()}`).emit("dashboard.event", event);
    return true;
}

module.exports = {
    initDashboardSocket,
    broadcastSellerEvent,
};
