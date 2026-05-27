# Ai-VendorHub Complete Postman API Documentation

Updated: 20 May 2026  
Purpose: Current implementation ke according Postman testing guide.

## 1. Postman Environment

Create these variables in Postman:

| Variable | Value |
|---|---|
| `auth_url` | `http://localhost:3001/api` |
| `product_url` | `http://localhost:3000/api/product` |
| `cart_url` | `http://localhost:3002/api/cart` |
| `order_url` | `http://localhost:3003/api/orders` |
| `payment_url` | `http://localhost:3004/api/payment` |
| `ai_url` | `http://localhost:3005/ai` |
| `notification_url` | `http://localhost:3006/api/notifications` |
| `dashboard_url` | `http://localhost:3007/api/seller/dashboard` |
| `user_token` | paste user login token |
| `seller_token` | paste seller login token |
| `admin_token` | paste admin token if you have one |
| `product_id` | created product id |
| `variant_id` | created variant id |
| `order_id` | created order id |
| `payment_id` | payment document id or gateway payment id |
| `notification_id` | notification id |
| `dashboard_event_id` | dashboard feed event id |
| `low_stock_alert_id` | low stock alert id |

Auth header format:

```http
Authorization: Bearer {{user_token}}
```

For seller APIs:

```http
Authorization: Bearer {{seller_token}}
```

## 2. Recommended Testing Flow

1. Register/login user.
2. Register/login seller.
3. Create product as seller.
4. Add variant if needed.
5. User views product, wishlist, AI insights.
6. User adds product to cart.
7. User creates order.
8. User creates Razorpay payment order.
9. Verify payment.
10. Check notification, seller dashboard, AI endpoints.

## 3. Service Ports

| Service | Port | Base |
|---|---:|---|
| Product | 3000 | `http://localhost:3000/api/product` |
| Auth | 3001 | `http://localhost:3001/api` |
| Cart | 3002 | `http://localhost:3002/api/cart` |
| Order | 3003 | `http://localhost:3003/api/orders` |
| Payment | 3004 | `http://localhost:3004/api/payment` |
| AI | 3005 | `http://localhost:3005/ai` |
| Notification | 3006 | `http://localhost:3006/api/notifications` |
| Seller Dashboard | 3007 | `http://localhost:3007/api/seller/dashboard` |

---

# Auth Service

Base URL: `http://localhost:3001/api`

## Health

| Method | Endpoint | Auth | Body |
|---|---|---|---|
| GET | `/` | No | None |

## Register User

`POST http://localhost:3001/api/auth/register`

Body:

```json
{
  "username": "testuser",
  "email": "testuser@example.com",
  "password": "password123",
  "fullName": {
    "firstName": "Test",
    "lastName": "User"
  },
  "role": "user",
  "address": {
    "addressLine": "123 Main Street",
    "city": "Delhi",
    "state": "Delhi",
    "pincode": "110001",
    "phone": "9876543210"
  }
}
```

## Register Seller

`POST http://localhost:3001/api/auth/register/seller`

Body:

```json
{
  "username": "testseller",
  "email": "seller@example.com",
  "password": "password123",
  "fullName": {
    "firstName": "Test",
    "lastName": "Seller"
  },
  "role": "seller"
}
```

## Login User

`POST http://localhost:3001/api/auth/login`

Body:

```json
{
  "email": "testuser@example.com",
  "password": "password123"
}
```

Alternative:

```json
{
  "username": "testuser",
  "password": "password123"
}
```

## Login Seller

`POST http://localhost:3001/api/auth/login/seller`

Body:

```json
{
  "email": "seller@example.com",
  "password": "password123"
}
```

## Current User

`GET http://localhost:3001/api/auth/me`

Auth: `Bearer {{user_token}}` or `Bearer {{seller_token}}`

## Update Profile

`PATCH http://localhost:3001/api/auth/users/me`

Auth: required

Body:

```json
{
  "username": "updateduser",
  "fullName": {
    "firstName": "Updated",
    "lastName": "Name"
  }
}
```

Allowed fields only: `username`, `email`, `fullName`.

## Refresh Token

`POST http://localhost:3001/api/auth/refresh`

Body usually not needed if refresh token cookie exists. If your implementation returns refresh token in response, send:

```json
{
  "refreshToken": "paste_refresh_token_here"
}
```

## Logout Current Device

`POST http://localhost:3001/api/auth/logout`

Auth: required

Body: none

Also available:

`GET http://localhost:3001/api/auth/logout`

## Logout All Devices

`POST http://localhost:3001/api/auth/logout-all`

