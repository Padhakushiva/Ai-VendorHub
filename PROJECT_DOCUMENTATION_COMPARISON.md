# Ai-VendorHub Project vs Final Documentation Comparison

Source documentation: `/Users/shivachoudhry/Downloads/Project_Documentation.pdf`  
Project reviewed: `/Users/shivachoudhry/Downloads/Ai-VendorHub`  
Date: 2026-05-09  

## Scope

Is comparison me Docker/deployment part include nahi kiya gaya hai. Matlab ECR, ECS Fargate, ALB, Target Groups, Dockerfile, Docker Compose, container deployment, etc. ko evaluate nahi kiya gaya.

Ye document sirf application-level features compare karta hai:

| Area | Included? |
|---|---|
| Backend microservices | Yes |
| API endpoints | Yes |
| Database schemas/entities | Yes |
| Auth/security logic | Yes |
| RabbitMQ events | Yes |
| AI Buddy features | Yes |
| Seller Dashboard | Yes |
| Testing status | Yes |
| Docker/deployment | No |

## Overall Summary

Ai-VendorHub ka backend kaafi major features cover karta hai. Project me Auth, Product, Cart, Order, Payment, Notification, Seller Dashboard aur AI services available hain. Documentation ke comparison me core marketplace flow mostly implemented hai, but kuch features partial hain aur kuch production-level features missing hain.

| Category | Current Status | Short Remark |
|---|---|---|
| Auth | Mostly implemented | Register/login/logout/me/address/profile update/Google login/refresh token available; separate user/seller auth routes accepted |
| Product | Strongly implemented | CRUD, search/filter/sort/pagination, seller RBAC, ImageKit create/update, soft delete/archive, lifecycle events, and tests available |
| Cart | Strongly implemented | Add/update/remove/get/clear available; qty alias, route fix, product snapshot refresh, variant-aware cart lines |
| Order | Mostly implemented | Create/get/cancel/update address available; inventory reservation missing |
| Payment | Partially implemented | Razorpay create/verify available; payment fetch and idempotency missing |
| Notification | Partially implemented | Email events available; notification entity/status tracking missing |
| AI Buddy | Strong coverage | Many AI features implemented, more than documentation in some areas |
| Seller Dashboard | Implemented | Metrics/orders/products available, but integration risks exist |
| Frontend | Missing | React/Vite/RTK Query frontend not found |
| Security | Mostly implemented | JWT/RBAC/Helmet/CORS/Auth rate limiting available; CSRF and XSS sanitize still pending |
| Testing | Partial | Auth/Product/Cart/Order tested; Payment/Notification/Seller/AI weak |

## Service-by-Service Difference Table

## 1. Auth Service

| Point | Documentation Requirement | Current Ability | Difference / Gap | After Fully Implemented Ability | Example |
|---|---|---|---|---|---|
| Register user/seller | User aur seller registration available ho | User register: `/api/auth/register`, seller register: `/api/auth/register/seller` | No gap; separate routes ko accepted design maana gaya hai | User aur seller dono clearly isolated registration flow se create honge | Current: customer `/api/auth/register` hit karta hai; seller `/api/auth/register/seller` hit karta hai |
| Login | Email/password login for user and seller | User login: `/api/auth/login`, seller login: `/api/auth/login/seller` | No gap; separate routes ko accepted design maana gaya hai | User aur seller login flows clear, maintainable aur role-specific rahenge | Current: customer `/api/auth/login`; seller `/api/auth/login/seller` |
| Logout | `POST /auth/logout`, refresh session revoke | `GET /api/auth/logout` aur `POST /api/auth/logout` dono available hain; refresh session Redis se revoke hota hai | Documentation se mostly match; old GET route backward compatibility ke liye present hai | Logout idempotent POST hoga, refresh token revoke hoga, cookie clear hogi | Current: POST logout refresh session revoke karta hai; GET old clients ke liye still works |
| Current user | `GET /auth/me` | `/api/auth/me` implemented | Mostly matching | User/seller profile consistently return hoga | Current: user ke liye addresses return hote hain, seller ke liye nahi |
| Profile update | `PATCH /auth/users/me` | `/api/auth/users/me` implemented with `user.updated` event | Mostly matching | User apna name/profile update kar paayega aur standardized event emit hoga | Current: user firstName/lastName/email/username update kare to `user.updated` publish hota hai |
| Address management | List/add/delete addresses | List/add/delete addresses implemented for users | Seller addresses blocked; documentation seller/customer distinction clear nahi karti | Address APIs complete validation ke saath stable rahengi | Current: user address add/delete kar sakta hai |
| Token model | Access token + refresh token, httpOnly refresh cookie | Access token + Redis-backed refresh token implemented; refresh token httpOnly cookie me set hota hai | Mostly matching; exact expiry/config production env par depend karega | Secure session system hoga: short access token + refresh cookie | Current: `/api/auth/refresh` se new access token aur rotated refresh cookie milti hai |
| Session limit | Documentation me explicit limit nahi hai | 5 active refresh sessions per user implemented | Extra security feature | Oldest session 6th login par revoke ho jayega | Current: user 6th device se login kare to first device ka refresh token invalid ho jata hai |
| Logout all devices | Documentation me explicit nahi, but session management me useful | `/api/auth/logout-all` implemented | Extra security feature | User all devices se logout kar paayega | Current: one request se all refresh sessions revoke ho jate hain |
| Google login | Passport Google auth | `/api/auth/google` and `/api/auth/google/callback` implemented | Matching, Google env vars required | User Google account se login/register kar paayega | Current: "Login with Google" backend OAuth flow trigger karta hai |
| Email verification | Email verification expected in mature auth | Register ke baad verification token/email flow implemented: `/api/auth/verify-email/request`, `/api/auth/verify-email/:token` | Extra production feature | User email verify kar paayega | Current: verification email/link generate hota hai, token verify karne par `emailVerified=true` |
| Password reset | Forgot/reset password expected in mature auth | `/api/auth/password/forgot` and `/api/auth/password/reset/:token` implemented | Extra production feature | User email reset link se password change kar paayega | Current: reset ke baad active refresh sessions revoke ho jate hain |
| Events | `user.created`, `user.updated` | User/seller register, Google signup/link, profile update, email verify, address change par standardized events publish hote hain | Matching for Auth user events | Analytics/notification/seller dashboard services ko consistent event payload milega | Current: queue `AUTH_NOTIFICATION.user.created`/`AUTH_SELLER_DASHBOARD.user.updated` use hoti hai, payload me `event: "user.created"` ya `event: "user.updated"` hota hai |

