# Admin Dashboard - Homepage Management Guide

## Overview
Admin panel now includes comprehensive homepage management features allowing admins to edit, create, and manage the home page image and hero section.

## API Endpoints

All endpoints require **Admin Role** authentication with JWT token in headers:
```
Authorization: Bearer {admin_token}
```

### 1. GET - View All Homepage Sections
**Endpoint:** `GET /api/seller/dashboard/homepage`

**Description:** Retrieve all homepage sections (banners, product rows, hero sections, etc.)

**Query Parameters:** None

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "section_id",
      "id": "section_id",
      "type": "banner",
      "placement": "after_categories",
      "title": "Hero Banner",
      "subtitle": "Welcome to Ai-VendorHub",
      "tag": "New Arrivals",
      "headline": "Shop Latest Products",
      "strip": "Up to 50% off",
      "badgeTop": "AI",
      "badgeMid": "Deals",
      "badgeBottom": "Sale",
      "actionLabel": "Shop now",
      "query": "",
      "link": "/products",
      "products": [],
      "theme": {
        "bg": "#d73a20",
        "shapeStyle": "circles",
        "shapeA": "#f97316",
        "shapeB": "#f59e0b",
        "stripBg": "#facc15",
        "text": "#ffe500",
        "badgeTopBg": "#c92c13",
        "badgeMidBg": "#facc15",
        "frame": "bg-[#047857]",
        "stripe": "bg-[#29aa78]"
      },
      "position": 0,
      "isActive": true,
      "startAt": "2026-01-01T00:00:00Z",
      "endAt": "2026-12-31T23:59:59Z",
      "createdAt": "2026-05-29T10:00:00Z",
      "updatedAt": "2026-05-29T10:00:00Z"
    }
  ]
}
```

---

### 2. POST - Create New Homepage Section
**Endpoint:** `POST /api/seller/dashboard/homepage`

**Description:** Create a new homepage section (banner, hero section, product row, etc.)

**Request Body:**
```json
{
  "type": "banner",
  "placement": "after_categories",
  "title": "Summer Sale",
  "subtitle": "Limited time offer",
  "headline": "Up to 70% Off",
  "strip": "Shop Now",
  "tag": "Sale",
  "badgeTop": "HOT",
  "badgeMid": "DEALS",
  "badgeBottom": "SALE",
  "actionLabel": "Browse Products",
  "link": "/products?category=sale",
  "query": "summer",
  "position": 1,
  "isActive": true,
  "startAt": "2026-06-01T00:00:00Z",
  "endAt": "2026-06-30T23:59:59Z",
  "products": ["product_id_1", "product_id_2"],
  "theme": {
    "bg": "#FF6B6B",
    "shapeStyle": "circles",
    "shapeA": "#FFA500",
    "shapeB": "#FFD700",
    "stripBg": "#FFEB3B",
    "text": "#FFFFFF",
    "badgeTopBg": "#FF4444",
    "badgeMidBg": "#FFD700",
    "frame": "bg-[#4CAF50]",
    "stripe": "bg-[#8BC34A]"
  }
}
```

**Supported Section Types:**
- `banner` - Full-width banner with image/content
- `split_banner` - Two-column banner layout
- `coupon_banner` - Banner specifically for coupons
- `mini_banner` - Smaller banner format
- `product_row` - Horizontal row of products
- `product_grid` - Grid layout of products
- `featured_split` - Featured product with split layout
- `compact_deals` - Compact deal/offer display
- `category_tiles` - Category selection tiles
- `mosaic_grid` - Mosaic-style product grid
- `editorial_stack` - Stacked editorial content
- `brand_marquee` - Brand carousel/marquee

**Response (201):**
```json
{
  "success": true,
  "message": "Homepage section created",
  "data": {
    "_id": "new_section_id",
    "type": "banner",
    "title": "Summer Sale",
    ...
  }
}
```

---

### 3. PATCH - Update Homepage Section
**Endpoint:** `PATCH /api/seller/dashboard/homepage/:id`

**Description:** Update an existing homepage section

**URL Parameters:**
- `id` - The homepage section ID

**Request Body:** (Same as POST, all fields optional)
```json
{
  "title": "Updated Title",
  "subtitle": "Updated subtitle",
  "isActive": false,
  "theme": {
    "bg": "#000000"
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Homepage section updated",
  "data": {
    "_id": "section_id",
    "title": "Updated Title",
    ...
  }
}
```

---

### 4. DELETE - Remove Homepage Section
**Endpoint:** `DELETE /api/seller/dashboard/homepage/:id`

**Description:** Delete a homepage section

**URL Parameters:**
- `id` - The homepage section ID

**Response (200):**
```json
{
  "success": true,
  "message": "Homepage section deleted"
}
```

---

## Usage Examples

### Example 1: Create a Hero Banner with Image
```bash
curl -X POST http://localhost:3002/api/seller/dashboard/homepage \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "banner",
    "placement": "after_categories",
    "title": "Welcome to Ai-VendorHub",
    "headline": "Discover Amazing Products",
    "actionLabel": "Shop Now",
    "link": "/products",
    "position": 0,
    "isActive": true,
    "theme": {
      "bg": "#d73a20",
      "text": "#FFFFFF"
    }
  }'