Auth: required

Body: none

## Email Verification

Request verification:

`POST http://localhost:3001/api/auth/verify-email/request`

Auth: required

Body: none

Verify token:

`GET http://localhost:3001/api/auth/verify-email/:token`

or

`POST http://localhost:3001/api/auth/verify-email/:token`

## Password Reset

Forgot password:

`POST http://localhost:3001/api/auth/password/forgot`

Body:

```json
{
  "email": "testuser@example.com"
}
```

Reset password:

`POST http://localhost:3001/api/auth/password/reset/:token`

Body:

```json
{
  "password": "newpassword123"
}
```

## Google Login

Open in browser:

`GET http://localhost:3001/api/auth/google`

Callback:

`GET http://localhost:3001/api/auth/google/callback`

## Addresses

Get addresses:

`GET http://localhost:3001/api/auth/users/me/addresses`

Auth: required

Add address:

`POST http://localhost:3001/api/auth/users/me/addresses`

Body:

```json
{
  "addressLine": "221B Baker Street",
  "city": "Delhi",
  "state": "Delhi",
  "pincode": "110001",
  "phone": "9876543210",
  "default": true
}
```

Delete address:

`DELETE http://localhost:3001/api/auth/users/me/addresses/:addressId`

---

# Product Service

Base URL: `http://localhost:3000/api/product`

Alias paths also exist: `/api/products`, `/products`.

## Health

`GET http://localhost:3000/`

## Create Product

`POST http://localhost:3000/api/product/`

Auth: `Bearer {{seller_token}}`

Body type: `form-data` recommended because image upload is supported.

| Key | Type | Example |
|---|---|---|
| `title` | text | `Wireless Gaming Mouse` |
| `description` | text | `RGB wireless gaming mouse` |
| `amount` | text | `1499` |
| `currency` | text | `INR` |
| `stock` | text | `25` |
| `category` | text | `Electronics` |
| `brand` | text | `LogiTech` |
| `tags` | text | `gaming,mouse,wireless` |
| `images` | file | choose up to 5 images |

JSON alternative if not uploading images:

```json
{
  "title": "Wireless Gaming Mouse",
  "description": "RGB wireless gaming mouse",
  "price": {
    "amount": 1499,
    "currency": "INR"
  },
  "stock": 25,
  "category": "Electronics",
  "brand": "LogiTech",
  "tags": ["gaming", "mouse", "wireless"]
}
```

## Get Products

`GET http://localhost:3000/api/product/`

Common query params:

| Query | Example |
|---|---|
| `q` | `mouse` |
| `category` | `Electronics` |
| `minPrice` or `minprice` | `500` |
| `maxPrice` or `maxprice` | `3000` |
| `sort` | `price_asc`, `price_desc`, `stock_asc`, `newest` |
| `limit` | `10` |
| `skip` | `0` |

Example:

`GET http://localhost:3000/api/product/?q=mouse&maxPrice=3000&limit=10`

## Seller Product List

`GET http://localhost:3000/api/product/seller`

Auth: seller

Query examples:

`?status=active&sort=stock_asc&limit=20`

## Product Compare

`GET http://localhost:3000/api/product/compare?ids={{product_id}},OTHER_PRODUCT_ID`

Auth: no

## Trending Products

`GET http://localhost:3000/api/product/trending`

## Recently Viewed

`GET http://localhost:3000/api/product/recently-viewed`

Auth: user/seller/admin

## Wishlist

Get wishlist:

`GET http://localhost:3000/api/product/wishlist`

Auth: user

Add to wishlist:

`POST http://localhost:3000/api/product/wishlist/{{product_id}}`

Auth: user

Remove:

`DELETE http://localhost:3000/api/product/wishlist/{{product_id}}`

Auth: user

## Track Product View

`POST http://localhost:3000/api/product/{{product_id}}/view`

Auth: user/seller/admin

Body: none

## Related Products

`GET http://localhost:3000/api/product/{{product_id}}/related`

## Product Variants

Add variant:

`POST http://localhost:3000/api/product/{{product_id}}/variants`

Auth: seller/admin

Body:

```json
{
  "sku": "MOUSE-BLACK",
  "name": "Black Variant",
  "attributes": {
    "color": "black",
    "connectivity": "wireless"
  },
  "price": {
    "amount": 1599,
    "currency": "INR"
  },
  "stock": 10,
  "active": true
}
```

Update variant:

`PATCH http://localhost:3000/api/product/{{product_id}}/variants/{{variant_id}}`

Body:

```json
{
  "stock": 20,
  "price": {
    "amount": 1499,
    "currency": "INR"
  },
  "active": true
}
```

