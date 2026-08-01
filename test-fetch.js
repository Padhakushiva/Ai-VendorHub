const http = require('http');

http.get('http://[::1]:3000/api/product/homepage', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      const sections = parsed.data || [];
      let productId = null;
      for (const section of sections) {
        if (section.products && section.products.length > 0) {
          productId = section.products[0]._id || section.products[0].id;
          break;
        }
      }
      
      if (!productId) {
        console.log("No product ID found in homepage sections");
        return;
      }
      console.log("Found Product ID:", productId);
      
      http.get('http://[::1]:3000/api/product/' + productId, (res2) => {
        let data2 = '';
        res2.on('data', chunk => data2 += chunk);
        res2.on('end', () => {
          console.log("Product Details Response Code:", res2.statusCode);
          console.log("Product Details Response:", data2.slice(0, 500));
        });
      });
      
    } catch (e) {
      console.error("Parse error:", e);
    }
  });
}).on('error', err => {
  console.error("HTTP error:", err.message);
});
