import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { productApi } from '../services/productApi';
import {
  BadgeCheck,
  Heart,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Phone,
  Plus,
  Save,
  Sparkles,
  Trash2,
  User,
  X,
} from 'lucide-react';

const GREEN = '#24c486';
const BLUE = '#dbeafe';
const PRODUCT_APP_URL = import.meta.env.VITE_PRODUCT_APP_URL || 'http://localhost:5174';

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

const getProductImage = (product = {}) => {
  const first = product.image || product.images?.[0];
  return typeof first === 'string' ? first : first?.url || first?.thumbnail || '';
};

const normalizeWishlistItem = (row = {}) => {
  const product = row.product || row;
  const id = product._id || product.id;
  if (!id) return null;

  return {
    id,
    wishlistId: row._id || row.id,
    title: product.title || product.name || 'Saved product',
    category: product.category || 'General',
    brand: product.brand || 'VendorHub',
    image: getProductImage(product),
    priceAmount: Number(product.price?.amount ?? product.priceAmount ?? product.amount ?? 0),
    currency: product.price?.currency || product.currency || 'INR',
    inStock: product.availability ? product.availability !== 'out_of_stock' : Number(product.stock || 0) > 0,
  };
};

const Profile = () => {
  const {
    user,
    logout,
    updateProfile,
    addAddress,
    deleteAddress,
    requestVerification,
  } = useAuth();
  const { showNotification } = useNotification();

  const [activeTab, setActiveTab] = useState('overview');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState(user?.fullName?.firstName || '');
  const [lastName, setLastName] = useState(user?.fullName?.lastName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [phone, setPhone] = useState('');
  const [addingAddress, setAddingAddress] = useState(false);
  const [savedItems, setSavedItems] = useState([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [savedError, setSavedError] = useState('');

  if (!user) return null;

  const isSeller = user.role === 'seller';
  const accountType = isSeller ? 'Merchant' : 'Buyer';
  const displayName = `${user.fullName?.firstName || ''} ${user.fullName?.lastName || ''}`.trim() || user.username;
  const initials = getInitials(user);
  const addressCount = user.addresses?.length || 0;
  const primaryAddress = user.addresses?.[0];

  const navItems = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'profile', label: 'Profile', icon: Mail },
    { id: 'saved', label: 'Saved', icon: Heart },
    { id: 'addresses', label: 'Addresses', icon: MapPin, hidden: isSeller },
  ].filter((item) => !item.hidden);

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    if (!firstName || !lastName || !username || !email) {
      showNotification('Please fill in all profile fields', 'error');
      return;
    }

    setSavingProfile(true);
    const result = await updateProfile({
      username,
      email,
      fullName: { firstName, lastName },
    });
    setSavingProfile(false);

    if (result.success) {
      showNotification('Profile updated successfully!', 'success');
      setIsEditing(false);
    } else {
      showNotification(result.message || 'Profile update failed', 'error');
    }
  };

  const handleLogout = async () => {
    if (!window.confirm('Are you sure you want to logout?')) return;
    await logout();
  };

  const handleRequestVerification = async () => {
    setSendingVerification(true);
    const result = await requestVerification();
    setSendingVerification(false);
    showNotification(result.message || 'Verification email request completed', result.success ? 'success' : 'error');
  };

  const handleProfilePincodeChange = async (val) => {
    const clean = val.replace(/\D/g, '').slice(0, 6);
    setPincode(clean);

    if (clean.length === 6) {
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${clean}`);
        const data = await res.json();
        if (data?.[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
          const po = data[0].PostOffice[0];
          const autoCity = po.District || po.Block || po.Name || '';
          const autoState = po.State || '';
          if (autoCity) setCity(autoCity);
          if (autoState) setState(autoState);
          showNotification(`📍 Auto-filled City: ${autoCity}, State: ${autoState}`, 'info');
        }
      } catch (err) {
        console.warn('Pincode fetch failed:', err);
      }
    }
  };

  const handleAddAddress = async (event) => {
    event.preventDefault();
    if (!addressLine || !city || !state || !pincode || !phone) {
      showNotification('Please fill in all address fields', 'error');
      return;
    }
    if (!/^\d{6}$/.test(pincode)) {
      showNotification('Pincode must be exactly 6 digits', 'error');
      return;
    }
    if (!/^\d{10}$/.test(phone)) {
      showNotification('Phone number must be exactly 10 digits', 'error');
      return;
    }

    setAddingAddress(true);
    const result = await addAddress({ addressLine, city, state, pincode, phone });
    setAddingAddress(false);

    if (result.success) {
      showNotification('Address added successfully!', 'success');
      setShowAddressModal(false);
      setAddressLine('');
      setCity('');
      setState('');
      setPincode('');
      setPhone('');
    } else {
      showNotification(result.message || 'Failed to add address', 'error');
    }
  };

  const handleDeleteAddress = async (addressId) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return;
    const result = await deleteAddress(addressId);
    showNotification(result.success ? 'Address deleted successfully' : result.message || 'Failed to delete address', result.success ? 'success' : 'error');
  };

  const fetchSavedItems = useCallback(async () => {
    try {
      setSavedLoading(true);
      setSavedError('');
      const response = await productApi.get('/api/product/wishlist');
      const rows = Array.isArray(response.data?.data) ? response.data.data : [];
      setSavedItems(rows.map(normalizeWishlistItem).filter(Boolean));
    } catch (error) {
      const message = error.response?.data?.message || 'Unable to load wishlist';
      setSavedError(message);
      setSavedItems([]);
    } finally {
      setSavedLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'saved') {
      fetchSavedItems();
    }
  }, [activeTab, fetchSavedItems]);

  const handleRemoveSavedItem = async (productId) => {
    try {
      await productApi.delete(`/api/product/wishlist/${productId}`);
      setSavedItems((current) => current.filter((item) => item.id !== productId));
      showNotification('Removed from wishlist', 'success');
    } catch (error) {
      showNotification(error.response?.data?.message || 'Failed to remove wishlist item', 'error');
    }
  };

  const renderContent = () => {
    if (activeTab === 'overview') {
      return (
        <div className="space-y-6">
          <HeroCard
            displayName={displayName}
            email={user.email}
            accountType={accountType}
            verified={user.emailVerified}
            initials={initials}
          />

          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard icon={User} label="Account" value={accountType} tone="green" />
            <MetricCard icon={BadgeCheck} label="Email" value={user.emailVerified ? 'Verified' : 'Pending'} tone={user.emailVerified ? 'green' : 'yellow'} />
            <MetricCard icon={MapPin} label="Addresses" value={isSeller ? 'Seller mode' : `${addressCount} saved`} tone="blue" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <PremiumPanel title="Profile Summary" icon={User}>
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoTile label="Name" value={displayName} />
                <InfoTile label="Username" value={user.username} />
                <InfoTile label="Email" value={user.email} />
                <InfoTile label="Provider" value={user.authProvider || 'local'} />
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <PrimaryButton onClick={() => setActiveTab('profile')}>Edit profile</PrimaryButton>
                {!user.emailVerified && <SecondaryButton onClick={handleRequestVerification}>{sendingVerification ? 'Sending...' : 'Send verification email'}</SecondaryButton>}
              </div>
            </PremiumPanel>

            <PremiumPanel title="Quick Actions" icon={Sparkles}>
              <div className="space-y-3">
                <QuickAction icon={Heart} title="Saved Items" text="Synced with product wishlist" onClick={() => setActiveTab('saved')} />
                {!isSeller && <QuickAction icon={MapPin} title="Addresses" text={primaryAddress ? `${primaryAddress.city}, ${primaryAddress.state}` : 'Add delivery address'} onClick={() => setActiveTab('addresses')} />}
              </div>
            </PremiumPanel>
          </div>
        </div>
      );
    }

    if (activeTab === 'profile') {
      return (
        <div className="space-y-6">
          <PageIntro title="Profile Information" text="Manage the identity details stored in Auth Service." />
          <PremiumPanel title="Personal Details" icon={User}>
            <form onSubmit={handleSaveProfile} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <ProfileInput label="First Name" value={firstName} onChange={setFirstName} disabled={!isEditing} />
                <ProfileInput label="Last Name" value={lastName} onChange={setLastName} disabled={!isEditing} />
                <ProfileInput label="Username" value={username} onChange={setUsername} disabled={!isEditing} />
                <ProfileInput label="Email Address" value={email} onChange={setEmail} type="email" disabled={!isEditing} />
              </div>
              <div className="flex flex-wrap gap-3">
                <SecondaryButton onClick={() => setIsEditing((value) => !value)}>{isEditing ? 'Cancel' : 'Edit Profile'}</SecondaryButton>
                {isEditing && (
                  <PrimaryButton disabled={savingProfile} submit>
                    <Save className="h-4 w-4" /> {savingProfile ? 'Saving...' : 'Save changes'}
                  </PrimaryButton>
                )}
              </div>
            </form>
          </PremiumPanel>
        </div>
      );
    }

    if (activeTab === 'saved') {
      return (
        <div className="space-y-6">
          <PageIntro title="Wishlist" text="Products saved from the main store are synced here automatically." action={<PrimaryButton onClick={fetchSavedItems}>{savedLoading ? 'Syncing...' : 'Refresh wishlist'}</PrimaryButton>} />
          {savedError && (
            <div className="rounded-[22px] border border-stone-200 bg-[#fff8d7] p-4 text-sm font-black text-stone-950 shadow-sm">
              {savedError}
            </div>
          )}
          {savedLoading ? (
            <PremiumPanel title="Loading wishlist" icon={Heart}>
              <p className="text-sm font-bold text-stone-500">Fetching saved products from Product Service...</p>
            </PremiumPanel>
          ) : savedItems.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {savedItems.map((item) => <SavedItemCard key={item.id} item={item} onDelete={() => handleRemoveSavedItem(item.id)} />)}
            </div>
          ) : (
            <EmptyState icon={Heart} title="No wishlist items yet" text="Tap the Save button on any product page and it will appear here." />
          )}
        </div>
      );
    }

    if (activeTab === 'addresses') {
      return (
        <div className="space-y-6">
          <PageIntro title="Shipping Addresses" text="Manage premium delivery cards for checkout." action={<PrimaryButton onClick={() => setShowAddressModal(true)}><Plus className="h-4 w-4" /> Add address</PrimaryButton>} />
          {user.addresses?.length ? (
            <div className="grid gap-5 md:grid-cols-2">
              {user.addresses.map((addr) => <AddressCard key={addr._id} address={addr} onDelete={() => handleDeleteAddress(addr._id)} />)}
            </div>
          ) : (
            <EmptyState icon={MapPin} title="No address added" text="Add your first shipping address for checkout and delivery." action="Add address" onAction={() => setShowAddressModal(true)} />
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-[#f6f4ee] p-3 text-stone-950 sm:p-5 lg:p-8">
      <div className="mx-auto grid max-w-[1440px] gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <button type="button" onClick={() => setMobileSidebarOpen(true)} className="inline-flex h-12 w-fit items-center gap-2 rounded-full border border-stone-200 bg-amber-50 px-5 text-sm font-black shadow-sm lg:hidden">
          <Menu className="h-4 w-4" />
          Menu
        </button>

        <ProfileSidebar
          activeTab={activeTab}
          accountType={accountType}
          displayName={displayName}
          email={user.email}
          initials={initials}
          navItems={navItems}
          onLogout={handleLogout}
          onNavigate={setActiveTab}
        />

        <main className="min-w-0 space-y-6">
          {renderContent()}
        </main>
      </div>

      {mobileSidebarOpen && (
        <MobileSidebar
          activeTab={activeTab}
          accountType={accountType}
          displayName={displayName}
          email={user.email}
          initials={initials}
          navItems={navItems}
          onClose={() => setMobileSidebarOpen(false)}
          onLogout={handleLogout}
          onNavigate={(tab) => {
            setActiveTab(tab);
            setMobileSidebarOpen(false);
          }}
        />
      )}

      {showAddressModal && (
        <Modal title="Add shipping address" onClose={() => setShowAddressModal(false)}>
          <form onSubmit={handleAddAddress} className="space-y-4">
            <ProfileInput label="Address Line" value={addressLine} onChange={setAddressLine} placeholder="Street details" />
            <div className="grid gap-4 sm:grid-cols-2">
              <ProfileInput label="City" value={city} onChange={setCity} placeholder="Delhi" />
              <ProfileInput label="State" value={state} onChange={setState} placeholder="Delhi" />
              <ProfileInput label="Pincode" value={pincode} onChange={handleProfilePincodeChange} placeholder="110001" maxLength={6} />
              <ProfileInput label="Phone" value={phone} onChange={(value) => setPhone(value.replace(/\D/g, '').slice(0, 10))} placeholder="9876543210" maxLength={10} />
            </div>
            <PrimaryButton submit disabled={addingAddress} full>{addingAddress ? 'Adding...' : 'Add address'}</PrimaryButton>
          </form>
        </Modal>
      )}

    </div>
  );
};

const ProfileSidebar = ({ activeTab, accountType, displayName, email, initials, navItems, onLogout, onNavigate }) => (
  <aside className="hidden h-fit rounded-[34px] border border-stone-200 bg-white p-5 shadow-sm lg:sticky lg:top-5 lg:block">
    <SidebarIdentity initials={initials} displayName={displayName} email={email} accountType={accountType} />
    <nav className="mt-5 space-y-2">
      {navItems.map((item) => <SideButton key={item.id} item={item} active={activeTab === item.id} onClick={() => onNavigate(item.id)} />)}
      <button type="button" onClick={onLogout} className="mt-3 flex h-12 w-full items-center gap-3 rounded-2xl border border-stone-200 bg-rose-50 px-4 text-left text-sm font-black text-stone-950 shadow-sm transition hover:-translate-y-0.5">
        <LogOut className="h-5 w-5" />
        Log out
      </button>
    </nav>
  </aside>
);

const MobileSidebar = ({ activeTab, accountType, displayName, email, initials, navItems, onClose, onLogout, onNavigate }) => (
  <div className="fixed inset-0 z-50 bg-black/55 p-4 backdrop-blur-sm lg:hidden">
    <aside className="h-full w-[88vw] max-w-sm overflow-auto rounded-[30px] border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-2xl font-black text-stone-950">VendorHub</p>
        <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-2xl border border-stone-200 bg-amber-50">
          <X className="h-5 w-5" />
        </button>
      </div>
      <SidebarIdentity initials={initials} displayName={displayName} email={email} accountType={accountType} compact />
      <nav className="mt-5 space-y-2">
        {navItems.map((item) => <SideButton key={item.id} item={item} active={activeTab === item.id} onClick={() => onNavigate(item.id)} />)}
        <button type="button" onClick={onLogout} className="mt-3 flex h-12 w-full items-center gap-3 rounded-2xl border border-stone-200 bg-rose-50 px-4 text-left text-sm font-black text-stone-950">
          <LogOut className="h-5 w-5" />
          Log out
        </button>
      </nav>
    </aside>
  </div>
);

const SidebarIdentity = ({ initials, displayName, email, accountType, compact = false }) => (
  <div className={`rounded-[28px] border border-stone-200 bg-[#151515] p-5 text-white ${compact ? '' : 'shadow-sm'}`}>
    <div className="grid h-20 w-20 place-items-center rounded-[24px] border-[2px] border-white bg-amber-50 text-3xl font-black text-stone-950 shadow-[4px_4px_0_rgba(255,255,255,0.18)]">
      {initials}
    </div>
    <p className="mt-4 truncate text-xl font-black">{displayName}</p>
    <p className="mt-1 truncate text-sm font-bold text-white/55">{email}</p>
    <span className="mt-4 inline-flex rounded-full bg-emerald-700 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-stone-950">{accountType}</span>
  </div>
);

const SideButton = ({ item, active, onClick }) => {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-12 w-full items-center gap-3 rounded-2xl border border-stone-200 px-4 text-left text-sm font-black transition hover:-translate-y-0.5 ${
        active ? 'bg-amber-50 text-stone-950 shadow-sm' : 'bg-[#f6f4ee] text-stone-950 shadow-sm'
      }`}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {item.label}
    </button>
  );
};

const HeroCard = ({ displayName, email, accountType, verified, initials }) => (
  <section className="overflow-hidden rounded-[34px] border border-stone-200 bg-[#151515] text-white shadow-sm">
    <div className="grid gap-6 p-6 md:grid-cols-[1fr_250px] md:items-end lg:p-8">
      <div>
        <span className="inline-flex items-center gap-2 rounded-full border-[2px] border-white bg-emerald-700 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-stone-950">
          <Sparkles className="h-4 w-4" />
          Account Center
        </span>
        <h1 className="mt-5 max-w-3xl text-4xl font-black leading-none sm:text-5xl">Welcome back, {displayName}</h1>
        <p className="mt-3 max-w-2xl text-base font-bold text-white/65">Manage profile details, addresses, security, and marketplace activity from one polished space.</p>
      </div>
      <div className="rounded-[28px] border-[2px] border-white bg-amber-50 p-5 text-stone-950 shadow-[5px_5px_0_rgba(255,255,255,0.18)]">
        <div className="grid h-16 w-16 place-items-center rounded-[20px] border border-stone-200 bg-white text-2xl font-black">{initials}</div>
        <p className="mt-4 truncate text-xl font-black">{accountType}</p>
        <p className="mt-1 truncate text-sm font-bold text-stone-500">{email}</p>
        <p className="mt-4 inline-flex rounded-full bg-white px-3 py-1 text-xs font-black">{verified ? 'Verified' : 'Needs verification'}</p>
      </div>
    </div>
  </section>
);

const PageIntro = ({ title, text, action }) => (
  <div className="flex flex-col justify-between gap-4 rounded-[30px] border border-stone-200 bg-white p-5 shadow-sm md:flex-row md:items-center">
    <div>
      <h1 className="text-3xl font-black tracking-tight text-stone-950 lg:text-4xl">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm font-bold text-stone-500">{text}</p>
    </div>
    {action}
  </div>
);

const PremiumPanel = ({ title, icon: Icon, children }) => (
  <section className="rounded-[30px] border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="mb-5 flex items-center gap-3">
      {Icon && (
        <span className="grid h-11 w-11 place-items-center rounded-2xl border border-stone-200 bg-blue-50">
          <Icon className="h-5 w-5 text-stone-950" />
        </span>
      )}
      <h2 className="text-2xl font-black text-stone-950">{title}</h2>
    </div>
    {children}
  </section>
);

const MetricCard = ({ icon: Icon, label, value, tone }) => {
  const toneClass = tone === 'green' ? 'bg-emerald-700 text-white' : tone === 'yellow' ? 'bg-amber-50 text-amber-900' : tone === 'dark' ? 'bg-[#151515] text-white' : 'bg-blue-50 text-blue-900';
  return (
    <article className="rounded-[26px] border border-stone-200 bg-white p-4 shadow-sm">
      <span className={`grid h-12 w-12 place-items-center rounded-2xl border border-stone-200 ${toneClass}`}>
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-4 text-xs font-black uppercase tracking-[0.14em] text-stone-400">{label}</p>
      <p className="mt-1 truncate text-xl font-black text-stone-950">{value}</p>
    </article>
  );
};

const QuickAction = ({ icon: Icon, title, text, onClick }) => (
  <button type="button" onClick={onClick} className="flex w-full items-center gap-4 rounded-[22px] border border-stone-200 bg-[#f6f4ee] p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-white">
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-stone-200 bg-amber-50">
      <Icon className="h-5 w-5" />
    </span>
    <span className="min-w-0">
      <span className="block truncate font-black text-stone-950">{title}</span>
      <span className="block truncate text-sm font-bold text-black/50">{text}</span>
    </span>
  </button>
);

const InfoTile = ({ label, value }) => (
  <div className="rounded-[20px] border border-stone-200 bg-[#f6f4ee] px-4 py-3">
    <p className="text-xs font-black uppercase tracking-[0.14em] text-stone-400">{label}</p>
    <p className="mt-1 break-words text-sm font-black text-stone-950">{value || '-'}</p>
  </div>
);

const AddressCard = ({ address, onDelete }) => (
  <article className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#006b4f]">Saved address</p>
        <h3 className="mt-2 break-words text-xl font-black text-stone-950">{address.addressLine}</h3>
        <p className="mt-2 text-sm font-bold text-stone-500">{address.city}, {address.state} - {address.pincode}</p>
        <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm font-black text-stone-950"><Phone className="h-4 w-4" /> {address.phone}</p>
      </div>
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-stone-200 bg-amber-50">
        <MapPin className="h-5 w-5" />
      </span>
    </div>
    <button type="button" onClick={onDelete} className="mt-5 inline-flex items-center gap-2 rounded-full border border-stone-200 bg-rose-50 px-4 py-2 text-sm font-black text-stone-950 shadow-sm">
      <Trash2 className="h-4 w-4" /> Delete
    </button>
  </article>
);

const SavedItemCard = ({ item, onDelete }) => (
  <article className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
    <div className="flex items-start gap-4">
      <a href={`${PRODUCT_APP_URL}/product/${item.id}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-[20px] border border-stone-200 bg-[#f6f4ee]">
        {item.image ? (
          <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
        ) : (
          <span className="grid h-full w-full place-items-center bg-amber-50">
            <Heart className="h-7 w-7" />
          </span>
        )}
      </a>
      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#006b4f]">{item.category}</p>
        <a href={`${PRODUCT_APP_URL}/product/${item.id}`} className="mt-2 block break-words text-xl font-black text-stone-950 hover:text-[#006b4f]">{item.title}</a>
        <p className="mt-2 text-sm font-bold text-black/50">{item.brand}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-stone-200 bg-amber-50 px-3 py-1 text-sm font-black text-stone-950">{formatPrice(item.priceAmount, item.currency)}</span>
          <span className={`rounded-full border border-stone-200 px-3 py-1 text-xs font-black ${item.inStock ? 'bg-[#dffbea]' : 'bg-rose-50'}`}>
            {item.inStock ? 'In stock' : 'Out of stock'}
          </span>
        </div>
      </div>
    </div>
    <button type="button" onClick={onDelete} className="mt-5 rounded-full border border-stone-200 bg-rose-50 px-4 py-2 text-sm font-black text-stone-950">Remove</button>
  </article>
);

const ProfileInput = ({ label, value, onChange, type = 'text', placeholder, maxLength, disabled = false }) => (
  <label className="block min-w-0">
    <span className="text-xs font-black uppercase tracking-[0.14em] text-stone-500">{label}</span>
    <input
      required
      disabled={disabled}
      type={type}
      value={value}
      maxLength={maxLength}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className="mt-2 h-12 w-full rounded-2xl border border-stone-200 bg-white px-4 text-sm font-bold text-stone-950 outline-none transition focus:bg-[#fff8d7] focus:shadow-sm disabled:bg-[#f6f4ee] disabled:text-black/70"
    />
  </label>
);

const EmptyState = ({ icon: Icon, title, text, action, onAction }) => (
  <div className="rounded-[30px] border-[3px] border-dashed border-[#151515] bg-white p-8 text-center shadow-sm">
    <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-stone-200 bg-blue-50">
      <Icon className="h-7 w-7 text-stone-950" />
    </span>
    <p className="mt-4 text-2xl font-black text-stone-950">{title}</p>
    <p className="mx-auto mt-2 max-w-lg text-sm font-bold text-stone-500">{text}</p>
    {action && <PrimaryButton onClick={onAction} className="mt-5">{action}</PrimaryButton>}
  </div>
);

const Modal = ({ title, children, onClose }) => (
  <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4 backdrop-blur-sm">
    <section className="w-full max-w-lg rounded-[30px] border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h3 className="text-2xl font-black text-stone-950">{title}</h3>
        <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-2xl border border-stone-200 bg-amber-50">
          <X className="h-5 w-5" />
        </button>
      </div>
      {children}
    </section>
  </div>
);

const PrimaryButton = ({ children, onClick, disabled = false, submit = false, full = false, className = '' }) => (
  <button
    type={submit ? 'submit' : 'button'}
    disabled={disabled}
    onClick={onClick}
    className={`inline-flex h-12 items-center justify-center gap-2 rounded-full border border-stone-200 bg-emerald-700 px-5 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 ${full ? 'w-full' : ''} ${className}`}
  >
    {children}
  </button>
);

const SecondaryButton = ({ children, onClick }) => (
  <button type="button" onClick={onClick} className="inline-flex h-12 items-center justify-center rounded-full border border-stone-200 bg-white px-5 text-sm font-black text-stone-950 shadow-sm transition hover:-translate-y-0.5">
    {children}
  </button>
);

const getInitials = (user) => {
  const first = user.fullName?.firstName?.charAt(0) || '';
  const last = user.fullName?.lastName?.charAt(0) || '';
  return (first + last).toUpperCase() || user.username?.slice(0, 2).toUpperCase() || 'AV';
};

export default Profile;
