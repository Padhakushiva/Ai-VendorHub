import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Clock, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { orderApi } from '../services/orderApi';
import { useAuthBridge } from '../context/AuthBridgeContext';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isAuthenticated } = useAuthBridge();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const response = await orderApi.get('/me');
        // Sort by newest first
        const ordersList = response.data?.orders || response.data || [];
        const validOrders = ordersList.filter(o => o.status !== 'PENDING' && o.status !== 'EXPIRED');
        const sortedOrders = Array.isArray(validOrders) ? [...validOrders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) : [];
        setOrders(sortedOrders);
      } catch (err) {
        setError('Could not load your orders. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchOrders();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold mb-4">Please log in to view your orders</h2>
        <Link to="/" className="bg-emerald-600 text-white px-6 py-2 rounded-full font-medium hover:bg-emerald-700 transition">
          Return to Home
        </Link>
      </div>
    );
  }

  const getStatusIcon = (status) => {
    switch (status?.toUpperCase()) {
      case 'DELIVERED':
      case 'COMPLETED':
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'CANCELLED':
      case 'FAILED':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-amber-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'DELIVERED':
      case 'COMPLETED':
        return 'bg-emerald-100 text-emerald-700';
      case 'CANCELLED':
      case 'FAILED':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-amber-100 text-amber-700';
    }
  };

  return (
    <div className="min-h-screen pt-8 pb-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-white rounded-2xl shadow-sm">
          <Package className="w-8 h-8 text-emerald-600" />
        </div>
        <h1 className="text-3xl font-black text-stone-900 tracking-tight">My Orders</h1>
      </div>

      {error ? (
        <div className="bg-red-50 text-red-600 p-6 rounded-2xl shadow-sm">
          {error}
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-stone-100">
          <Package className="w-16 h-16 mx-auto text-stone-300 mb-4" />
          <h2 className="text-xl font-bold text-stone-900 mb-2">No orders yet</h2>
          <p className="text-stone-500 mb-6">Looks like you haven't placed any orders.</p>
          <Link to="/" className="inline-block bg-emerald-600 text-white px-8 py-3 rounded-full font-bold hover:bg-emerald-700 transition">
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div key={order._id} className="bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden hover:shadow-md transition">
              <div className="p-6 sm:p-8 flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between border-b border-stone-100 bg-stone-50/50">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-stone-900 text-lg">Order #{order._id?.slice(-8).toUpperCase()}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                      {order.status || 'PENDING'}
                    </span>
                  </div>
                  <p className="text-stone-500 text-sm">Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div className="text-left sm:text-right w-full sm:w-auto flex flex-row sm:flex-col justify-between items-center sm:items-end">
                  <p className="text-sm text-stone-500 mb-1">Total Amount</p>
                  <p className="font-black text-xl text-stone-900">₹{order.totals?.total?.toLocaleString('en-IN')}</p>
                </div>
              </div>
              
              <div className="p-6 sm:p-8">
                <div className="flex flex-wrap gap-4 mb-6">
                  {order.items?.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-stone-50 rounded-2xl p-3 pr-6 border border-stone-100">
                      <div className="w-12 h-12 bg-white rounded-xl overflow-hidden border border-stone-200 shrink-0">
                        {item.image ? (
                          <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-stone-100 flex items-center justify-center text-stone-400">
                            <Package className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-stone-900 text-sm line-clamp-1 max-w-[200px]">{item.title}</p>
                        <p className="text-stone-500 text-xs">Qty: {item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-end">
                  <Link 
                    to={`/order-success/${order._id}`} 
                    className="flex items-center gap-2 text-emerald-600 font-bold hover:text-emerald-700 transition"
                  >
                    View Order Details
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