```

### Example 2: Create Product Row Section
```bash
curl -X POST http://localhost:3002/api/seller/dashboard/homepage \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "product_row",
    "title": "Trending Products",
    "position": 1,
    "products": ["product_id_1", "product_id_2", "product_id_3"],
    "isActive": true
  }'
```

### Example 3: Update Hero Banner
```bash
curl -X PATCH http://localhost:3002/api/seller/dashboard/homepage/section_id \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Season Sale",
    "headline": "Save Big on Your Favorites",
    "theme": {
      "bg": "#FF6B6B"
    }
  }'
```

### Example 4: Delete a Section
```bash
curl -X DELETE http://localhost:3002/api/seller/dashboard/homepage/section_id \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## Key Features

### Theme Customization
Each section supports theme customization with:
- **bg** - Background color
- **shapeStyle** - Shape style (circles, squares, etc.)
- **shapeA, shapeB** - Shape colors
- **stripBg** - Strip background color
- **text** - Text color
- **badgeTopBg, badgeMidBg** - Badge colors
- **frame, stripe** - Frame and stripe Tailwind classes

### Scheduling
Sections can be scheduled with:
- **startAt** - When the section becomes active
- **endAt** - When the section stops being active
- Automatic filtering based on current date/time

### Positioning
- **position** - Order of sections (lower numbers appear first)
- **placement** - Where to place (after_categories, after_stats, before_catalog)

### Status Management
- **isActive** - Toggle section visibility without deleting
- Inactive sections won't appear on the public homepage

---

## Technical Details

### Database Model
The HomepageSection model is stored in MongoDB with the following structure:
```javascript
{
  type: String (required),
  placement: String (default: 'after_categories'),
  title: String (required),
  subtitle: String,
  headline: String,
  actionLabel: String,
  link: String,
  products: [ObjectId],
  theme: Object,
  position: Number,
  isActive: Boolean,
  startAt: Date,
  endAt: Date,
  createdBy: ObjectId,
  timestamps: true
}
```

### Authentication
Only admins can access these endpoints. User must have role === 'admin'

### Validation
- Section type must be one of the supported types
- Title must be at least 3 characters
- End date cannot be before start date
- Product IDs must be valid MongoDB ObjectIds

---

## Integration with Public Homepage

The homepage management API integrates with the product service's public homepage endpoint:
- **GET /api/product/homepage** - Public view of active sections
- Only active sections with valid date ranges are returned
- Products are automatically filtered to exclude archived items

---

## Support & Troubleshooting

### Common Issues

**Issue:** Authentication failed
- **Solution:** Ensure JWT token in headers is valid and user has admin role

**Issue:** Invalid section type
- **Solution:** Use one of the supported types listed above

**Issue:** Section not appearing on homepage
- **Solution:** Check if `isActive` is true and current date is within `startAt` and `endAt`

---

## Next Steps

1. Open admin panel
2. Navigate to "Homepage Management" or use the API directly
3. Create or edit hero sections and banners
4. Set scheduling and theme
5. Publish and test on the public homepage
