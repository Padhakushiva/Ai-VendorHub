# Product Service - Best Practices & Performance Guide

## 🎯 Architecture Best Practices

### 1. Component Organization

**File Structure**:
```
src/
├── components/          # Reusable UI components
│   ├── Navbar.jsx      # Single responsibility: navigation
│   ├── Footer.jsx      # Single responsibility: footer
│   ├── ProductCard.jsx # Single responsibility: product display
│   └── FilterSidebar.jsx # Single responsibility: filtering
├── context/            # Global state management
│   └── ProductContext.jsx
├── pages/              # Full page components
│   ├── Home.jsx       # Main product listing page
│   └── ProductDetail.jsx # Single product details
├── App.jsx             # Main app component with routing
├── App.css             # App-wide styles
└── main.jsx            # React entry point
```

**Why This Structure?**
- ✅ Clear separation of concerns
- ✅ Easy to find and modify components
- ✅ Reusable across different pages
- ✅ Scalable as project grows

### 2. Single Responsibility Principle

Each component has ONE job:

```javascript
// ✅ GOOD - Navbar only handles navigation
export default function Navbar() {
  // Only navbar-related logic
  return (
    <nav>
      <Logo />
      <Search />
      <Navigation />
      <Cart />
    </nav>
  );
}

// ❌ BAD - Navbar does too much
export default function Navbar() {
  // Handles products, filters, cart, profile, etc.
  // Too many responsibilities!
}
```

### 3. Composition Over Inheritance

```javascript
// ✅ GOOD - Use composition
function ProductCard({ product }) {
  return (
    <div>
      <ProductImage src={product.image} />
      <ProductInfo title={product.title} />
      <ProductPrice price={product.price} />
    </div>
  );
}

// ❌ BAD - Try to extend with inheritance
class ProductCard extends React.Component {
  // Complex inheritance hierarchy
}
```

---

## 🚀 Performance Optimization

### 1. Code Splitting & Lazy Loading

**Current Implementation**:
```javascript
// React Router automatically code-splits routes
import Home from './pages/Home';
import ProductDetail from './pages/ProductDetail';

<Routes>
  <Route path="/" element={<Home />} />
  <Route path="/product/:id" element={<ProductDetail />} />
</Routes>

// Each route is a separate JS chunk
// Only loads when needed
```

**How It Works**:
```
Build process:
  - app.js (main) - ~50KB
  - Home.js - ~15KB
  - ProductDetail.js - ~20KB

User visits home:
  - Downloads app.js + Home.js
  - ProductDetail.js not loaded yet (saves bandwidth)

User clicks product:
  - app.js already cached
  - Downloads ProductDetail.js

Total bandwidth: Lower because not everything is loaded upfront
```

### 2. Image Optimization

**Lazy Loading**:
```javascript
// Intersection Observer (built-in browser API)
<img src={product.image} loading="lazy" />

// What happens:
// - Image not in viewport → not loaded
// - User scrolls → image enters viewport → loads
// - Saves bandwidth on first page load
```

**Responsive Images**:
```javascript
// Different sizes for different screens
<img 
  src={product.image}
  srcSet={`
    ${product.image}?w=300 300w,
    ${product.image}?w=600 600w,
    ${product.image}?w=1200 1200w
  `}
  sizes="(max-width: 640px) 300px, (max-width: 1024px) 600px, 1200px"
/>

// Browser selects appropriate size:
// - Mobile: 300px image
// - Tablet: 600px image
// - Desktop: 1200px image
```

### 3. Memoization

**Prevent Unnecessary Re-renders**:
```javascript
import React, { useMemo } from 'react';

function Home() {
  const { products, filters } = useProduct();
  
  // ✅ GOOD - Memoized calculation
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Complex filtering logic
      return p.price >= filters.priceRange[0] &&
             p.price <= filters.priceRange[1];
    });
  }, [products, filters]); // Only recalculate if these change
  
  return (
    <div className="grid">
      {filteredProducts.map(p => <ProductCard key={p._id} product={p} />)}
    </div>
  );
}
```

### 4. Efficient State Management

**Avoid Prop Drilling**:
```javascript
// ❌ BAD - Props passed through many levels
<App>
  <Layout>
    <Header user={user} setUser={setUser} />
    <Main user={user} setUser={setUser} />
    <Sidebar user={user} setUser={setUser} />
  </Layout>
</App>

// ✅ GOOD - Use Context API
<App>
  <AuthProvider>
    <Layout>
      <Header />        {/* Uses useAuth() */}
      <Main />          {/* Uses useAuth() */}
      <Sidebar />       {/* Uses useAuth() */}
    </Layout>
  </AuthProvider>
</App>
```

### 5. Debounced API Calls

**Prevent Spam Requests**:
```javascript
// Without debouncing:
// User types: "i" → API call
//            "ip" → API call
//            "iph" → API call
//            "ipho" → API call
//            "iphon" → API call
//            "iphone" → API call
// = 6 API calls!

// ✅ GOOD - Debounce
import { useCallback } from 'react';

const debouncedSearch = useCallback(
  (searchTerm) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      // Only this runs after user stops typing
      updateFilters({ searchTerm });
    }, 300); // Wait 300ms after last keystroke
  },
  []
);

// Result:
// User types: "iphone" (stops typing)
// Wait 300ms → 1 API call
// = Much better!
```

