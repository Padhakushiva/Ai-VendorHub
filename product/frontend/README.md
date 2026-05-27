# Product Service Frontend

A modern React-based e-commerce frontend for browsing and viewing products. Built with Vite, React 19, TailwindCSS, and React Router.

## Features

✨ **Responsive Design** - Works seamlessly on desktop, tablet, and mobile devices
🛍️ **Product Showcase** - Beautiful product grid with lazy loading
🔍 **Search & Filter** - Find products by name, category, and price range
⭐ **Product Details** - Detailed product pages with ratings, reviews, and images
📱 **Mobile Optimized** - Full responsive experience with mobile navigation
🎨 **Modern UI** - Sleek dark theme with gradient effects using TailwindCSS
⚡ **Fast Performance** - Built with Vite for instant dev reload and optimized builds

## Project Structure

```
product/frontend/
├── src/
│   ├── components/          # Reusable React components
│   │   ├── Navbar.jsx      # Navigation bar
│   │   ├── Footer.jsx      # Footer section
│   │   ├── ProductCard.jsx # Product display card
│   │   └── FilterSidebar.jsx # Filtering options
│   ├── context/
│   │   └── ProductContext.jsx # Global state management
│   ├── pages/              # Page components
│   │   ├── Home.jsx       # Main product listing page
│   │   └── ProductDetail.jsx # Individual product details
│   ├── App.jsx            # Main App component with routing
│   ├── App.css            # App-specific styles
│   ├── index.css          # Global styles
│   └── main.jsx           # React entry point
├── public/                # Static assets
├── index.html             # HTML template
├── package.json           # Dependencies and scripts
├── vite.config.js         # Vite configuration
├── tailwind.config.js     # TailwindCSS configuration
├── postcss.config.js      # PostCSS configuration
└── .eslintrc.js          # ESLint configuration
```

## Installation & Setup

### 1. Install Dependencies

```bash
cd product/frontend
npm install
```

### 2. Environment Variables

Create a `.env` file in the frontend folder:

```bash
cp .env.example .env
```

Then edit `.env` with your API endpoint:

```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Run Development Server

```bash
npm run dev
```

The frontend will start at `http://localhost:5174`

### 4. Build for Production

```bash
npm run build
```

This creates an optimized production build in the `dist` folder.

### 5. Preview Production Build

```bash
npm run preview
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Create optimized production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint to check code quality |

## Technologies Used

- **React 19.2.6** - UI library
- **Vite 8.0.12** - Build tool and dev server
- **React Router 7.15.1** - Client-side routing
- **TailwindCSS 3.4.19** - Utility-first CSS framework
- **Axios 1.16.1** - HTTP client for API calls
- **Lucide React 1.16.0** - Beautiful SVG icons
- **PostCSS 8.5.15** - CSS transformation
- **AutoPrefixer** - Browser compatibility for CSS

## Features Explained

### 🏠 Home Page
- Displays all available products in a responsive grid
- Shows product cards with:
  - Product image
  - Title and description
  - Price and discount
  - Star ratings and reviews
  - Stock status
  - Quick add to cart button

### 🔍 Search & Filter
- **Search Bar** - Find products by name
- **Category Filter** - Browse by product category
- **Price Range** - Filter by min/max price
- **Mobile Filters** - Collapsible filter panel on smaller screens

### 📄 Product Details
- Full product information page
- High-resolution images with gallery
- Detailed description
- Customer ratings and reviews count
- Quantity selector
- Add to cart functionality
- Wishlist option
- Stock status indicator

### 📱 Responsive Navigation
- Sticky navbar with logo and search
- Shopping cart icon
- Mobile hamburger menu
- Category links

### 🔗 API Integration
The frontend expects your product API to provide:

```javascript
// GET /api/products
{
  data: [
    {
      _id: "product-id",
      title: "Product Name",
      description: "Product description",
      price: 999,
      image: "image-url",
      category: "Category Name",
      rating: 4.5,
      reviews: 128,
      inStock: true,
      discount: 10  // optional
    }
  ]
}

// GET /api/products/:id
{
  data: {
    // product object
  }
}
```

## State Management

Using React Context API with `ProductContext`:

```javascript
const { products, loading, error, filters, updateFilters, resetFilters } = useProduct();
```

**Available Methods:**
- `fetchProducts()` - Get all products with current filters
- `fetchProductById(id)` - Get specific product details
- `updateFilters(newFilters)` - Update search/filter options
- `resetFilters()` - Clear all filters

## Styling & Customization

### TailwindCSS Configuration

Edit `tailwind.config.js` to customize:
- Colors and theme
- Typography
- Spacing
- Animations

### Custom CSS

Edit `src/App.css` for custom animations and effects:
- `.glow` - Glow effect for cards
- `.gradient-text` - Gradient text effect
- `.animate-fade-in` - Fade-in animation

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Development Tips

1. **Hot Module Replacement** - Changes are reflected instantly without full page reload
2. **ESLint** - Run `npm run lint` to check code quality
3. **DevTools** - Use React Developer Tools browser extension for debugging
4. **API Proxy** - Development requests to `/api` are proxied to `http://localhost:5000`

## Troubleshooting

### Port Already in Use
If port 5174 is already in use, Vite will use the next available port.

### API Connection Issues
- Ensure the product API is running on `http://localhost:5000`
- Check CORS settings on the backend
- Verify `VITE_API_URL` in `.env` file

### Build Issues
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Clear Vite cache: `rm -rf dist && npm run build`

## Performance Optimization

- Image lazy loading with Intersection Observer
- Code splitting with React Router
- CSS minification via Vite
- Tree-shaking of unused code
- Optimized bundle size with dynamic imports

## Contributing

1. Create a new branch for your feature
2. Make changes following the project structure
3. Test thoroughly
4. Submit a pull request

## License

This project is part of AI Vendor Hub platform.

## Support

For issues and questions, refer to the main project documentation or contact the development team.
