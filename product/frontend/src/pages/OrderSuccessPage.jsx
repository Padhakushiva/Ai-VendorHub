import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, Package, ArrowRight, Truck, MapPin } from 'lucide-react';
import { orderApi } from '../services/orderApi';
import { useAuthBridge } from '../context/AuthBridgeContext';

export default function OrderSuccessPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuthBridge();

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true);
        const response = await orderApi.get(`/${id}`);
        setOrder(response.data?.order || response.data);
      } catch (err) {
        setError('Could not load order details.');
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="bg-red-50 text-red-600 p-6 rounded-2xl shadow-sm text-center max-w-md w-full">
          <h2 className="text-xl font-bold mb-2">Oops!</h2>
          <p>{error || 'Order not found'}</p>
          <Link to="/" className="mt-6 inline-block bg-stone-900 text-white px-6 py-2 rounded-full font-medium hover:bg-stone-800 transition">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-12 pb-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          {/* Success Header Area */}
          <div className="bg-emerald-50 p-8 sm:p-12 text-center border-b border-emerald-100">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-emerald-100 rounded-full mb-6">
              <CheckCircle className="w-12 h-12 text-emerald-600" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-emerald-950 tracking-tight mb-4">
              Payment Successful!
            </h1>
            <p className="text-emerald-700 text-lg font-medium max-w-lg mx-auto">
              Your order #{order._id?.slice(-8).toUpperCase()} has been placed successfully and is now being processed.
            </p>
          </div>

          {/* Order Details Area */}
          <div className="p-8 sm:p-12 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-stone-50 rounded-2xl p-6 border border-stone-100">
                <div className="flex items-center gap-3 text-stone-900 font-bold mb-4">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                  Delivery Address
                </div>
                <div className="text-stone-600 space-y-1">
                  <p className="font-medium text-stone-900">{user?.username || 'Customer'}</p>
                  <p>{order.shippingAddress?.street}</p>
                  <p>{order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.zip}</p>
                  <p>{order.shippingAddress?.country}</p>
                </div>
              </div>

              <div className="bg-stone-50 rounded-2xl p-6 border border-stone-100">
                <div className="flex items-center gap-3 text-stone-900 font-bold mb-4">
                  <Truck className="w-5 h-5 text-emerald-600" />
                  Order Summary
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-stone-600">
                    <span>Subtotal</span>
                    <span>₹{order.totals?.subtotal?.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>Tax</span>
                    <span>₹{order.totals?.tax?.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>Shipping</span>
                    <span>{order.totals?.shipping ? `₹${order.totals.shipping}` : 'Free'}</span>
                  </div>
                  <div className="pt-3 border-t border-stone-200 flex justify-between items-center font-bold text-stone-900">
                    <span>Total</span>
                    <span className="text-xl">₹{order.totals?.total?.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-stone-900 text-lg flex items-center gap-2">
                <Package className="w-5 h-5" /> Items Ordered
              </h3>
              <div className="bg-stone-50 rounded-2xl p-2 border border-stone-100 divide-y divide-stone-100">
                {order.items?.map((item, index) => (
                  <div key={index} className="flex items-center gap-4 p-4">
                    <div className="w-16 h-16 bg-white rounded-xl overflow-hidden border border-stone-200 shrink-0">
                      {item.image ? (
                        <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-stone-100 flex items-center justify-center text-stone-400">
                          <Package className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <div className="flex-grow">
                      <h4 className="font-semibold text-stone-900 line-clamp-1">{item.title}</h4>
                      <p className="text-stone-500 text-sm">Qty: {item.quantity}</p>
                    </div>
                    <div className="font-semibold text-stone-900">
                      ₹{item.finalPrice?.amount?.toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-8 flex flex-col sm:flex-row gap-4 items-center justify-center">
              <Link 
                to="/orders" 
                className="w-full sm:w-auto px-8 py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
              >
                View My Orders
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link 
                to="/" 
                className="w-full sm:w-auto px-8 py-4 bg-stone-100 text-stone-900 rounded-xl font-bold hover:bg-stone-200 transition flex items-center justify-center text-center"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