Auth status: Strongly implemented for fresher/final-year project. Refresh token, Google login, profile update, POST logout, 5-session limit, logout-all, email verification, password reset, Auth rate limiting, and standardized `user.created`/`user.updated` events now available hain. Separate user/seller register-login routes accepted design hain. Main pending item CSRF and XSS sanitization hai.

## 2. Product Service

| Point | Documentation Requirement | Current Ability | Difference / Gap | After Fully Implemented Ability | Example |
|---|---|---|---|---|---|
| Base route | Documentation me `/products` style paths hain | Existing `/api/product` ke saath `/api/products` aur `/products` aliases bhi available hain | Matching; old clients ke liye `/api/product` bhi rakha gaya hai | Frontend/docs kisi bhi accepted prefix se hit kar sakte hain | Current: `GET /api/product`, `GET /api/products`, `GET /products` |
| Product list | Search, advanced filters, pagination, sort | `GET /api/product` supports `q`, `category`, `brand`, `tag`, `minprice/minPrice`, `maxprice/maxPrice`, `rating`, `availability`, `status`, `skip`, `limit`, `page`, and `sort` | Matching | Catalog listing searchable, filterable, sortable aur pagination metadata ke saath ready hai | Current: `GET /products?q=phone&availability=in_stock&rating=4&sort=price_asc` |
| Product detail | `GET /products/:id` with seller info and availability | `GET /api/product/:id` implemented; seller ref populate attempt karta hai; response me computed `availability` top-level field milta hai | Mostly matching; populated seller actual User data/ref availability par depend karega | Product detail me seller basic info aur stock badge value dono mil sakte hain | Current: response me `availability: "in_stock" | "low_stock" | "out_of_stock"` |
| Product create | Seller product create with required fields and images | `POST /api/product` seller/admin protected hai; title, price, stock, category, brand, tags validation; ImageKit upload up to 5 images; status `active` set hota hai | Matching | Seller clean product listing image upload aur `product.created` event ke saath create kar paayega | Current: seller multipart form-data me images bhej kar product create karta hai |
| Product update | Seller own product update, admin any product update | `PATCH /api/product/:id` ownership check karta hai; fields, status, add images, replace images, and `removeImageIds` support karta hai | Matching; ImageKit delete best-effort hai | Seller product content aur images fully manage kar paayega | Current: `replaceImages=true` se old images replace; `removeImageIds` se selected images remove |
| Product delete | Soft delete/archive if orders exist, otherwise safe delete | `DELETE /api/product/:id` ownership check karta hai; orders exist hone par `status=archived`, otherwise hard delete | Matching | Order history safe rahegi aur unused products DB se remove ho sakte hain | Current: orders wale product ka `deletionType: "soft"`; no-order product ka `deletionType: "hard"` |
| Seller products | Seller apne products list kare | `GET /api/product/seller` same filters, sort, pagination, and status support ke saath implemented hai | Matching | Seller dashboard/listing me searchable, sortable, paginated inventory milegi | Current: seller `GET /api/product/seller?status=active&sort=stock_asc` hit kar sakta hai |
| Product schema | Product name/title, description, price, category, stock, images, seller, timestamps/status, variants, rating, specs, metrics | Schema me `title`, `description`, nested `price`, multi-currency, `category`, `tags`, `brand`, `images`, `seller ref`, `stock`, `variants`, `specifications`, `rating`, `metrics`, `status`, `orders`, timestamps available hain | Matching; docs agar `name` bolti hain to implementation me field `title` hai | Product lifecycle, variant stock, rating aur popularity score track hota hai | Current: product variants me SKU/color/size/RAM/storage/price/stock store hota hai |
| Product variants | Color/RAM/storage/size variants with SKU stock price | `POST /api/product/:id/variants` and `PATCH /api/product/:id/variants/:variantId` implemented | Matching | Seller same product ke multiple configurations manage kar sakta hai | Example: iPhone red 128GB aur blue 256GB alag stock/price ke saath |
| Compare products | Multiple product ids compare ho | `GET /api/product/compare?ids=id1,id2,id3` implemented | Matching | Frontend side-by-side table bana sakta hai | Example: price, brand, stock, rating, specs compare |
| Recently viewed | User ke recently viewed products Redis me track ho | `POST /api/product/:id/view` and `GET /api/product/recently-viewed` implemented using product cache/Redis fallback | Matching | User profile/homepage par latest viewed products dikhenge | Example: user product page open kare to id `recently_viewed:userId` me save hoti hai |
| Related products | Same category/brand/tags/price range products suggest ho | `GET /api/product/:id/related` implemented | Matching | Product detail page par similar products show honge | Example: mobile product ke neeche same brand/category phones |
| Trending products | Views/wishlist/cart/order score se popular products | `GET /api/product/trending` implemented; `popularityScore = views + wishlist*2 + cartAdds*3 + orders*5` | Matching; cart/order metrics future events se aur improve ho sakte hain | Trending listing popularity score ke according sort hogi | Example: wishlist/view badhne par product trending me upar aa sakta hai |
| Wishlist | User product save/remove/list kare | `POST /api/product/wishlist/:productId`, `DELETE /api/product/wishlist/:productId`, `GET /api/product/wishlist` implemented | Matching | User future purchase ke liye products save kar sakta hai | Example: wishlist add se product metric increment hota hai |
| Product cache | Product list/detail cache ho aur update/delete par clear ho | Redis-backed Product cache implemented hai with in-memory fallback; list/detail/seller-list cache hoti hai, create/update/delete par affected keys clear hote hain | Matching; Redis unavailable ho to service memory fallback use karta hai | Product browse fast hoga aur stale product data avoid hoga | Current: `GET /api/product` second hit cache se aa sakta hai; update ke baad `products:list`, `product:<id>`, `products:seller:<sellerId>` clear hote hain |
| Events | `product.created`, `product.updated`, `product.deleted` | Product create/update/delete Notification aur Seller Dashboard queues ko publish hote hain; payload me standardized `event` field hota hai | Matching; queue names service-specific rakhe gaye hain for RabbitMQ routing | Consumers common product lifecycle event payload reliably consume karenge | Current: payload me `event: "product.updated"` aur `productId`, `sellerId`, price, images, status jata hai |
| Tests | Product APIs covered by Jest | Product Jest suite green hai: 9 suites, 221 tests pass | Matching | Regression safety strong rahegi | Current: advanced Product tests cover variants, compare, views, related, trending, wishlist, model calculations |

