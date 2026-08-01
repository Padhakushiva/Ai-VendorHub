import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Loader2,
  LockKeyhole,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Smartphone,
  Truck,
  WalletCards,
} from 'lucide-react';
import { useAuthBridge } from '../context/AuthBridgeContext';
import { useCart } from '../context/CartContext';
import { orderApi } from '../services/orderApi';
import { paymentApi } from '../services/paymentApi';

const PAYMENT_METHODS = [
  {
    id: 'upi',
    label: 'UPI',
    detail: 'Fast mobile payment',
    icon: Smartphone,
  },
  {
    id: 'credit_card',
    label: 'Card',
    detail: 'Credit or debit card',
    icon: CreditCard,
  },
  {
    id: 'cod',
    label: 'Cash',
    detail: 'Pay on delivery',
    icon: Banknote,
  },
];

const DELIVERY_OPTIONS = [
  {
    id: 'standard',
    label: 'Standard',
    detail: '3-5 business days',
    price: 'Free',
  },
  {
    id: 'express',
    label: 'Express',
    detail: '1-2 business days',
    price: '₹99',
  },
];

const DEFAULT_ADDRESS = {
  street: '',
  city: '',
  state: '',
  zip: '',
  country: 'India',
};

const formatPrice = (amount, currency = 'INR') => {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  } catch {
    return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
  }
};

const getErrorMessage = (error, fallback) => {
  const validationError = error.response?.data?.errors?.[0]?.msg;
  return validationError || error.response?.data?.message || error.response?.data?.error || error.message || fallback;
};

const getInitialAddress = (user = {}) => {
  if (!user) return DEFAULT_ADDRESS;
  const saved = user.address || user.shippingAddress || {};
  return {
    street: saved.street || saved.addressLine || '',
    city: saved.city || '',
    state: saved.state || '',
    zip: saved.zip || saved.pincode || '',
    country: saved.country || 'India',
  };
};

const SummaryRow = ({ label, value, strong = false }) => (
  <div className={`flex items-center justify-between gap-4 ${strong ? 'text-xl font-black text-stone-950' : 'text-sm font-bold text-stone-600'}`}>
    <span>{label}</span>
    <span className="shrink-0">{value}</span>
  </div>
);

