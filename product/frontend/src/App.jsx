import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ProductProvider } from './context/ProductContext';
import { AuthBridgeProvider } from './context/AuthBridgeContext';
import { CartProvider } from './context/CartContext';
import Home from './pages/Home';
import ProductDetail from './pages/ProductDetail';
import AdminPortal from './pages/AdminPortal';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import SellerWorkspace from './components/SellerWorkspace';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import './App.css';

function AppContent() {
  const location = useLocation();
  const isWorkspaceRoute = ['/seller-dashboard', '/admin-dashboard'].includes(location.pathname);

  return (
    <div className="min-h-screen flex flex-col bg-[linear-gradient(135deg,#fbfaf7_0%,#f3efe5_48%,#eef5ed_100%)]">
      {!isWorkspaceRoute && <Navbar />}
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/seller-dashboard" element={<SellerWorkspace standalone />} />
          <Route path="/admin-dashboard" element={<AdminPortal />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
        </Routes>
      </main>
      {!isWorkspaceRoute && <Footer />}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthBridgeProvider>
        <ProductProvider>
          <CartProvider>
            <AppContent />
          </CartProvider>
        </ProductProvider>
      </AuthBridgeProvider>
    </BrowserRouter>
  );
}

export default App;