Product status: Strongly implemented. Current implementation me product CRUD, seller/admin RBAC, search/filter/sort/pagination, seller populate support, ImageKit create/update/remove flow, soft delete/archive, timestamps/status, Redis/in-memory cache, variants, compare products, recently viewed, related products, trending products, wishlist, availability status, and standardized `product.created`/`product.updated`/`product.deleted` payloads available hain. Documentation se practical difference mainly field naming (`title` vs `name`) ka hai.

## 3. Cart Service

| Point | Documentation Requirement | Current Ability | Difference / Gap | After Fully Implemented Ability | Example |
|---|---|---|---|---|---|
| Get cart | `GET /cart` | `/api/cart` and `/cart` route available; health route `/health` par moved hai | Matching; duplicate route shadow issue fixed | Authenticated cart reliably return hoga | Current: `GET /api/cart` cart deta hai, `GET /api/cart/health` health deta hai |
| Add item | `POST /cart/items` with `{ productId, qty }` | `/api/cart/items` accepts `{ productId, quantity }` and `{ productId, qty }`; variantId bhi supported hai | Matching | API documentation aur implementation same hain | Example: `{ productId, qty: 2 }` ya `{ productId, quantity: 2, variantId }` |
| Update item | `PATCH /cart/items/:productId` | Implemented with stock validation, qty/quantity support, variant-aware matching | Matching | Quantity update stock validation ke saath stable hoga | Example: quantity 1 se 3 karne par Product Service se stock check hota hai |
| Remove item | `DELETE /cart/items/:productId` | Implemented; optional `?variantId=` support | Matching | Direct remove item endpoint available hai | Current: `DELETE /api/cart/items/:productId` item remove karta hai |
| Clear cart | `DELETE /cart` | Implemented | Matching | User full cart clear kar paayega | Example: checkout cancel karne par cart empty |
| Price recompute | Product Service se fresh price/stock validate | Implemented; `GET /cart` snapshots refresh karta hai aur totals fresh Product Service se recalculate hote hain | Matching | Cart tampering aur stale price/stock avoid hoga | Current: product price badle to next cart fetch/update par snapshot/totals refresh hote hain |
| Price snapshot | Item add time price aur latest price track ho | `priceAtAdded`, `currentPrice`, `priceChanged` implemented | Matching with new guide | User ko checkout se pehle price change clearly dikhega | Example: item Rs.100 me add hua, product Rs.120 hua to cart `priceChanged: true` show karega |
| Validate before checkout | `POST /cart/validate` se stock, active product, price, quantity validate ho | Implemented; issues ke saath `cartStatus` return hota hai | Matching | Order create se pehle invalid cart block/review ho sakta hai | Example: stock khatam hai to `out_of_stock` issue return hoga |
| Save for later | Item active cart se remove karke saved list me store ho | `POST /cart/items/:productId/save-for-later`, `GET /cart/save-for-later`, move-back endpoint implemented | Matching plus move-back extra | User item delete kiye bina later ke liye rakh sakta hai | Example: shoes cart se save-for-later me move, baad me cart me wapas |
| Cart status | `healthy`, `needs_review`, `out_of_stock`, `invalid_items` status | `GET /cart/status` implemented | Matching | Frontend status ke basis par warning/checkout block kar sakta hai | Example: price change ho to `needs_review` |
| Cart health details | `cartIssues` list with issue type/message | Authenticated `GET /cart/health` implemented; public health backward compatible hai | Matching | Exact problematic product identify hoga | Example: `{ issueType: "price_changed", message: "Price changed..." }` |
| Cart events | `cart.item_added`, `cart.item_removed`, `cart.quantity_updated`, `cart.checked_out`, `cart.abandoned` | RabbitMQ publisher added; item add/remove/update, checkout validation, and admin abandoned-cart scan events emit hote hain | Matching | Analytics/notification services cart events consume kar sakengi | Example: add item par `cart.item_added`, inactive cart scan par `cart.abandoned` publish |
| Totals | totalAmount | Detailed totals: subtotal, discount, tax, shipping, total, currency | Implementation documentation se better detailed hai | Order service bhi same totals use karega | Current: cart subtotal/tax/shipping/total consistently calculate hota hai |
| Variant support | Product variants cart me add ho sake | `variantId` cart line me supported hai with variant price/stock snapshot | Extra production feature | User exact color/RAM/storage variant cart me add kar sakta hai | Example: same phone ka 128GB aur 256GB variant separate cart lines ban sakte hain |

