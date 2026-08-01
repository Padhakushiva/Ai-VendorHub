const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const productSchema = new mongoose.Schema({
  title: String,
  status: String
}, { strict: false });

const Product = mongoose.model('Product', productSchema);

async function removeDuplicates() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    const products = await Product.find({ status: { $ne: 'archived' } });
    console.log(`Found ${products.length} active products`);
    
    const seenTitles = new Set();
    const idsToDelete = [];
    
    for (const product of products) {
      if (seenTitles.has(product.title)) {
        idsToDelete.push(product._id);
        console.log(`Duplicate found: ${product.title} (${product._id})`);
      } else {
        seenTitles.add(product.title);
      }
    }
    
    if (idsToDelete.length > 0) {
      console.log(`Deleting ${idsToDelete.length} duplicate products...`);
      const result = await Product.deleteMany({ _id: { $in: idsToDelete } });
      console.log(`Deleted ${result.deletedCount} products`);
    } else {
      console.log('No duplicates found!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

removeDuplicates();
