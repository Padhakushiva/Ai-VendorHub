module.exports = {
  apps: [
    { name: "order-service", script: "npm", args: "run dev", cwd: "./order" },
    { name: "auth-service", script: "npm", args: "run dev", cwd: "./Auth" },
    { name: "auth-frontend", script: "npm", args: "run dev", cwd: "./Auth/frontend" },
    { name: "notification-service", script: "npm", args: "run dev", cwd: "./Notification" },
    { name: "payment-service", script: "npm", args: "run dev", cwd: "./Payment" },
    { name: "product-service", script: "npm", args: "run dev", cwd: "./product" },
    { name: "product-frontend", script: "npm", args: "run dev", cwd: "./product/frontend" },
    { name: "ai-service", script: "npm", args: "run dev", cwd: "./AI" },
    { name: "cart-service", script: "npm", args: "run dev", cwd: "./cart" },
    { name: "seller-dashboard", script: "npm", args: "run dev", cwd: "./Seller_dashboard" }
  ]
};