Cart status: Strongly implemented. Duplicate route issue fixed, dedicated delete-item endpoint added, `qty` alias supported, product snapshots refreshed, totals recomputed from Product Service, variant-aware cart lines, price snapshot, checkout validation, save-for-later, status/health details, and optional RabbitMQ cart events available hain.

## 4. Order Service

| Point | Documentation Requirement | Current Ability | Difference / Gap | After Fully Implemented Ability | Example |
|---|---|---|---|---|---|
| Create order | `POST /orders` from current cart | `/api/orders` implemented; cart validate/fetch, product stock check, variant/item snapshot, totals, payment summary, timeline, and reservation event flow available | Matching | Order creation complete with cart validation and inventory reservation event | Current: cart items se order banta hai, `order.created` aur inventory reserve request publish hota hai |
| Get my orders | `GET /orders/me` | Implemented | Matching | User paginated order history dekh paayega | Example: user apne last 10 orders dekh sakta hai |
| Get order by id | `GET /orders/:id` with timeline/payment summary | Implemented with `timeline` and `paymentSummary` response | Matching | Order detail me payment status aur lifecycle timeline dikhegi | Example: `created -> inventory_reserved -> cancelled` timeline |
| Cancel order | `POST /orders/:id/cancel` | Implemented for PENDING orders; cancel timeline, inventory release event, and `order.cancelled` event added | Matching | Cancel ke baad inventory release aur event publish hoga | Current: status `CANCELLED`, reservation `RELEASED`, event publish |
| Update address | `PATCH /orders/:id/address` | Implemented for PENDING orders | Matching mostly | Payment capture se pehle address update possible | Example: user wrong pincode fix kar sakta hai |
| Taxes/shipping | Create order computes taxes/shipping | Order stores `totals` with subtotal, discount, tax, shipping, total, currency and aligns `totalPrice` with final total | Matching | Cart total and order total aligned honge | Example: item subtotal 100, tax/shipping add hoke final total store hota hai |
| Immutable snapshots | Product update ke baad old order data change nahi hona chahiye | Order item me title, image, variant, quantity, unitPrice, finalPrice, and productSnapshot stored hai | Matching with Order guide | Historical order bill same rahega even product price/name/image later change ho | Example: product Rs.100 par order hua, later Rs.120 ho gaya, old order Rs.100 hi show karega |
| State machine | `pending -> paid -> packed -> shipped -> delivered`, invalid transition blocked | `PATCH /api/orders/:id/status` implemented with transition validation | Matching | Seller/admin valid lifecycle hi update kar sakte hain | Example: `PENDING -> DELIVERED` directly 409 return karega |
| Auto expiry | Unpaid pending orders fixed time ke baad expire ho aur inventory release ho | `orderExpiry` schema and `POST /api/orders/expiry/scan` implemented | Matching | Pending unpaid order expire hote hi inventory release event/timeline update hoga | Example: expired pending order ka status `EXPIRED`, reservation `RELEASED` |
| Lifecycle events | `order.created`, `order.paid`, `order.cancelled`, `order.expired`, `order.shipped`, `order.delivered` | Lifecycle event publisher added; created/status/cancel/expire events supported with safe RabbitMQ skip | Matching | Notification, analytics, dashboard async updates consume kar sakte hain | Example: status `SHIPPED` update par `order.shipped` event publish |
| Runtime stability | Service should start cleanly | App starts cleanly with Helmet/CORS and route mounted at `/api/orders`; broker safely skips when RabbitMQ URL missing | Matching | Local tests/dev RabbitMQ ke bina bhi crash nahi karega | Example: tests me RabbitMQ absent hone par order APIs still pass |

