const { tool } = require("@langchain/core/tools")
const { z } = require("zod")
const axios = require("axios")

/**
 * ============================================================
 * ECOMMERCE AI TOOLS
 * ============================================================
 */

// ✅ AI SMART SEARCH - Search products with budget filters
const searchProducts = tool(async ({ query, maxPrice, minPrice, token }) => {
    console.log("🔍 searchProducts called:", { query, maxPrice, minPrice })

    if (!token) {
        throw new Error("No authentication token provided")
    }

    try {
        // Build query parameters
        const baseUrl = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3000'
        let url = `${baseUrl}/api/product?q=${encodeURIComponent(query)}`
        
        if (minPrice) url += `&minPrice=${minPrice}`
        if (maxPrice) url += `&maxPrice=${maxPrice}`
        
        url += `&limit=10` // Limit results for AI to analyze

        console.log(`🌐 Calling Product Service: ${url}`)

        let response = await axios.get(url, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 5000
        })

        let products = response.data.data || response.data.products || []
        
        // SMART FALLBACK: If strict text search fails, fetch broadly and let the LLM filter semantically
        if (products.length === 0) {
            console.log(`⚠️ searchProducts found 0 results for "${query}". Falling back to broad search...`)
            let broadUrl = `${baseUrl}/api/product?limit=20`
            if (minPrice) broadUrl += `&minPrice=${minPrice}`
            if (maxPrice) broadUrl += `&maxPrice=${maxPrice}`
            
            const broadResponse = await axios.get(broadUrl, {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 5000
            })
            products = broadResponse.data.data || broadResponse.data.products || []
        }

        console.log(`✅ Found ${products.length} products`)

        // Format for AI - include title, price, stock
        const formattedProducts = products.map((p, idx) => ({
            index: idx + 1,
            title: p.title,
            price: p.price?.amount || 0,
            currency: p.price?.currency || 'INR',
            stock: p.stock,
            description: p.description?.substring(0, 100) || 'N/A'
        }))

        return JSON.stringify({
            totalFound: products.length,
            products: formattedProducts,
            query: query,
            priceRange: { min: minPrice, max: maxPrice }
        })
    } catch (error) {
        console.error("❌ Search error:", error.message)
        if (error.code === 'ECONNREFUSED') {
            throw new Error("Product Service is not running")
        }
        throw error
    }
}, {
    name: "searchProducts",
    description: "Search for e-commerce products by keywords with optional price filters. Perfect for smart search queries like 'show me shoes under 2000'",
    schema: z.object({
        query: z.string().describe("Product search query (e.g., 'shoes', 'laptop', 'red shirt')"),
        maxPrice: z.number().optional().describe("Maximum price filter (optional)"),
        minPrice: z.number().optional().describe("Minimum price filter (optional)")
    })
})

// ✅ AI PRODUCT RECOMMENDATION - Get products with AI scoring
const getProductRecommendations = tool(async ({ category, budget, token }) => {
    console.log("💡 getProductRecommendations called:", { category, budget })

    if (!token) {
        throw new Error("No authentication token provided")
    }

    try {
        const { detectCategory } = require("../utils/queryParser");
        const mappedCategory = detectCategory(category) || category;

        // Search for products in category with budget constraint
        const baseUrl = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3000'
        let url = `${baseUrl}/api/product?limit=5`
        
        // If it mapped to a known category, use the category filter. Otherwise fallback to q search.
        if (detectCategory(category)) {
            url += `&category=${encodeURIComponent(mappedCategory)}`
        } else {
            url += `&q=${encodeURIComponent(category)}`
        }
        
        if (budget) url += `&maxPrice=${budget}`

        const response = await axios.get(url, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 5000
        })

        const products = response.data.data || response.data.products || []

        // Format with AI-friendly details
        const recommendations = products.map((p, idx) => ({
            rank: idx + 1,
            name: p.title,
            price: p.price?.amount || 0,
            currency: p.price?.currency || 'INR',
            inStock: p.stock > 0,
            stockCount: p.stock,
            description: p.description || 'N/A',
            _id: p._id
        }))

        return JSON.stringify({
            category: category,
            budget: budget,
            recommendations: recommendations,
            message: `Found ${recommendations.length} recommended products`
        })
    } catch (error) {
        console.error("❌ Recommendation error:", error.message)
        throw error
    }
}, {
    name: "getProductRecommendations",
    description: "Get AI product recommendations based on category and budget. Use for shopping assistant queries.",
    schema: z.object({
        category: z.string().describe("Product category (e.g., 'shoes for daily use', 'budget laptop')"),
        budget: z.number().optional().describe("Budget/maximum price constraint")
    })
})

// ✅ SIMILAR PRODUCTS - Get products similar to a reference product
const getSimilarProducts = tool(async ({ productTitle, priceRange, token }) => {
    console.log("🔄 getSimilarProducts called:", { productTitle, priceRange })

    if (!token) {
        throw new Error("No authentication token provided")
    }

    try {
        // Extract main keyword from product title for similar search
        const keyword = productTitle.split(' ')[0] // Get first word
        
        const baseUrl = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3000'
        let url = `${baseUrl}/api/product?q=${encodeURIComponent(keyword)}`
        if (priceRange?.min) url += `&minPrice=${priceRange.min}`
        if (priceRange?.max) url += `&maxPrice=${priceRange.max}`
        url += `&limit=5`

        const response = await axios.get(url, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 5000
        })

        const products = response.data.data || response.data.products || []

        // Filter to similar price range and different products
        const similarProducts = products.map((p, idx) => ({
            position: idx + 1,
            title: p.title,
            price: p.price?.amount || 0,
            currency: p.price?.currency || 'INR',
            available: p.stock > 0,
            stock: p.stock,
            summary: p.description?.substring(0, 80) + '...' || 'Product details available'
        }))

        return JSON.stringify({
            referenceProduct: productTitle,
            similarProducts: similarProducts,
            count: similarProducts.length
        })
    } catch (error) {
        console.error("❌ Similar products error:", error.message)
        throw error
    }
}, {
    name: "getSimilarProducts",
    description: "Find products similar to a given product. Use for product comparison and similar recommendations.",
    schema: z.object({
        productTitle: z.string().describe("Title or name of the reference product"),
        priceRange: z.object({
            min: z.number().optional(),
            max: z.number().optional()
        }).optional().describe("Price range for similar products")
    })
})

module.exports = { searchProducts, getProductRecommendations, getSimilarProducts }
