import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ProductProvider } from './context/ProductContext';
import { AuthBridgeProvider } from './context/AuthBridgeContext';
import Home from './pages/Home';
import ProductDetail from './pages/ProductDetail';
import SellerWorkspace from './components/SellerWorkspace';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import './App.css';

function AppContent() {
  const location = useLocation();
  const isSellerDashboard = location.pathname === '/seller-dashboard';

  return (
    <div className="min-h-screen flex flex-col bg-[#050716]">
      {!isSellerDashboard && <Navbar />}
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/seller-dashboard" element={<SellerWorkspace standalone />} />
          <Route path="/product/:id" element={<ProductDetail />} />
        </Routes>
      </main>
      {!isSellerDashboard && <Footer />}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthBridgeProvider>
        <ProductProvider>
          <AppContent />
        </ProductProvider>
      </AuthBridgeProvider>
    </BrowserRouter>
  );
}

export default App;