Order status: Strongly implemented for project level. Create order, immutable snapshots, inventory reservation/release, paginated history, order detail with timeline/payment summary, cancel flow, address update, state-machine status updates, auto expiry, tax/shipping totals, safe RabbitMQ lifecycle events, and test coverage available hain.

## 5. Payment Service

| Point | Documentation Requirement | Current Ability | Difference / Gap | After Fully Implemented Ability | Example |
|---|---|---|---|---|---|
| Razorpay order create | `POST /payments/razorpay/order` | Implemented; old `/api/payment/create/:orderId` and docs-style `/payments/razorpay/order` aliases available | Matching | Documentation-aligned payment API available hai | Example: same feature old and docs route dono se kaam karega |
| Verify payment | `POST /payments/verify` | Implemented; `/api/payment/verify`, `/api/payments/verify`, and `/payments/verify` available | Matching | Signature verification stable hai | Current: Razorpay signature verify karta hai |
| Fetch payment | `GET /payments/:id` | Implemented with buyer/admin RBAC | Matching | Buyer/admin payment status fetch kar paayenge | Example: user apna payment dekh sakta hai, admin any payment dekh sakta hai |
| Idempotency | Same cart/order ke liye duplicate payment order avoid | Implemented; existing pending payment reuse hota hai | Matching | Same unpaid order ke liye existing payment return hota hai | Example: double-click par duplicate Razorpay order nahi banega |
| Payment status | pending/completed/failed/refunded | pending/completed/failed/refunded supported | Matching | Refund lifecycle support hoga | Example: refund hone par status `refunded` store ho sakta hai |
| Method/transaction | method and transactionId store ho | `method`, `transactionId`, and `gatewayPayload` fields available | Matching | Payment audit trail complete rahega | Example: UPI payment me method `upi`, transactionId Razorpay payment id |
| Response shape | `{ orderId, keyId }` return | Create payment response me `orderId`, `keyId`, and payment object return hota hai | Matching | Razorpay checkout ke liye direct usable response milega | Current: frontend ko `orderId` aur `keyId` directly milte hain |
| Events | `payment.success`, `payment.failed` | Standardized `payment.success` and `payment.failed` lifecycle events publish hote hain | Matching | Notification/Order services clear payment events consume karenge | Example: success par `PAYMENT_EVENTS.PAYMENT_LIFECYCLE` me `event: "payment.success"` jata hai |

Payment status: Strongly implemented for project level. Razorpay order creation, verification, server-side amount, idempotency, payment fetch with buyer/admin RBAC, method/transaction storage, refund status, checkout-friendly response, and standardized `payment.success`/`payment.failed` events available hain. Remaining polish direct order-status sync consumer side par depend karega.

## 6. Notification Service