---

## 🎨 CSS & Styling Best Practices

### 1. TailwindCSS Utilities

**Why Tailwind?**
```
Traditional CSS:
  - Create .css files
  - Name classes (.btn-primary, .btn-secondary, etc.)
  - Easy to over-complicate
  
Tailwind:
  - Use utility classes directly in JSX
  - Consistent spacing, colors, sizing
  - Smaller final bundle
  - Easy to maintain
```

**Example**:
```javascript
// ✅ GOOD - Tailwind utilities
<button className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg">
  Click me
</button>

// ❌ BAD - Custom CSS
<button className="btn-primary">
  Click me
</button>
// Requires separate CSS file with definitions
```

### 2. Responsive Design

**Mobile-First Approach**:
```javascript
// ✅ GOOD - Start mobile, add complexity
<div className="
  grid grid-cols-1              // Mobile: 1 column
  sm:grid-cols-2                // Tablet: 2 columns
  lg:grid-cols-3                // Desktop: 3 columns
  xl:grid-cols-4                // Wide: 4 columns
  gap-6
">
  {products.map(p => <ProductCard key={p._id} product={p} />)}
</div>

// ❌ BAD - Desktop-first (harder to scale down)
// Requires media queries to override
```

**Breakpoints Used**:
```
sm: 640px   (tablets)
md: 768px   (small desktops)
lg: 1024px  (desktops)
xl: 1280px  (large screens)
2xl: 1536px (extra wide)
```

### 3. Animations & Transitions

**Smooth Interactions**:
```javascript
// ✅ GOOD - Smooth, intentional animations
<div className="
  transition-all duration-300 ease-out
  hover:scale-110
  hover:shadow-lg
">
  {/* Scales and shadows smoothly on hover */}
</div>

// ❌ BAD - Jarring, no transitions
<div onClick={() => setScale(1.1)}>
  {/* Instantly jumps to 110% */}
</div>
```

---

## 🔒 Security Best Practices

### 1. Input Sanitization

```javascript
// ✅ GOOD - React automatically escapes
function SearchBar() {
  const [search, setSearch] = useState('');
  
  return (
    <input
      value={search}
      onChange={(e) => setSearch(e.target.value)}
    />
  );
}
// React prevents XSS attacks automatically

// ❌ BAD - Using dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{ __html: userInput }} />
// Can cause XSS if userInput contains malicious code
```

### 2. API Communication

```javascript
// ✅ GOOD - HTTPS only, validate data
const fetchProducts = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/products`);
    
    // Validate response structure
    if (!Array.isArray(response.data.data)) {
      throw new Error('Invalid response format');
    }
    
    setProducts(response.data.data);
  } catch (error) {
    setError(error.message);
  }
};

// ❌ BAD - No validation, treats any response as valid
fetch('/api/products').then(r => r.json()).then(d => setProducts(d));
```

### 3. Environment Variables

```javascript
// ✅ GOOD - Use environment variables for sensitive data
const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:5000/api';

// Create .env file (NEVER commit this!)
// VITE_API_URL=https://api.example.com

// ❌ BAD - Hardcoding URLs
const API_BASE_URL = 'https://secret-api-key:password@api.example.com/api';
// Exposed in source code!
```

---

## ♿ Accessibility Best Practices

### 1. Semantic HTML

```javascript
// ✅ GOOD - Proper semantic structure
<nav>
  <Link to="/">Home</Link>
  <Link to="/products">Products</Link>
</nav>

<main>
  <h1>Products</h1>
  <article>
    <h2>Product Title</h2>
    <p>Description</p>
  </article>
</main>

<footer>
  <p>&copy; 2024 ProductHub</p>
</footer>

// ❌ BAD - Everything is divs
<div>
  <div onClick={goHome}>Home</div>
  <div onClick={goProducts}>Products</div>
</div>
```

### 2. ARIA Labels

```javascript
// ✅ GOOD - Labels for screen readers
<button
  onClick={handleAddToCart}
  aria-label="Add product to cart"
  aria-pressed={isInCart}
>
  <ShoppingCart size={20} />
</button>

// ❌ BAD - No indication what button does
<button onClick={handleAddToCart}>
  <ShoppingCart size={20} />
</button>
```

### 3. Keyboard Navigation

```javascript
// ✅ GOOD - Keyboard support
<button
  onClick={handleAction}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleAction();
    }
  }}
>
  Action
</button>

// ✅ GOOD - Tab order with tabIndex
<input tabIndex={0} placeholder="Search" />
<button tabIndex={1}>Search</button>

// ❌ BAD - No keyboard support
<div onClick={handleAction}>Click me</div>
// Can't be accessed with keyboard
```

---

## 🧪 Testing Best Practices

### 1. Component Testing

```javascript
// ✅ GOOD - Test component behavior
import { render, screen, fireEvent } from '@testing-library/react';
import ProductCard from './ProductCard';

