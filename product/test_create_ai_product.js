const jwt = require('jsonwebtoken');
const axios = require('axios');

const JWT_SECRET = '0eb47ac37bbf9154f8b9766f20e3e6209b3f53a1047629439daf3b31311af377';
const SELLER_ID = '6a6af9c685f1688fa09eb762'; 

const token = jwt.sign(
  { id: SELLER_ID, role: 'seller', email: 'seller@example.com' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const AI_URL = 'http://localhost:3005/ai';
const PRODUCT_URL = 'http://localhost:3000/api/product';

async function createAIDemoProduct() {
  try {
    const title = "Smart Coffee Mug with Temperature Control";
    console.log(`[1] Asking AI to generate description for: "${title}"...`);
    
    // 1. Generate Description
    const descResponse = await axios.post(`${AI_URL}/generate-description`, {
      title,
      category: "Home & Kitchen",
      price: "INR 2500",
      basicDescription: "A smart mug that keeps your coffee hot all day."
    });
    
    if (!descResponse.data.success) {
      throw new Error(`AI Description failed: ${descResponse.data.message}`);
    }
    
    const { fullDescription, tags: aiTags, seoKeywords } = descResponse.data.generatedContent;
    console.log(`    ✅ Description generated (${fullDescription.substring(0, 50)}...)`);

    // 2. Suggest Category & Tags
    console.log(`[2] Asking AI to suggest category and tags...`);
    const catResponse = await axios.post(`${AI_URL}/suggest-category-tags`, {
      title,
      description: fullDescription
    });

    if (!catResponse.data.success) {
      throw new Error(`AI Category failed: ${catResponse.data.message}`);
    }

    const { category, subcategory, tags: catTags } = catResponse.data.suggestions;
    console.log(`    ✅ Category suggested: ${category} > ${subcategory}`);
    
    // Combine tags
    const combinedTags = [...new Set([...aiTags, ...catTags, ...seoKeywords])];

    // 3. Create Product
    console.log(`[3] Creating product in database...`);
    
    const productPayload = {
      title,
      description: fullDescription,
      stock: 100,
      amount: 2500,
      currency: "INR",
      category: category.toLowerCase(),
      brand: "VendorHub Smart",
      tags: JSON.stringify(combinedTags),
    };
    
    // The product create endpoint expects FormData because of upload.array('images').
    // We can simulate FormData using axios or just hit a different endpoint if needed.
    // Actually, we can use FormData in Node.
    const FormData = require('form-data');
    const form = new FormData();
    for (const [key, value] of Object.entries(productPayload)) {
      form.append(key, value);
    }
    
    const createRes = await axios.post(`${PRODUCT_URL}/`, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${token}`
      }
    });

    console.log(`    ✅ Product created successfully! ID: ${createRes.data.data._id}`);
    console.log(`\n🎉 Test Complete! The product has been listed.`);
    
  } catch (err) {
    console.error("Test failed:", err?.response?.data || err.message);
  }
}

createAIDemoProduct();