## Product Detail

`GET http://localhost:3000/api/product/{{product_id}}`

## Update Product

`PATCH http://localhost:3000/api/product/{{product_id}}`

Auth: seller/admin

Body JSON:

```json
{
  "title": "Updated Gaming Mouse",
  "description": "Updated description",
  "price": {
    "amount": 1399,
    "currency": "INR"
  },
  "stock": 30,
  "status": "active"
}
```

For image update use form-data with `images`, `replaceImages=true`, or `removeImageIds`.

## Delete Product

`DELETE http://localhost:3000/api/product/{{product_id}}`

Auth: seller/admin

---

# Cart Service

Base URL: `http://localhost:3002/api/cart`

## Health

`GET http://localhost:3002/api/cart/health`

## Add Item

`POST http://localhost:3002/api/cart/items`

Auth: user

Body:

```json
{
  "productId": "{{product_id}}",
  "variantId": "{{variant_id}}",
  "quantity": 2
}
```

If no variant:

```json
{
  "productId": "{{product_id}}",
  "quantity": 1
}
```

## Update Quantity

`PATCH http://localhost:3002/api/cart/items/{{product_id}}`

Auth: user

Body:

```json
{
  "quantity": 3,
  "variantId": "{{variant_id}}"
}
```

Set quantity `0` to remove through update.

## Remove Item

`DELETE http://localhost:3002/api/cart/items/{{product_id}}`

Auth: user

Optional body if variant-specific:

```json
{
  "variantId": "{{variant_id}}"
}
```

## Validate Cart

`POST http://localhost:3002/api/cart/validate`

Auth: user

Body: none

## Cart Status

`GET http://localhost:3002/api/cart/status`

Auth: user

## Get Cart

`GET http://localhost:3002/api/cart/`

Auth: user

## Clear Cart

`DELETE http://localhost:3002/api/cart/`

Auth: user

## Save For Later

`POST http://localhost:3002/api/cart/items/{{product_id}}/save-for-later`

Auth: user

Body:

```json
{
  "variantId": "{{variant_id}}"
}
```

## Get Save For Later

`GET http://localhost:3002/api/cart/save-for-later`

Auth: user

## Move Saved Item To Cart

`POST http://localhost:3002/api/cart/save-for-later/{{product_id}}/move-to-cart`

Auth: user

Body:

```json
{
  "variantId": "{{variant_id}}"
}
```

## Abandoned Cart Scan

`POST http://localhost:3002/api/cart/abandoned/scan`

Auth: admin

Body:

```json
{
  "thresholdMinutes": 60
}
```

---

# Order Service

Base URL: `http://localhost:3003/api/orders`

Important: Order creation uses the user's current cart.

## Create Order

`POST http://localhost:3003/api/orders/`

Auth: user

Body:

```json
{
  "shippingAddress": {
    "street": "123 Main Street",
    "city": "Delhi",
    "state": "Delhi",
    "zip": "110001",
    "country": "India"
  }
}
```

Alternative body accepted:

```json
{
  "address": {
    "addressLine": "123 Main Street",
    "city": "Delhi",
    "state": "Delhi",
    "pincode": "110001",
    "country": "India"
  }
}
```

## My Orders

`GET http://localhost:3003/api/orders/me`

Auth: user

## Get Order By ID

`GET http://localhost:3003/api/orders/{{order_id}}`

Auth: user/admin

## Cancel Order

`POST http://localhost:3003/api/orders/{{order_id}}/cancel`

Auth: user

Body: none

## Update Order Address

`PATCH http://localhost:3003/api/orders/{{order_id}}/address`

Auth: user

Body:

```json
{
  "shippingAddress": {
    "street": "456 New Street",
    "city": "Noida",
    "state": "UP",
    "zip": "201301",
    "country": "India"
  }
}
```

## Update Order Status

`PATCH http://localhost:3003/api/orders/{{order_id}}/status`

Auth: admin/seller

Body:

```json
{
  "status": "PAID",
  "paymentMethod": "upi",
  "paymentId": "{{payment_id}}"
}
```

Possible statuses include:

`PENDING`, `CONFIRMED`, `PAID`, `PACKED`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `EXPIRED`

## Expire Pending Orders

`POST http://localhost:3003/api/orders/expiry/scan`

Auth: admin

Body: optional

```json
{
  "limit": 50
}
```

---

# Payment Service

Base URL: `http://localhost:3004/api/payment`

Aliases: `/api/payments`, `/payments`

## Create Razorpay Payment Order