const OptionButton = ({ active, children, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex min-h-[92px] items-center gap-3 rounded-[22px] border border-stone-200 p-4 text-left transition hover:-translate-y-0.5 ${
      active
        ? 'bg-amber-50 shadow-sm'
        : 'bg-white shadow-sm'
    }`}
  >
    {children}
  </button>
);

const Field = ({ label, name, value, onChange, placeholder, autoComplete }) => (
  <label className="block">
    <span className="text-xs font-black uppercase tracking-[0.14em] text-stone-500">{label}</span>
    <input
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      autoComplete={autoComplete}
      className="mt-2 h-12 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-bold text-stone-950 outline-none transition focus:bg-[#fff8d7] focus:shadow-sm"
    />
  </label>
);

function OrderItem({ item }) {
  return (
    <article className="flex gap-3 rounded-[20px] border border-stone-200 bg-white p-3 shadow-sm">
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-stone-200 bg-[#f6f4ee]">
        {item.image ? (
          <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center bg-emerald-700">
            <PackageCheck className="h-7 w-7 text-stone-950" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-black leading-snug text-stone-950">{item.title}</p>
        <p className="mt-1 text-xs font-bold text-black/50">Qty {item.quantity}</p>
      </div>
      <p className="shrink-0 text-sm font-black text-stone-950">{formatPrice(item.lineTotal.amount, item.lineTotal.currency)}</p>
    </article>
  );
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { isAuthenticated, loginUrl, user } = useAuthBridge();
  const { cart, fetchCart, itemCount, loading: cartLoading } = useCart();
  const [address, setAddress] = useState(() => getInitialAddress(user));
  const [delivery, setDelivery] = useState('standard');
  const [method, setMethod] = useState('upi');
  const [agree, setAgree] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [pincodeMessage, setPincodeMessage] = useState('');
  const [lookingUpPincode, setLookingUpPincode] = useState(false);
  const isBuyer = isAuthenticated && user?.role === 'user';

  const totals = cart.totals || {};
  const payableTotal = useMemo(() => (
    Number(totals.total || 0) + (delivery === 'express' ? 99 : 0)
  ), [delivery, totals.total]);

  useEffect(() => {
    if (!user) return;
    setAddress((current) => {
      const hasTypedAddress = Object.keys(DEFAULT_ADDRESS).some((key) => (
        key !== 'country' && current[key]?.trim()
      ));
      return hasTypedAddress ? current : getInitialAddress(user);
    });
  }, [user]);

  useEffect(() => {
    const pincode = address.zip.trim();
    if (pincode.length !== 6) {
      setPincodeMessage('');
      setLookingUpPincode(false);
      return undefined;
    }

    const controller = new AbortController();
    const lookupPincode = async () => {
      try {
        setLookingUpPincode(true);
        setPincodeMessage('Finding district...');
        const response = await fetch(`https://api.zippopotam.us/IN/${pincode}`, {
          signal: controller.signal,
        });
        
        if (!response.ok) {
          setPincodeMessage('No district found for this pincode. You can enter it manually.');
          return;
        }
        
        const data = await response.json();
        const place = data?.places?.[0];

        if (!place) {
          setPincodeMessage('No district found for this pincode. You can enter it manually.');
          return;
        }

        setAddress((current) => ({
          ...current,
          city: place["place name"] || current.city,
          state: place.state || current.state,
          country: data.country || current.country || 'India',
        }));
        setPincodeMessage(`${place["place name"]}, ${place.state} selected`);
      } catch (error) {
        if (error.name !== 'AbortError') {
          setPincodeMessage('Could not auto-select district. You can enter it manually.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLookingUpPincode(false);
        }
      }
    };

    lookupPincode();
    return () => controller.abort();
  }, [address.zip]);

  const handleAddressChange = (event) => {
    const { name, value } = event.target;
    const nextValue = name === 'zip' ? value.replace(/\D/g, '').slice(0, 6) : value;
    setAddress((current) => ({ ...current, [name]: nextValue }));
  };

  const validateAddress = () => {
    const required = ['street', 'city', 'state', 'zip', 'country'];
    const missing = required.find((field) => !address[field]?.trim());
    if (missing) {
      return 'Complete your delivery address before payment.';
    }
    if (!/^\d{6}$/.test(address.zip.trim())) {
      return 'Pincode must be 6 digits.';
    }
    return '';
  };

  const startPayment = async (orderId) => {
    if (method === 'cod') {
      return { skipped: true };
    }

    const response = await paymentApi.post(`/create/${orderId}`, { method });
    const payment = response.data;

    if (!window.Razorpay || !payment.orderId || !payment.keyId) {
      return { ...payment, checkoutPending: true };
    }

    await new Promise((resolve, reject) => {
      const razorpay = new window.Razorpay({
        key: payment.keyId,
        amount: payment.payment?.price?.amount ? payment.payment.price.amount * 100 : undefined,
        currency: payment.payment?.price?.currency || totals.currency || 'INR',
        name: 'Ai-VendorHub',
        description: 'Secure marketplace checkout',
        order_id: payment.orderId,
        prefill: {
          name: user?.username || '',
          email: user?.email || '',
        },
        handler: async (result) => {
          try {
            await paymentApi.post('/verify', {
              razorpayOrderId: result.razorpay_order_id,
              paymentId: result.razorpay_payment_id,
              signature: result.razorpay_signature,
              method,
            });
            resolve();
          } catch (error) {
            reject(error);
          }
        },
        modal: {
          ondismiss: () => reject(new Error('Payment window closed')),
        },
      });
      razorpay.open();
    });

    return payment;
  };

  const handlePlaceOrder = async () => {
    const addressError = validateAddress();
    if (addressError) {
      setMessage(addressError);
      return;
    }
    if (!agree) {
      setMessage('Confirm the secure checkout terms to continue.');
      return;
    }

    try {
      setBusy(true);
      setMessage('');
      const orderResponse = await orderApi.post('/', {
        shippingAddress: {
          ...address,
          zip: address.zip.trim(),
        },
        deliveryOption: delivery,
      });
      const order = orderResponse.data?.order;
      const orderId = order?._id || order?.id;
      if (!orderId) {
        throw new Error('Order created without an id.');
      }
      const paymentResult = await startPayment(orderId);
      if (paymentResult.skipped || !paymentResult.checkoutPending) {
        navigate(`/order-success/${orderId}`);
      } else {
        setMessage('Order placed and payment order created. Add the Razorpay checkout script to open the payment window.');
      }
      await fetchCart();
    } catch (error) {
      setMessage(getErrorMessage(error, 'Unable to complete checkout right now.'));
    } finally {
      setBusy(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f6f4ee] px-3 py-8 sm:px-6 lg:px-10">
        <section className="mx-auto max-w-3xl rounded-[30px] border border-stone-200 bg-white p-8 text-center shadow-sm">
          <LockKeyhole className="mx-auto h-11 w-11 text-[#006b4f]" />
          <h1 className="mt-4 text-3xl font-black text-stone-950">Login to checkout</h1>
          <a href={loginUrl} className="mt-6 inline-flex items-center gap-2 rounded-full border border-stone-200 bg-emerald-700 px-6 py-3 text-sm font-black text-stone-950 shadow-sm transition hover:-translate-y-0.5">
            Login <ChevronRight className="h-4 w-4" />
          </a>
        </section>
      </div>
    );
  }

  if (!isBuyer) {
    return (
      <div className="min-h-screen bg-[#f6f4ee] px-3 py-8 sm:px-6 lg:px-10">
        <section className="mx-auto max-w-3xl rounded-[30px] border border-stone-200 bg-white p-8 text-center shadow-sm">
          <ShieldCheck className="mx-auto h-11 w-11 text-[#c0392b]" />
          <h1 className="mt-4 text-3xl font-black text-stone-950">Buyer checkout only</h1>
          <p className="mt-2 font-bold text-stone-500">Switch to a buyer account before placing an order.</p>
        </section>
      </div>
    );
  }

  if (!cartLoading && cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-[#f6f4ee] px-3 py-8 sm:px-6 lg:px-10">
        <section className="mx-auto max-w-3xl rounded-[30px] border border-stone-200 bg-white p-8 text-center shadow-sm">
          <PackageCheck className="mx-auto h-12 w-12 text-[#006b4f]" />
          <h1 className="mt-4 text-3xl font-black text-stone-950">Your cart is empty</h1>
          <Link to="/" className="mt-6 inline-flex items-center gap-2 rounded-full border border-stone-200 bg-amber-50 px-6 py-3 text-sm font-black text-stone-950 shadow-sm transition hover:-translate-y-0.5">
            Continue shopping <ChevronRight className="h-4 w-4" />
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f4ee] px-3 py-8 sm:px-6 lg:px-10">
      <section className="mx-auto max-w-7xl">
        <button
          type="button"
          onClick={() => navigate('/cart')}
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-black text-stone-950 shadow-sm transition hover:-translate-y-0.5"
        >
          <ArrowLeft className="h-4 w-4" />
          Cart
        </button>

        <div className="overflow-hidden rounded-[34px] border border-stone-200 bg-[#151515] text-white shadow-sm">
          <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[1fr_320px] lg:items-end">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border-[2px] border-white bg-emerald-700 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-stone-950">
                <LockKeyhole className="h-4 w-4" />
                Secure checkout
              </span>
              <h1 className="mt-5 max-w-3xl text-4xl font-black leading-none sm:text-5xl">
                Payment details for your order.
              </h1>
              <p className="mt-3 max-w-2xl text-base font-bold text-white/65">
                Confirm delivery, choose payment, and place your order from the products already in your cart.
              </p>
            </div>
            <div className="rounded-[24px] border-[2px] border-white bg-amber-50 p-5 text-stone-950 shadow-[5px_5px_0_rgba(255,255,255,0.18)]">
              <p className="text-xs font-black uppercase tracking-[0.18em]">Payable</p>
              <p className="mt-1 text-4xl font-black">{formatPrice(payableTotal, totals.currency)}</p>
              <p className="mt-1 text-xs font-black text-stone-500">{itemCount} item{itemCount === 1 ? '' : 's'} ready</p>
            </div>
          </div>
        </div>


        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_390px]">
          <div className="space-y-6">
            <section className="rounded-[30px] border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl border border-stone-200 bg-blue-50">
                  <MapPin className="h-5 w-5 text-stone-950" />
                </span>
                <div>
                  <h2 className="text-2xl font-black text-stone-950">Delivery address</h2>
                  <p className="text-sm font-bold text-black/50">Used by the order service as shippingAddress.</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Field label="Street" name="street" value={address.street} onChange={handleAddressChange} placeholder="House no, street, area" autoComplete="street-address" />
                </div>
                <div>
                  <Field label="Pincode" name="zip" value={address.zip} onChange={handleAddressChange} placeholder="110001" autoComplete="postal-code" />
                  {pincodeMessage && (
                    <p className="mt-2 inline-flex items-center gap-2 text-xs font-black text-[#006b4f]">
                      {lookingUpPincode && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      {pincodeMessage}
                    </p>
                  )}
                </div>
                <Field label="District / City" name="city" value={address.city} onChange={handleAddressChange} placeholder="District" autoComplete="address-level2" />
                <Field label="State" name="state" value={address.state} onChange={handleAddressChange} placeholder="State" autoComplete="address-level1" />
                <Field label="Country" name="country" value={address.country} onChange={handleAddressChange} placeholder="India" autoComplete="country-name" />
              </div>
            </section>

            <section className="rounded-[30px] border border-stone-200 bg-blue-50 p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl border border-stone-200 bg-white">
                  <Truck className="h-5 w-5 text-stone-950" />
                </span>
                <h2 className="text-2xl font-black text-stone-950">Delivery speed</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {DELIVERY_OPTIONS.map((option) => (
                  <OptionButton key={option.id} active={delivery === option.id} onClick={() => setDelivery(option.id)}>
                    <Truck className="h-6 w-6 shrink-0 text-stone-950" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-black text-stone-950">{option.label}</span>
                      <span className="block text-sm font-bold text-stone-500">{option.detail}</span>
                    </span>
                    <span className="text-sm font-black text-stone-950">{option.price}</span>
                  </OptionButton>
                ))}
              </div>
            </section>

            <section className="rounded-[30px] border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl border border-stone-200 bg-amber-50">
                  <WalletCards className="h-5 w-5 text-stone-950" />
                </span>
                <div>
                  <h2 className="text-2xl font-black text-stone-950">Payment method</h2>
                  <p className="text-sm font-bold text-black/50">Online methods can launch Razorpay when keys are configured.</p>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                {PAYMENT_METHODS.map((option) => {
                  const Icon = option.icon;
                  return (
                    <OptionButton key={option.id} active={method === option.id} onClick={() => setMethod(option.id)}>
                      <Icon className="h-6 w-6 shrink-0 text-stone-950" />
                      <span>
                        <span className="block text-base font-black text-stone-950">{option.label}</span>
                        <span className="block text-xs font-bold text-stone-500">{option.detail}</span>
                      </span>
                    </OptionButton>
                  );
                })}
              </div>
            </section>
          </div>

          <aside className="h-fit rounded-[30px] border border-stone-200 bg-white p-5 shadow-sm lg:sticky lg:top-32">
            <div className="rounded-[24px] border border-stone-200 bg-amber-50 p-5 text-stone-950">
              <p className="text-xs font-black uppercase tracking-[0.18em]">Review order</p>
              <h2 className="mt-2 text-3xl font-black">Checkout</h2>
            </div>

            <div className="mt-5 max-h-[340px] space-y-3 overflow-auto pr-1">
              {cart.items.map((item) => <OrderItem key={item.id} item={item} />)}
            </div>

            <div className="mt-5 space-y-4">
              <SummaryRow label="Subtotal" value={formatPrice(totals.subtotal, totals.currency)} />
              <SummaryRow label="Discount" value={formatPrice(totals.discount, totals.currency)} />
              <SummaryRow label="GST / tax" value={formatPrice(totals.tax, totals.currency)} />
              <SummaryRow label="Shipping" value={delivery === 'express' ? formatPrice(99, totals.currency) : (Number(totals.shipping || 0) === 0 ? 'Free' : formatPrice(totals.shipping, totals.currency))} />
              <div className="h-px bg-black/15" />
              <SummaryRow label="Total" value={formatPrice(payableTotal, totals.currency)} strong />
            </div>

            <label className="mt-5 flex items-start gap-3 rounded-[18px] border border-stone-200 bg-[#f6f4ee] p-4">
              <input
                type="checkbox"
                checked={agree}
                onChange={(event) => setAgree(event.target.checked)}
                className="mt-1 h-5 w-5 accent-[#006b4f]"
              />
              <span className="text-sm font-bold leading-snug text-stone-600">
                I confirm the address, cart items, and secure payment details for this order.
              </span>
            </label>

            {message && (
              <div className="mt-4 rounded-[18px] border border-stone-200 bg-[#fff8d7] p-4 text-sm font-black text-stone-950">
                {message}
              </div>
            )}

            <button
              type="button"
              disabled={busy || cart.items.length === 0}
              onClick={handlePlaceOrder}
              className="mt-5 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full border border-stone-200 bg-emerald-700 px-5 text-sm font-black text-stone-950 shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <BadgeCheck className="h-5 w-5" />}
              {method === 'cod' ? 'Place COD order' : 'Place order and pay'}
            </button>

            <div className="mt-5 flex items-center gap-3 rounded-[18px] bg-[#151515] p-4 text-white">
              <ShieldCheck className="h-5 w-5 shrink-0 text-[#24c486]" />
              <p className="text-xs font-bold text-white/70">Protected checkout with authenticated order and payment service calls.</p>
            </div>
          </aside>
        </div>
      </section>

    </div>
  );
}