| Point | Documentation Requirement | Current Ability | Difference / Gap | After Fully Implemented Ability | Example |
|---|---|---|---|---|---|
| Event listening | Major events listen kare | Auth, product, payment old queues plus standardized `payment.success`/`payment.failed` lifecycle events supported hain | Mostly matching | Service important events consume karke persistent notifications banata hai | Example: payment success par email + notification record |
| Email | Email notifications | Nodemailer email implemented with delivery persistence | Matching | Templates aur delivery tracking ke saath robust emails | Current: user created par welcome email and DB notification |
| SMS/push | SMS, push, in-app notification | Schema me `sms`, `push`, `in_app`, `email` channels supported; delivery implementation currently email/in-app focused | Partial | Future SMS/push providers attach ho sakte hain | Example: manual/admin notification `in_app` channel me save ho sakta hai |
| Delivery status | Track pending/sent/failed | Implemented: `pending`, `sent`, `failed`, `skipped` | Matching | Notification DB me status save hota hai | Example: failed email retry ke liye status `failed` save hota hai |
| Notification entity | Notification model/schema | Implemented with user/email/title/message/html/type/event/status/deliveryStatus/metadata | Matching | Notification collection maintain hoti hai | Example: user apni notifications history dekh sakta hai |
| Notification APIs | User history/read APIs | `GET /notifications`, `GET /notifications/:id`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`, admin `POST /notifications` implemented | Extra production feature | User read/unread manage kar sakta hai | Example: notification center me unread count show hoga |

Notification status: Strongly implemented for project level. Persistent notification model, email delivery tracking, user notification history, read/read-all APIs, admin manual notification creation, safe RabbitMQ listener startup, and standardized payment event handling available hain.

## 7. AI Buddy Service

| Point | Documentation Requirement | Current Ability | Difference / Gap | After Fully Implemented Ability | Example |
|---|---|---|---|---|---|
| Natural language search | "Find me red sneakers under 2000" parse kare | `/ai/search-intent` implemented | Good | Product Service se better integrated shopping search | Current: query parse karke products search kar sakta hai |
| Chat assistant | Personal shopping assistant | `/ai/chat` implemented | More than documentation | Conversational shopping flow stable hoga | Example: user asks "budget laptop suggest karo" |
| Create cart | AI user ke behalf par cart create/add kare | Clearly exposed endpoint nahi mila | Missing/unclear | AI directly cart me recommended products add kar sakega | After: "ye shoes cart me add kar do" se cart update hoga |
| Recommendations | Similar products | `/ai/similar/:productId` implemented | Extra feature | Better discovery | Example: selected phone ke similar phones |
| Product comparison | Compare multiple products | `/ai/compare` implemented | Extra feature | User buying decision easy hogi | Example: two laptops compare by price/specs |
| Smart budget | Budget optimize | `/ai/smart-budget` implemented | Extra feature | Budget ke andar best bundle suggest karega | Example: 5000 me desk setup products |
| Mood shopping | Mood/intent based products | `/ai/mood-shopping` implemented | Extra feature | Lifestyle-based shopping | Example: "minimal desk setup" products |
| Product description | AI product description | `/ai/generate-description` implemented | Extra feature for sellers | Seller listing improve hogi | Example: title/brand se SEO description generate |
| Review summary | Review summary | Endpoint exists, Review entity missing | Data source incomplete | Real reviews se summary banegi | After: product reviews se pros/cons summary |

AI status: Strong coverage. Documentation se zyada AI features implemented hain, but cart action and real review integration pending hain.

## 8. Seller Dashboard Service

| Point | Documentation Requirement | Current Ability | Difference / Gap | After Fully Implemented Ability | Example |
|---|---|---|---|---|---|
| Metrics | Sales, revenue, top products | `/seller/dashboard/metrics` implemented | Aggregation exists, but model consistency risk hai | Accurate seller revenue dashboard | Current: seller sales/revenue calculate karne ki logic hai |
| Seller orders | Seller ke product wale orders | `/seller/dashboard/orders` implemented | Payment population current Order schema se mismatch ho sakta hai | Seller clean order list dekh paayega with payment status | After: seller dekhega kaunsa order paid/pending hai |
| Products inventory | Seller products + stock | `/seller/dashboard/products` implemented | Good | Inventory management stable hoga | Example: seller apne low stock products dekh sakta hai |
| Low stock alerts | Low stock alerts | Implemented with optional email/db fallback | Good extension | Automated low-stock notification | After: stock <= threshold par seller ko alert |
| Event-driven sync | order/product/payment events consume | Some models/events exist, but consistency uncertain | Event sync standardize karna hoga | Dashboard real-time-ish accurate hoga | After: payment success ke baad dashboard revenue update |
| Tests | Reliable tests | Test script placeholder | Missing tests | Dashboard aggregation tests available honge | After: metrics calculation automatically tested |

Seller Dashboard status: Implemented, but integration and testing improve karna zaroori hai.

## 9. Frontend / React App

| Point | Documentation Requirement | Current Ability | Difference / Gap | After Fully Implemented Ability | Example |
|---|---|---|---|---|---|
| React/Vite frontend | React + Vite + RTK Query | No frontend found | Full frontend missing | User-facing marketplace UI available hoga | After: user products browse, cart manage, checkout UI se kar sakega |
| RTK Query | API data fetching layer | Missing | Frontend absent | Central API state management | After: product list auto cache/refetch with RTK Query |
| Buyer UI | Browse, cart, order, payment | Missing | Backend-only currently | Complete customer journey UI | Example: product page -> add to cart -> checkout |
| Seller UI | Product management/dashboard | Missing | Backend APIs only | Seller dashboard frontend | Example: seller revenue graph and inventory table |

Frontend status: Missing. Current project backend-focused hai.

## Entity / Schema Difference Table

| Entity | Documentation Schema | Current Schema | Difference | After Fully Implemented Ability | Example |
|---|---|---|---|---|---|
| User | userId, name, email, passwordHash, role, address, timestamps | username, email, password, fullName, role, addresses | No timestamps, role names different, seller separate model | Unified and consistent account model | User profile clean audit fields ke saath |
| Seller | Documentation me separate entity nahi, role-based seller | Separate seller model | Design difference | Either unified user-role model or documented seller model | Seller auth/profile consistent hoga |
| Product | name, description, price, category, stock, images, timestamps | title, description, nested price, multi-currency, category, tags, brand, images, seller ref, stock, status, orders, timestamps | Mostly matching; docs me `name`, implementation me `title` hai | Product lifecycle active/inactive/archived status ke saath track hota hai | Product active se archived ho sakta hai |
| Cart | cartId, userId, items, totalAmount, updatedAt | user, items, productSnapshot, detailed totals, timestamps | Current schema more detailed | Cart and order totals sync honge | Cart subtotal/tax/shipping shown |
| Order | user, items, totalAmount, status, shippingAddress, timestamps | user, items, totalPrice, status, shippingAddress, timestamps | Mostly matching, status uppercase | Payment/timeline integration added | Order detail with payment summary |
| Payment | orderId, userId, amount, method, status, transactionId | order, user, Razorpay IDs, signature, price, status | No method/refund status | Complete payment lifecycle | UPI/card/COD method track |
| Notification | userId, type, message, status, createdAt | Missing | Entity absent | Notification history and retry tracking | User sees "Payment successful" notification |
| Review | productId, userId, rating, comment, createdAt | Missing | Entity absent | Product ratings and AI summaries | Product has 4.5 rating and review summary |

## Security Difference Table

| Security Feature | Documentation Requirement | Current Ability | Gap | After Fully Implemented Ability | Example |
|---|---|---|---|---|---|
| JWT | Access + refresh token | Access token + refresh token implemented | Mostly matching | Secure session refresh | Access token expire, refresh cookie renews it |
| HttpOnly cookie | Required for refresh | Refresh token httpOnly cookie me set hota hai | Matching | Refresh cookie more secure | Frontend cannot read refresh token |
| RBAC | User/seller/admin access | Role middleware exists | Admin role inconsistent with Auth schema | Consistent roles | Admin product moderation |
| Helmet | Security headers | Implemented in all service apps | Mostly matching | Safer HTTP headers | `X-Content-Type-Options`, CSP etc. |
| CORS | Configured CORS | Implemented in all service apps with `CORS_ORIGIN` support | Mostly matching | Controlled frontend origin | Only frontend domain allowed |
| CSRF | Double-submit CSRF | Missing | Cookie auth CSRF risk | CSRF token validation | Unsafe POST blocked without CSRF token |
| XSS sanitize | Server-side sanitize HTML | Missing | Input sanitization incomplete | Malicious HTML cleaned | `<script>` in profile blocked |
| Rate limit | Redis-backed rate limit | Auth-sensitive endpoints have rate limiting; currently in-process limiter | Partial vs Redis-backed requirement | Login/API rate limits | Too many login attempts blocked |
| Google OAuth | Passport Google | Implemented | Matching, Google credentials required | Google login works | User signs in with Google |

## RabbitMQ/Event Difference Table

| Event Area | Documentation Requirement | Current Ability | Gap | After Fully Implemented Ability | Example |
|---|---|---|---|---|---|
| User events | `user.created`, `user.updated` | Auth user/seller create/update events standardized | Auth matching; other domain events still need consistency | Analytics/dashboard/notification receives user lifecycle updates | Profile update, email verify, Google link, address change par `user.updated` |
| Product events | `product.created/updated/deleted` | Product create/update/delete publish hote hain; payload me standardized `event` field hai | Matching; RabbitMQ queue names service-specific hain | All services common product lifecycle payload consume kar sakte hain | Dashboard product create/update/delete sync karta hai |
| Order events | `order.created`, `order.cancelled` | Order created event for dashboard | Cancel event missing | Notification/dashboard/inventory react to order changes | Cancel order releases stock |
| Payment events | `payment.success`, `payment.failed` | Payment events publish | Names/meaning inconsistent | Order status updates from payment success | Payment success confirms order |
| Notification subscriptions | Subscribe to all major events | Selected events only | Coverage partial | Full notification automation | Order created email sent |
| Cart product update sync | Product price/stock update ke baad cart stale na rahe | Cart `GET/update/add` par Product Service se fresh data validate/recompute karta hai | Matching for request-time sync; async RabbitMQ consumer optional future optimization hai | Cart stale snapshots avoid karega | Product price changed, cart fetch par totals recalculate |

## Testing Difference Table

| Service | Current Tests | Status | What Is Missing | After Fully Implemented Ability |
|---|---|---|---|---|
| Auth | Jest tests exist, including profile update, Google config safety, refresh rotation, 5-session limit, logout-all | Good | More production edge cases like real Google callback mocking and Redis outage behavior | Auth flow fully verified |
| Product | Jest tests + coverage; 6 suites / 196 tests pass | Good | Future edge cases ke liye more integration tests useful honge | Product lifecycle verified |
| Cart | Jest tests available: add/update/remove/get/clear/route behavior | Good | More integration tests with real Product Service useful honge | Cart APIs reliable |
| Order | Jest tests exist | Good | Inventory reservation, payment summary, event tests | Order lifecycle reliable |
| Payment | Test script placeholder | Weak | Create/verify/fetch/idempotency tests | Payment safer for real use |
| Notification | Test script placeholder | Weak | Event listener and email/status tests | Notification delivery testable |
| Seller Dashboard | Test script placeholder | Weak | Metrics/orders/low stock tests | Dashboard calculations reliable |
| AI | Manual/integration files, test script placeholder | Weak | Normal Jest/integration suite | AI endpoints regression-tested |

## Important Issues Found

| Issue | File/Area | Current Impact | Recommended Fix |
|---|---|---|---|
| Undefined `router` in order app | `order/src/app.js` | Order service startup break ho sakta hai | `router.get` ko remove ya `app.get` me convert karo |
| Product soft/hard delete | Product controller | Fixed: orders exist hone par archive, otherwise hard delete | Future me real Order relation se integration test add karo |
| Payment route mismatch | Payment routes | Documentation/frontend integration confusion | Documented route aliases add karo |
| Payment fetch missing | Payment service | User payment status retrieve nahi kar sakta | `GET /payments/:id` add karo |
| Notification entity missing | Notification service | Delivery tracking possible nahi | Notification model and status tracking add karo |
| Frontend missing | Repo root | Final MERN requirement incomplete | React/Vite frontend add karo if required |

## Current Ability vs Final Ability Examples

| User Story | Current Ability | After Fully Implemented Ability |
|---|---|---|
| Customer account create karta hai | User register/login kar sakta hai | User register/login + refresh session + Google login use kar sakta hai |
| Customer product search karta hai | Search/filter/sort/pagination/status + Redis/in-memory cache available | Same ability frontend UI ke saath aur polished ho sakti hai |
| Customer cart me item add karta hai | Stock validate hota hai, totals calculate hote hain, dedicated remove item API available hai | Frontend UI ke saath flow aur polished hoga |
| Customer order place karta hai | Cart se order create hota hai aur cart clear hota hai | Order create hote hi stock reserve/reduce, tax/shipping carry, events publish |
| Customer payment karta hai | Razorpay order create aur verify hota hai | Idempotent payment, fetch status, refund status, order auto-confirm |
| User notification receive karta hai | Kuch email events milte hain | Email/SMS/push/in-app notifications with delivery status |
| Seller product manage karta hai | Product create/update/delete/list, image update, soft delete, sort, dashboard sync available | Low stock automation add hone par seller ko proactive alerts milenge |
| Seller dashboard dekhta hai | Metrics/orders/products endpoints available | Accurate payment-aware dashboard with tested aggregations |
| AI se shopping help leta hai | Search/chat/recommend/compare/budget/mood features available | AI products cart me add kar sakega aur real reviews summarize karega |

## Priority Roadmap

| Priority | Work | Reason |
|---|---|---|
| 1 | Add missing payment fetch API | Documentation alignment ke liye zaroori |
| 2 | Add CSRF and XSS sanitization | Security and final documentation maturity |
| 3 | Add Product low-stock alerts / inventory automation | Seller ko stock khatam hone se pehle alert milega |
| 4 | Add Payment idempotency and response alignment | Razorpay frontend integration better hoga |
| 5 | Add Notification and Review entities | PDF schemas complete honge |
| 6 | Standardize remaining Order/Payment RabbitMQ event names | Services ke beech communication clean hoga |
| 7 | Add request logging and observability | Production debugging easier hoga |
| 8 | Add missing tests for Payment/Notification/Seller/AI | Final project reliability improve hogi |
| 9 | Build React/Vite frontend if required | MERN project complete hoga |

## Final Conclusion

Ai-VendorHub ka backend foundation strong hai. Core marketplace flow kaafi had tak available hai: user auth, product management, cart, order, Razorpay payment base, notification emails, seller dashboard, aur advanced AI shopping features.

Documentation ke comparison me main difference ye hai ki project abhi backend-focused hai aur production-ready/documentation-perfect level tak kuch features pending hain. Fully implemented version me system zyada secure, standardized, frontend-ready, event-driven, test-covered aur real-world marketplace jaisa behave karega.

Short me: current project working backend marketplace hai; fully implemented version complete MERN marketplace platform banega with secure auth, frontend UI, stronger payment flow, persistent notifications/reviews, and standardized service communication.