`POST http://localhost:3004/api/payment/razorpay/order`

Auth: user

Body:

```json
{
  "orderId": "{{order_id}}",
  "method": "upi"
}
```

Alternative route:

`POST http://localhost:3004/api/payment/create/{{order_id}}`

Body:

```json
{
  "method": "upi"
}
```

Response gives Razorpay `orderId`, `keyId`, and local `payment`.

## Verify Payment

`POST http://localhost:3004/api/payment/verify`

Auth: user

Body:

```json
{
  "razorpayOrderId": "order_xxxxxxxxx",
  "paymentId": "pay_xxxxxxxxx",
  "signature": "razorpay_signature_here",
  "method": "upi",
  "transactionId": "pay_xxxxxxxxx"
}
```

## Get Payment By ID

`GET http://localhost:3004/api/payment/{{payment_id}}`

Auth: payment owner user or admin

`payment_id` can be local Mongo `_id` or gateway `paymentId`.

---

# Notification Service

Base URL: `http://localhost:3006/api/notifications`

## Get My Notifications

`GET http://localhost:3006/api/notifications/?page=1&limit=20`

Auth: user/seller/admin

Optional query:

`status=unread&type=payment`

## Get Notification By ID

`GET http://localhost:3006/api/notifications/{{notification_id}}`

Auth: owner/admin

## Mark One Read

`PATCH http://localhost:3006/api/notifications/{{notification_id}}/read`

Auth: owner

Body: none

## Mark All Read

`PATCH http://localhost:3006/api/notifications/read-all`

Auth: user/seller/admin

Body: none

## Create Manual Notification

`POST http://localhost:3006/api/notifications/`

Auth: admin

Body:

```json
{
  "userId": "USER_OBJECT_ID",
  "email": "user@example.com",
  "title": "Manual notification",
  "message": "This is a test notification",
  "channel": "in_app",
  "type": "manual",
  "event": "notification.manual",
  "metadata": {
    "source": "postman"
  }
}
```

For email:

```json
{
  "userId": "USER_OBJECT_ID",
  "email": "user@example.com",
  "title": "Email notification",
  "message": "This is a test email",
  "html": "<p>This is a test email</p>",
  "channel": "email",
  "type": "manual"
}
```

---

# Seller Dashboard Service

Base URL: `http://localhost:3007/api/seller/dashboard`

Alias: `/seller/dashboard`

Auth: seller for all endpoints.

## Metrics

`GET http://localhost:3007/api/seller/dashboard/metrics`

Query:

`?lowStockThreshold=5`

## Conversion Funnel

`GET http://localhost:3007/api/seller/dashboard/analytics/conversion-funnel?days=30`

Optional query:

`from=2026-05-01&to=2026-05-20`

## Product Health

`GET http://localhost:3007/api/seller/dashboard/analytics/product-health?days=30`

## Inventory Movement

`GET http://localhost:3007/api/seller/dashboard/analytics/inventory-movement?days=30`

Returns fast-moving, slow-moving, dead inventory, no-sales classification.

## Top Losing Products

`GET http://localhost:3007/api/seller/dashboard/analytics/top-losing-products?days=30&minViews=20&limit=10`

## Inventory Risk

`GET http://localhost:3007/api/seller/dashboard/analytics/inventory-risk?days=30`

## Inventory Forecast

`GET http://localhost:3007/api/seller/dashboard/analytics/inventory-forecast?days=30`

## Seller Orders

`GET http://localhost:3007/api/seller/dashboard/orders?page=1&limit=10`

Optional:

`status=PAID&paymentStatus=completed`

## Seller Products

`GET http://localhost:3007/api/seller/dashboard/products?page=1&limit=10`

Optional:

`q=mouse&status=active&lowStockOnly=true&lowStockThreshold=5&sort=stock_asc`

Trigger low stock notification:

`GET http://localhost:3007/api/seller/dashboard/products?notify=true`

## Live Feed

`GET http://localhost:3007/api/seller/dashboard/feed?page=1&limit=20`

Optional:

`type=payment.success&read=false`

Mark feed event read:

`PATCH http://localhost:3007/api/seller/dashboard/feed/{{dashboard_event_id}}/read`

## Low Stock Alerts

Get:

`GET http://localhost:3007/api/seller/dashboard/low-stock-alerts?page=1&limit=20`

Optional:

`status=open&read=false`

Mark read:

`PATCH http://localhost:3007/api/seller/dashboard/low-stock-alerts/{{low_stock_alert_id}}/read`

Resolve:

