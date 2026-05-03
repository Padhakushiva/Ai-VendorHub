const { tool } = require("@langchain/core/tools")
const { z } = require("zod")
const axios = require("axios")

const searchProduct = tool(async ({ query, token }) => {

    console.log("🔍 searchProduct called with data:", { query })

    if (!token) {
        throw new Error("No authentication token provided")
    }

    try {
        const response = await axios.get(`http://localhost:3000/api/product?q=${query}`, {
            headers: {
                Authorization: `Bearer ${token}`
            },
            timeout: 5000
        })

        console.log(`✅ Found ${response.data.products?.length || 0} products`)
        return JSON.stringify(response.data)
    } catch (error) {
        console.error("❌ Product search error:", error.message)
        if (error.code === 'ECONNREFUSED') {
            throw new Error("Product Service (localhost:3000) is not running")
        }
        throw error
    }

}, {

    name: "searchProduct",
    description: "Search for products based on a query. Searches in product name, description, and category.",
    schema: z.object({
        query: z.string().describe("The search query for products (e.g., 'red sneakers', 'laptop', 'blue shirt')")
    })
})


const addProductToCart = tool(async ({ productId, qty = 1, token }) => {

    console.log("🛒 addProductToCart called with data:", { productId, qty })

    if (!token) {
        throw new Error("No authentication token provided")
    }

    try {
        const response = await axios.post(`http://localhost:3002/api/cart/items`, {
            productId,
            qty
        }, {
            headers: {
                Authorization: `Bearer ${token}`
            },
            timeout: 5000
        })

        console.log(`✅ Added ${qty} unit(s) of product ${productId} to cart`)
        return JSON.stringify({
            success: true,
            message: `Added product with id ${productId} (qty: ${qty}) to cart`,
            cartData: response.data
        })
    } catch (error) {
        console.error("❌ Add to cart error:", error.message)
        if (error.code === 'ECONNREFUSED') {
            throw new Error("Cart Service (localhost:3002) is not running")
        }
        throw error
    }

}, {
    name: "addProductToCart",
    description: "Add a product to the shopping cart on behalf of the user",
    schema: z.object({
        productId: z.string().describe("The unique ID of the product to add to the cart"),
        qty: z.number().describe("The quantity of the product to add to the cart (default: 1)").default(1).optional(),
    })
})


module.exports = { searchProduct, addProductToCart }