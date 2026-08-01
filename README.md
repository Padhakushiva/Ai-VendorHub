🛍️ Ai-VendorHub
An Advanced, AI-Powered, Microservices-Based E-Commerce Platform


Ai-VendorHub is a highly scalable, event-driven e-commerce platform designed to seamlessly connect buyers and sellers. It leverages a modern microservices architecture and integrates Google's Gemini AI to automate seller workflows (like writing product descriptions) and enhance the buyer experience.

🚀 Key Features
🤖 AI-Powered Capabilities
Seller AI Assistant: Vendors simply enter a product title, and the AI automatically generates rich product descriptions, bullet points, and SEO-optimized tags.
Smart Buyer Assistant: An AI chatbot that helps buyers review their carts, compare products, and get smart budget recommendations.
🏗️ Microservices Architecture
Instead of a monolithic backend, the platform is divided into 8 independent services that communicate asynchronously via RabbitMQ:

Auth Service: JWT-based authentication, user roles, and secure OTP email verification.
Product Service: Catalog management, inventory tracking, and search.
Cart Service: Shopping cart management.
Order Service: Checkout processing and state management.
Payment Service: Secure transaction processing.
Notification Service: Listens to RabbitMQ events to send asynchronous emails (e.g., OTPs, Order Confirmations).
Seller Dashboard Service: Dedicated vendor management backend.
AI Service: A dedicated wrapper around the Gemini API handling all generative tasks securely.
⚡ Smart User Experience
Frictionless Checkout: Auto-fills city and state details when a user types a 6-digit PIN code (integrated with Zippopotam API).
High Performance: Implements Redis for caching and strict rate-limiting to prevent spam and abuse.
🛠️ Tech Stack
Frontend:

React.js (Vite)
Tailwind CSS
React Router DOM
Backend:

Node.js & Express.js
MongoDB (Mongoose) - Primary Database
RabbitMQ - Message Broker for Event-Driven Communication
Redis - Caching and Rate Limiting
JSON Web Tokens (JWT) - Stateless Authentication
AI & External APIs:

Google Gemini API (gemini-flash-lite model)
Zippopotam API (Address lookup)
DevOps (Deployment Ready):

Docker & Docker Compose
Multi-architecture ARM support
⚙️ Architecture Diagram / Flow
Example Flow (Order Creation):

User checks out on the React Frontend.
Request hits the Order Service.
Order Service saves to MongoDB and publishes an order_created event to RabbitMQ.
The Notification Service consumes the event and sends a confirmation email asynchronously, ensuring the main thread is never blocked.
🚀 Getting Started (Local Development)
Prerequisites
Node.js (v18+)
MongoDB (Local or Atlas)
RabbitMQ (Running via Docker or natively)
Redis
Installation
Clone the repository:

bash

git clone https://github.com/yourusername/Ai-VendorHub.git
cd Ai-VendorHub
Environment Variables:

Create a .env file in each microservice directory based on the provided .env.example files.
You will need a Google Gemini API key, a MongoDB URI, and RabbitMQ/Redis URLs.
Install Dependencies & Start Services: Because this is a microservices architecture, you can start all services using the provided bash script or Docker.

Using the start script:

bash

bash start_all.sh
This will boot up all 8 backend services on ports 3000 to 3007.

Start the Frontend:

bash

cd product/frontend
npm install
npm run dev
🛡️ Security Highlights
Strict Rate Limiting via Redis (e.g., limiting login attempts and OTP generation).
Timeout handling for LLM (AI) requests to prevent hanging connections.
Separation of concerns: Sellers and Buyers have completely isolated dashboard interfaces and permission checks.
👨‍💻 Author
Shiva Choudhry
Full-Stack Developer, Data Analyst
https://www.linkedin.com/in/shivachoudhry/

"Built to solve real-world e-commerce scalability challenges using modern event-driven design."