`PATCH http://localhost:3007/api/seller/dashboard/low-stock-alerts/{{low_stock_alert_id}}/resolve`

---

# AI Service

Base URL: `http://localhost:3005/ai`

AI is limited to Ai-VendorHub marketplace/product/seller tasks.

## Health

`GET http://localhost:3005/health`

## Scope

`GET http://localhost:3005/ai/scope`

## Metrics

`GET http://localhost:3005/ai/metrics`

## Feature Flags

Get:

`GET http://localhost:3005/ai/feature-flags`

Update:

`POST http://localhost:3005/ai/feature-flags`

Body:

```json
{
  "LLM_ENABLED": true,
  "LLM_SEARCH_INTENT": true,
  "LLM_REVIEW_SUMMARY": true
}
```

## AI Search Intent

`POST http://localhost:3005/ai/search-intent`

Auth: user

Body:

```json
{
  "query": "show me gaming headphones under 3000"
}
```

## Product Page AI Insights

`GET http://localhost:3005/ai/product/{{product_id}}/insights`

Auth: user

Use this when user opens product detail page. It returns AI summary, review summary, similar products, quick actions, and buying advice.

## AI Chat

`POST http://localhost:3005/ai/chat`

Auth: user

Body:

```json
{
  "message": "I need headphones for gym under 3000",
  "sessionId": "user-session-1"
}
```

## Similar Products

`GET http://localhost:3005/ai/similar/{{product_id}}`

Auth: user

## AI Product Compare

`POST http://localhost:3005/ai/compare`

Auth: user

Body:

```json
{
  "productIds": [
    "{{product_id}}",
    "SECOND_PRODUCT_ID"
  ]
}
```

## Smart Budget Shopping

`POST http://localhost:3005/ai/smart-budget`

Auth: user

Body:

```json
{
  "budget": 5000,
  "purpose": "gaming setup"
}
```

## Mood Shopping

`POST http://localhost:3005/ai/mood-shopping`

Auth: user

Body:

```json
{
  "mood": "minimal study desk setup",
  "maxBudget": 4000
}
```

## Generate Product Description

`POST http://localhost:3005/ai/generate-description`

Auth: currently public

Body:

```json
{
  "title": "Wireless Gaming Mouse",
  "category": "Electronics",
  "basicDescription": "RGB wireless mouse with ergonomic design",
  "price": 1499
}
```

## Suggest Category And Tags

`POST http://localhost:3005/ai/suggest-category-tags`

Auth: currently public

Body:

```json
{
  "title": "Sony Wireless Headphones",
  "description": "Noise cancelling headphones with long battery life"
}
```

## Review Summary

`POST http://localhost:3005/ai/review-summary/{{product_id}}`

Auth: user

Body: none

---

# Socket.IO

## AI Socket

URL:

`ws://localhost:3005`

Auth options:

```js
{
  auth: {
    token: "{{user_token}}"
  }
}
```

Events:

| Client Emits | Body |
|---|---|
| `message` | `{ "message": "show me laptops under 50000" }` |
| `chat` | `{ "message": "recommend shoes for college" }` |

Server emits:

`connected`, `typing`, `response`, `error`

## Seller Dashboard Socket

URL:

`ws://localhost:3007`

Auth:

```js
{
  auth: {
    token: "{{seller_token}}"
  }
}
```

Server emits:

`dashboard.connected`, `dashboard.event`

---

# Common Status/Role Notes

| Role | Use |
|---|---|
| `user` | cart, order, payment, AI buyer APIs, wishlist |
| `seller` | product management, seller dashboard |
| `admin` | admin-only scans/manual notification/status updates |

Common headers:

```http
Content-Type: application/json
Authorization: Bearer {{user_token}}
```

For product image upload:

```http
Content-Type: multipart/form-data
Authorization: Bearer {{seller_token}}
```

## Minimum Functional Demo Checklist

1. `POST http://localhost:3001/api/auth/register`
2. `POST http://localhost:3001/api/auth/login`
3. `POST http://localhost:3001/api/auth/register/seller`
4. `POST http://localhost:3001/api/auth/login/seller`
5. `POST http://localhost:3000/api/product/` with seller token
6. `GET http://localhost:3000/api/product/{{product_id}}`
7. `GET http://localhost:3005/ai/product/{{product_id}}/insights` with user token
8. `POST http://localhost:3002/api/cart/items`
9. `GET http://localhost:3002/api/cart/`
10. `POST http://localhost:3003/api/orders/`
11. `POST http://localhost:3004/api/payment/razorpay/order`
12. `GET http://localhost:3007/api/seller/dashboard/metrics` with seller token

