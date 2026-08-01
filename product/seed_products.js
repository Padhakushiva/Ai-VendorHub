require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./src/models/product.model');

// Define a minimal User model schema to fetch/create a user
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  role: String,
}, { strict: false });
const User = mongoose.models.User || mongoose.model('User', userSchema);

const productsData = [
  {
    title: 'Wireless Noise-Canceling Headphones',
    description: 'Experience premium sound quality with active noise cancellation, 30-hour battery life, and comfortable over-ear fit. Perfect for travel and focus work.',
    price: { amount: 14999, currency: 'INR' },
    category: 'electronics',
    tags: ['audio', 'headphones', 'wireless', 'bluetooth', 'noise-canceling'],
    brand: 'AudioTech',
    images: [{ id: 'img1', url: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=800&q=80' }],
    stock: 45,
    status: 'active'
  },
  {
    title: 'Ultra-Thin Laptop Pro 14"',
    description: 'High-performance ultrabook featuring the latest M-series chip, 16GB unified memory, and 512GB SSD. Weighs only 1.2kg.',
    price: { amount: 95000, currency: 'INR' },
    category: 'computer',
    tags: ['laptop', 'computer', 'workstation', 'ultrabook', 'ssd'],
    brand: 'TechPro',
    images: [{ id: 'img2', url: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=800&q=80' }],
    stock: 12,
    status: 'active'
  },
  {
    title: 'Smart Fitness Watch Series 5',
    description: 'Track your health metrics, heart rate, and sleep patterns. Features a bright OLED display and 7-day battery life. Water resistant up to 50m.',
    price: { amount: 8999, currency: 'INR' },
    category: 'wearable',
    tags: ['watch', 'smartwatch', 'fitness', 'health', 'band'],
    brand: 'FitGear',
    images: [{ id: 'img3', url: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&w=800&q=80' }],
    stock: 85,
    status: 'active'
  },
  {
    title: '4K Action Camera 60fps',
    description: 'Capture your adventures in stunning 4K resolution. Includes waterproof housing, various mounts, and dual screens for perfect framing.',
    price: { amount: 12500, currency: 'INR' },
    category: 'camera',
    tags: ['camera', 'action', 'video', '4k', 'photography'],
    brand: 'ActionCam',
    images: [{ id: 'img4', url: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80' }],
    stock: 30,
    status: 'active'
  },
  {
    title: 'Ergonomic Mesh Office Chair',
    description: 'Designed for long working hours with lumbar support, adjustable headrest, and breathable mesh material. 360-degree swivel.',
    price: { amount: 6500, currency: 'INR' },
    category: 'home',
    tags: ['furniture', 'chair', 'office', 'ergonomic', 'home'],
    brand: 'ComfortSeating',
    images: [{ id: 'img5', url: 'https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?auto=format&fit=crop&w=800&q=80' }],
    stock: 25,
    status: 'active'
  },
  {
    title: 'Smart Home Hub Controller',
    description: 'Control all your smart devices from one centralized touchscreen interface. Compatible with voice assistants and standard protocols.',
    price: { amount: 4999, currency: 'INR' },
    category: 'home',
    tags: ['smart home', 'automation', 'hub', 'appliance', 'tech'],
    brand: 'SmartLife',
    images: [{ id: 'img6', url: 'https://images.unsplash.com/photo-1558089687-f282ffcbc126?auto=format&fit=crop&w=800&q=80' }],
    stock: 18,
    status: 'active'
  },
  {
    title: 'Mechanical Gaming Keyboard',
    description: 'Tactile blue switches, customizable RGB backlighting, and anti-ghosting technology. Built with a durable aluminum frame.',
    price: { amount: 3500, currency: 'INR' },
    category: 'computer',
    tags: ['keyboard', 'gaming', 'mechanical', 'rgb', 'accessories'],
    brand: 'KeyPro',
    images: [{ id: 'img7', url: 'https://images.unsplash.com/photo-1595225476474-87563907a212?auto=format&fit=crop&w=800&q=80' }],
    stock: 50,
    status: 'active'
  },
  {
    title: 'Portable SSD 1TB',
    description: 'Lightning-fast data transfer speeds up to 1050MB/s. Compact, rugged design that can withstand drops up to 2 meters.',
    price: { amount: 8999, currency: 'INR' },
    category: 'electronics',
    tags: ['storage', 'ssd', 'portable', 'hard drive', 'usb-c'],
    brand: 'DataDrive',
    images: [{ id: 'img8', url: 'https://images.unsplash.com/photo-1628126235206-5260b9ea6441?auto=format&fit=crop&w=800&q=80' }],
    stock: 100,
    status: 'active'
  },
  {
    title: 'Bluetooth Portable Speaker',
    description: 'Powerful 360-degree sound with deep bass. IP67 waterproof rating and up to 15 hours of playtime on a single charge.',
    price: { amount: 4500, currency: 'INR' },
    category: 'audio',
    tags: ['speaker', 'audio', 'bluetooth', 'wireless', 'music'],
    brand: 'SoundBoom',
    images: [{ id: 'img9', url: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=800&q=80' }],
    stock: 60,
    status: 'active'
  },
  {
    title: 'Professional Drone with 4K Camera',
    description: 'Fly up to 30 minutes with intelligent flight modes, obstacle avoidance, and a 3-axis gimbal for ultra-smooth video recording.',
    price: { amount: 45000, currency: 'INR' },
    category: 'camera',
    tags: ['drone', 'camera', 'aerial', 'video', 'gadget'],
    brand: 'AeroCapture',
    images: [{ id: 'img10', url: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=800&q=80' }],
    stock: 8,
    status: 'active'
  }
];

async function seedProducts() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected.');

    let user = await User.findOne({ role: 'seller' });
    if (!user) {
      console.log('No seller found, creating a dummy seller...');
      user = new User({
        username: 'DummySeller',
        email: 'seller@example.com',
        role: 'seller'
      });
      await user.save();
    }

    console.log(`Using seller ID: ${user._id}`);
    
    for (let data of productsData) {
      data.seller = user._id;
      const newProduct = new Product(data);
      await newProduct.save();
      console.log(`Added product: ${data.title}`);
    }

    console.log('Successfully seeded 10 products.');
  } catch (err) {
    console.error('Error seeding products:', err);
  } finally {
    mongoose.connection.close();
  }
}

seedProducts();