test('ProductCard displays product information', () => {
  const product = {
    _id: '1',
    title: 'Test Product',
    price: 100,
    image: 'test.jpg'
  };
  
  render(<ProductCard product={product} />);
  
  expect(screen.getByText('Test Product')).toBeInTheDocument();
  expect(screen.getByText('$100')).toBeInTheDocument();
});

test('ProductCard navigates on click', () => {
  // Test click behavior
});
```

### 2. Integration Testing

```javascript
// ✅ GOOD - Test feature workflows
test('User can search for products', async () => {
  render(<App />);
  
  const searchInput = screen.getByPlaceholderText('Search products...');
  fireEvent.change(searchInput, { target: { value: 'phone' } });
  
  const searchButton = screen.getByRole('button', { name: /search/i });
  fireEvent.click(searchButton);
  
  // Wait for results
  const results = await screen.findByText(/iphone/i);
  expect(results).toBeInTheDocument();
});
```

---

## 📊 Performance Metrics to Monitor

### Web Vitals

```
Largest Contentful Paint (LCP)
  - How fast main content loads
  - Target: < 2.5 seconds
  - Optimize: Lazy load images, code split

First Input Delay (FID)
  - Response time to user interaction
  - Target: < 100ms
  - Optimize: Defer non-critical JS

Cumulative Layout Shift (CLS)
  - Unexpected layout changes
  - Target: < 0.1
  - Optimize: Reserve space for images/ads
```

### Custom Metrics

```javascript
// Track custom events
const trackEvent = (eventName, data) => {
  // Send to analytics
  console.log(`Event: ${eventName}`, data);
};

// Track important actions
trackEvent('product_viewed', { productId: '123' });
trackEvent('add_to_cart', { productId: '123', quantity: 1 });
trackEvent('search_performed', { searchTerm: 'phone' });
```

---

## 🚀 Deployment Best Practices

### 1. Production Build Optimization

```javascript
// vite.config.js
export default {
  build: {
    // Minify: Yes (remove comments, whitespace)
    minify: 'terser',
    
    // Code splitting
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'axios'],
          'router': ['react-router-dom']
        }
      }
    }
  }
}
```

### 2. Environment-Specific Configuration

```javascript
// Use different configs per environment
const API_URL = {
  development: 'http://localhost:5000/api',
  staging: 'https://api-staging.example.com',
  production: 'https://api.example.com'
}[process.env.NODE_ENV];

// .env.development
VITE_API_URL=http://localhost:5000/api

// .env.production
VITE_API_URL=https://api.example.com
```

### 3. Cache Strategies

```javascript
// Service Worker caching (future)
// Cache API responses for 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

const getCachedProducts = () => {
  const cached = localStorage.getItem('products');
  const timestamp = localStorage.getItem('products_time');
  
  if (cached && Date.now() - timestamp < CACHE_DURATION) {
    return JSON.parse(cached);
  }
  return null;
};
```

---

## 📝 Code Quality Standards

### 1. Naming Conventions

```javascript
// ✅ GOOD - Clear, descriptive names
const isProductInStock = true;
const handleAddToCart = () => {};
const ProductCard = () => {};
const getFilteredProducts = () => {};

// ❌ BAD - Unclear names
const a = true;
const fn = () => {};
const PC = () => {};
const gfp = () => {};
```

### 2. Comments & Documentation

```javascript
// ✅ GOOD - Explain WHY, not WHAT
// Use a local variable to avoid re-creating function on each render
const memoizedCallback = useCallback(
  () => fetchProducts(),
  [filters]
);

// ❌ BAD - Obvious comments
// Add 1 to count
count = count + 1;

// Increment count
count++;
```

### 3. Consistent Formatting

```javascript
// Use Prettier for automatic formatting
// EditorConfig for consistent settings

// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

---

## 🎓 Summary of Best Practices

### ✅ DO:
- ✓ Keep components small and focused
- ✓ Use Context API for global state
- ✓ Lazy load images and code
- ✓ Memoize expensive calculations
- ✓ Test important features
- ✓ Use semantic HTML
- ✓ Validate all user input
- ✓ Optimize for mobile first
- ✓ Monitor performance metrics
- ✓ Follow naming conventions

### ❌ DON'T:
- ✗ Create mega-components with multiple responsibilities
- ✗ Pass props through many levels (prop drilling)
- ✗ Load all images upfront
- ✗ Trust all API responses blindly
- ✗ Use inline styles
- ✗ Hardcode sensitive data
- ✗ Ignore accessibility
- ✗ Skip mobile testing
- ✗ Use dangerouslySetInnerHTML
- ✗ Commit .env files to git

---

## 📚 Resources

### React Best Practices
- Official React Docs: https://react.dev
- React Patterns: https://patterns.dev/posts/react-patterns/

### Performance
- Web.dev: https://web.dev
- Lighthouse: https://developers.google.com/web/tools/lighthouse

### Accessibility
- WCAG 2.1: https://www.w3.org/WAI/WCAG21/quickref/
- ARIA: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA

### Security
- OWASP: https://owasp.org/
- Content Security Policy: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP

This guide ensures the codebase remains clean, performant, secure, and maintainable as it grows!
