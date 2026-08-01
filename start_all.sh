#!/bin/bash
npm run dev --prefix order > order.log 2>&1 &
npm run dev --prefix Auth > auth.log 2>&1 &
npm run dev --prefix Auth/frontend > auth-frontend.log 2>&1 &
npm run dev --prefix Notification > notification.log 2>&1 &
npm run dev --prefix Payment > payment.log 2>&1 &
npm run dev --prefix product > product.log 2>&1 &
npm run dev --prefix product/frontend > product-frontend.log 2>&1 &
npm run dev --prefix ai > ai.log 2>&1 &
npm run dev --prefix cart > cart.log 2>&1 &
npm run dev --prefix Seller_dashboard > seller-dashboard.log 2>&1 &
echo "All services started."
wait
