import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import {
  Bell,
  CheckCircle2,
  Heart,
  KeyRound,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Package,
  Phone,
  Plus,
  Save,
  Search,
  Shield,
  Trash2,
  User,
  X,
} from 'lucide-react';

const Profile = () => {
  const {
    user,
    logout,
    logoutAll,
    requestVerification,
    updateProfile,
    addAddress,
    deleteAddress,
    refreshSession,
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
  const [refreshingSession, setRefreshingSession] = useState(false);
  const [verificationTokenDev, setVerificationTokenDev] = useState('');
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [phone, setPhone] = useState('');
  const [addingAddress, setAddingAddress] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [securityAlerts, setSecurityAlerts] = useState(true);
  const [orders, setOrders] = useState([]);
  const [savedItems, setSavedItems] = useState([]);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [orderTitle, setOrderTitle] = useState('');
  const [orderStatus, setOrderStatus] = useState('Pending');
  const [savedTitle, setSavedTitle] = useState('');
  const [savedNote, setSavedNote] = useState('');

  if (!user) return null;

  const isSeller = user.role === 'seller';
  const accountType = isSeller ? 'Merchant' : 'Buyer';
  const displayName = `${user.fullName?.firstName || ''} ${user.fullName?.lastName || ''}`.trim() || user.username;
  const initials = getInitials(user);
  const primaryAddress = user.addresses?.[0];

  const navItems = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'profile', label: 'Profile Info', icon: Mail },
    { id: 'orders', label: 'Orders', icon: Package },
    { id: 'saved', label: 'Saved Items', icon: Heart },
    { id: 'addresses', label: 'Addresses', icon: MapPin, hidden: isSeller },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'sessions', label: 'Sessions', icon: KeyRound },
    { id: 'notifications', label: 'Notifications', icon: Bell },
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

  const handleRequestVerification = async () => {
    const result = await requestVerification();
    if (result.success) {
      showNotification('Verification email requested!', 'success');
      if (result.devToken) setVerificationTokenDev(result.devToken);
    } else {
      showNotification(result.message || 'Failed to request verification', 'error');
    }
  };

  const handleRefreshSession = async () => {
    setRefreshingSession(true);
    const result = await refreshSession();
    setRefreshingSession(false);
    showNotification(result.success ? 'Session refreshed successfully' : result.message || 'Session refresh failed', result.success ? 'success' : 'error');
  };

  const handleLogoutAll = async () => {
    if (!window.confirm('This will terminate all active sessions including this one. Proceed?')) return;
    const result = await logoutAll();
    showNotification(result.success ? 'Logged out from all devices successfully' : result.message || 'Failed to logout from all devices', result.success ? 'success' : 'error');
  };

  const handleLogout = async () => {
    if (!window.confirm('Are you sure you want to logout?')) return;
    await logout();
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

  const handleAddOrder = (event) => {
    event.preventDefault();
    if (!orderTitle.trim()) {
      showNotification('Please enter an order title', 'error');
      return;
    }

    setOrders((current) => [
      {
        id: `ORD-${Date.now().toString().slice(-6)}`,
        title: orderTitle.trim(),
        status: orderStatus,
        createdAt: new Date().toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
      },
      ...current,
    ]);
    setOrderTitle('');
    setOrderStatus('Pending');
    setShowOrderModal(false);
    showNotification('Order section item added locally', 'success');
  };

  const handleAddSavedItem = (event) => {
    event.preventDefault();
    if (!savedTitle.trim()) {
      showNotification('Please enter a saved item title', 'error');
      return;
    }

    setSavedItems((current) => [
      {
        id: `SAVED-${Date.now().toString().slice(-6)}`,
        title: savedTitle.trim(),
        note: savedNote.trim() || 'Saved for later',
      },
      ...current,
    ]);
    setSavedTitle('');
    setSavedNote('');
    setShowSavedModal(false);
    showNotification('Saved item added locally', 'success');
  };

  const renderContent = () => {
    if (activeTab === 'overview') {
      return (
        <>
          <section className="overflow-hidden rounded-2xl bg-[#12309e] text-white shadow-lg shadow-blue-100">
            <div className="relative p-7">
              <div className="absolute -right-8 -top-10 h-44 w-44 rounded-full bg-white/10" />
              <div className="relative max-w-2xl">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-200">Account Center</p>
                <h1 className="mt-3 text-3xl font-black">Welcome back, {displayName}</h1>
                <p className="mt-3 text-sm font-semibold leading-6 text-blue-100">
                  Manage your profile, security, addresses, email verification, and active sessions from one place.
                </p>
              </div>
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-3">
            <StatusCard icon={User} label="Account Type" value={accountType} />
            <StatusCard icon={Mail} label="Email Status" value={user.emailVerified ? 'Verified' : 'Pending'} tone={user.emailVerified ? 'green' : 'amber'} />
            <StatusCard icon={KeyRound} label="Session Limit" value="5 active devices" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <Panel title="Profile Summary" icon={User}>
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoRow label="Name" value={displayName} />
                <InfoRow label="Username" value={user.username} />
                <InfoRow label="Email" value={user.email} />
                <InfoRow label="Provider" value={user.authProvider || 'local'} />
              </div>
              <button type="button" onClick={() => setActiveTab('profile')} className="mt-5 rounded-xl bg-[#12309e] px-5 py-3 text-sm font-black text-white">
                Edit Profile
              </button>
            </Panel>

            <Panel title="Quick Access" icon={Shield}>
              <div className="space-y-3">
                <QuickLink icon={Package} title="Orders" text={`${orders.length} local item${orders.length === 1 ? '' : 's'}`} onClick={() => setActiveTab('orders')} />
                <QuickLink icon={Heart} title="Saved Items" text={`${savedItems.length} saved`} onClick={() => setActiveTab('saved')} />
                {!isSeller && (
                  <QuickLink icon={MapPin} title="Addresses" text={`${user.addresses?.length || 0} saved`} onClick={() => setActiveTab('addresses')} />
                )}
                <QuickLink icon={Shield} title="Security" text={user.emailVerified ? 'Verified account' : 'Verification pending'} onClick={() => setActiveTab('security')} />
                <QuickLink icon={KeyRound} title="Sessions" text="Refresh / logout all devices" onClick={() => setActiveTab('sessions')} />
              </div>
            </Panel>
          </div>
        </>
      );
    }

    if (activeTab === 'orders') {
      return (
        <>
          <PageIntro
            title="Orders"
            text="Order section is ready for Order Service integration. For now, items added here are frontend-local placeholders."
            action={<button type="button" onClick={() => setShowOrderModal(true)} className="rounded-xl bg-[#12309e] px-5 py-3 text-sm font-black text-white">Add Order</button>}
          />
          {orders.length ? (
            <div className="space-y-4">
              {orders.map((order) => (
                <OrderPlaceholderCard key={order.id} order={order} onDelete={() => setOrders((current) => current.filter((item) => item.id !== order.id))} />
              ))}
            </div>
          ) : (
            <EmptyState icon={Package} title="No orders yet" text="Orders will appear here when Order Service data is connected. You can add a local placeholder now." action="Add Order" onAction={() => setShowOrderModal(true)} />
          )}
        </>
      );
    }

    if (activeTab === 'saved') {
      return (
        <>
          <PageIntro
            title="Saved Items"
            text="Saved products/recommendations section is ready for Product/AI integration. Current additions are frontend-local."
            action={<button type="button" onClick={() => setShowSavedModal(true)} className="rounded-xl bg-[#12309e] px-5 py-3 text-sm font-black text-white">Add Saved Item</button>}
          />
          {savedItems.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {savedItems.map((item) => (
                <SavedItemCard key={item.id} item={item} onDelete={() => setSavedItems((current) => current.filter((saved) => saved.id !== item.id))} />
              ))}
            </div>
          ) : (
            <EmptyState icon={Heart} title="No saved items yet" text="Saved items will appear here after Product/AI service integration. You can add a local placeholder now." action="Add Saved Item" onAction={() => setShowSavedModal(true)} />
          )}
        </>
      );
    }

    if (activeTab === 'profile') {
      return (
        <>
          <PageIntro title="Profile Information" text="Update the identity fields stored in the Auth service." />
          <Panel title="Personal Information" icon={User}>
            <form onSubmit={handleSaveProfile} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <ProfileInput label="First Name" value={firstName} onChange={setFirstName} disabled={!isEditing} />
                <ProfileInput label="Last Name" value={lastName} onChange={setLastName} disabled={!isEditing} />
                <ProfileInput label="Username" value={username} onChange={setUsername} disabled={!isEditing} />
                <ProfileInput label="Email Address" value={email} onChange={setEmail} type="email" disabled={!isEditing} />
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => setIsEditing((value) => !value)} className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700">
                  {isEditing ? 'Cancel' : 'Edit Profile'}
                </button>
                {isEditing && (
                  <button disabled={savingProfile} className="inline-flex items-center gap-2 rounded-xl bg-[#12309e] px-5 py-3 text-sm font-black text-white">
                    <Save className="h-4 w-4" /> {savingProfile ? 'Saving...' : 'Save Changes'}
                  </button>
                )}
              </div>
            </form>
          </Panel>
        </>
      );
    }

    if (activeTab === 'addresses') {
      return (
        <>
          <PageIntro title="Shipping Addresses" text="Manage addresses saved on your buyer profile." action={<button type="button" onClick={() => setShowAddressModal(true)} className="rounded-xl bg-[#12309e] px-5 py-3 text-sm font-black text-white">Add Address</button>} />
          {user.addresses?.length ? (
            <div className="grid gap-5 md:grid-cols-2">
              {user.addresses.map((addr) => (
                <AddressCard key={addr._id} address={addr} onDelete={() => handleDeleteAddress(addr._id)} />
              ))}
            </div>
          ) : (
            <EmptyState icon={MapPin} title="No address added" text="Add your first shipping address for checkout and delivery." action="Add Address" onAction={() => setShowAddressModal(true)} />
          )}
        </>
      );
    }

    if (activeTab === 'security') {
      return (
        <>
          <PageIntro title="Security" text="Verify email and review authentication protections." />
          <Panel title="Authentication Status" icon={Shield}>
            <div className="grid gap-4 md:grid-cols-2">
              <SecurityInfo title="Auth Provider" value={user.authProvider || 'local'} icon={Shield} />
              <SecurityInfo title="Email Status" value={user.emailVerified ? 'Verified' : 'Pending'} icon={Mail} />
              <SecurityInfo title="Token Strategy" value="JWT + Refresh Token" icon={KeyRound} />
              <SecurityInfo title="Session Policy" value="Max 5 devices" icon={CheckCircle2} />
            </div>
            {!user.emailVerified && (
              <div className="mt-5 flex flex-col justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-5 md:flex-row md:items-center">
                <div>
                  <p className="font-black text-slate-900">Email verification pending</p>
                  <p className="text-sm font-semibold text-slate-600">Send a verification link to complete account verification.</p>
                </div>
                <button type="button" onClick={handleRequestVerification} className="rounded-xl bg-[#12309e] px-5 py-3 text-sm font-black text-white">
                  Verify Email
                </button>
              </div>
            )}
            {verificationTokenDev && (
              <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                <p className="font-black text-emerald-900">Developer verification link</p>
                <a href={`/verify-email/${verificationTokenDev}`} className="mt-1 block break-all text-sm font-bold text-emerald-700 hover:underline">
                  {window.location.origin}/verify-email/{verificationTokenDev}
                </a>
              </div>
            )}
          </Panel>
        </>
      );
    }

    if (activeTab === 'sessions') {
      return (
        <>
          <PageIntro title="Active Sessions" text="Refresh access tokens or terminate sessions across devices." />
          <Panel title="Session Controls" icon={KeyRound}>
            <div className="grid gap-4 md:grid-cols-2">
              <ActionCard
                title="Refresh Current Session"
                text="Generate a fresh access token using the refresh token cookie."
                action={refreshingSession ? 'Refreshing...' : 'Refresh Session'}
                icon={KeyRound}
                onClick={handleRefreshSession}
              />
              <ActionCard
                title="Logout All Devices"
                text="Revoke all refresh sessions for this account."
                action="Logout All Devices"
                icon={LogOut}
                danger
                onClick={handleLogoutAll}
              />
            </div>
          </Panel>
        </>
      );
    }

    return (
      <>
        <PageIntro title="Notifications" text="Local UI preferences for Auth and security communication." />
        <Panel title="Communication Preferences" icon={Bell}>
          <PreferenceRow title="Email Notifications" text="Receive account and verification emails." enabled={emailNotifications} onClick={() => setEmailNotifications((value) => !value)} />
          <PreferenceRow title="Security Alerts" text="Notify on login and session activity." enabled={securityAlerts} onClick={() => setSecurityAlerts((value) => !value)} />
        </Panel>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-[#edf1f7] p-3 text-slate-950 sm:p-5">
      <div className="mx-auto max-w-[1320px] overflow-hidden rounded-[1.6rem] border border-slate-200 bg-[#f7f8fb] shadow-xl">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5 lg:px-7">
          <div className="flex items-center gap-7">
            <button type="button" onClick={() => setMobileSidebarOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 md:hidden">
              <Menu className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => setActiveTab('overview')} className="text-2xl font-black text-[#12309e]">VendorHub</button>
            <nav className="hidden items-center gap-7 text-sm font-black text-slate-600 lg:flex">
              <button type="button" onClick={() => setActiveTab('overview')}>Overview</button>
              <button type="button" onClick={() => setActiveTab('profile')}>Profile</button>
              <button type="button" onClick={() => setActiveTab('security')}>Security</button>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden h-10 w-[280px] items-center gap-3 rounded-xl border border-slate-200 bg-slate-100 px-4 md:flex">
              <Search className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-semibold text-slate-500">Search account...</span>
            </div>
            <button type="button" onClick={() => setActiveTab('settings')} className="grid h-10 w-10 place-items-center rounded-full text-slate-800">
              <User className="h-6 w-6" />
            </button>
          </div>
        </header>

        <div className="grid min-h-[calc(100vh-7rem)] md:grid-cols-[260px_minmax(0,1fr)]">
          <ProfileSidebar
            activeTab={activeTab}
            displayName={displayName}
            email={user.email}
            initials={initials}
            navItems={navItems}
            onLogout={handleLogout}
            onNavigate={setActiveTab}
          />

          <main className="min-w-0 space-y-6 px-5 py-7 lg:px-10">
            {renderContent()}
          </main>
        </div>
      </div>

      {mobileSidebarOpen && (
        <MobileSidebar
          activeTab={activeTab}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900">Add shipping address</h3>
              <button type="button" onClick={() => setShowAddressModal(false)} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-500">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddAddress} className="space-y-4">
              <ProfileInput label="Address Line" value={addressLine} onChange={setAddressLine} placeholder="Street details" />
              <div className="grid gap-4 sm:grid-cols-2">
                <ProfileInput label="City" value={city} onChange={setCity} placeholder="Delhi" />
                <ProfileInput label="State" value={state} onChange={setState} placeholder="Delhi" />
                <ProfileInput label="Pincode" value={pincode} onChange={setPincode} placeholder="110001" maxLength={6} />
                <ProfileInput label="Phone" value={phone} onChange={setPhone} placeholder="9876543210" maxLength={10} />
              </div>
              <button disabled={addingAddress} className="w-full rounded-xl bg-[#12309e] px-5 py-3 text-sm font-black text-white">
                {addingAddress ? 'Adding...' : 'Add Address'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900">Add local order item</h3>
              <button type="button" onClick={() => setShowOrderModal(false)} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-500">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddOrder} className="space-y-4">
              <ProfileInput label="Order Title" value={orderTitle} onChange={setOrderTitle} placeholder="Example: AI Smart Speaker" />
              <label className="block">
                <span className="text-sm font-black text-slate-600">Status</span>
                <select
                  value={orderStatus}
                  onChange={(event) => setOrderStatus(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#12309e] focus:ring-4 focus:ring-blue-100"
                >
                  <option>Pending</option>
                  <option>Processing</option>
                  <option>Shipped</option>
                  <option>Delivered</option>
                </select>
              </label>
              <button className="w-full rounded-xl bg-[#12309e] px-5 py-3 text-sm font-black text-white">
                Add Order
              </button>
            </form>
          </div>
        </div>
      )}

      {showSavedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900">Add saved item</h3>
              <button type="button" onClick={() => setShowSavedModal(false)} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-500">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddSavedItem} className="space-y-4">
              <ProfileInput label="Item Title" value={savedTitle} onChange={setSavedTitle} placeholder="Example: AI Product Recommendation" />
              <ProfileInput label="Note" value={savedNote} onChange={setSavedNote} placeholder="Optional note" />
              <button className="w-full rounded-xl bg-[#12309e] px-5 py-3 text-sm font-black text-white">
                Add Saved Item
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const ProfileSidebar = ({ activeTab, displayName, email, initials, navItems, onLogout, onNavigate }) => (
  <aside className="hidden border-r border-slate-200 bg-[#f1f3f7] px-5 py-7 md:block">
    <div className="flex flex-col items-center text-center">
      <div className="grid h-20 w-20 place-items-center rounded-full border-[3px] border-[#12309e] bg-white text-2xl font-black text-slate-950 shadow-md">{initials}</div>
      <p className="mt-4 max-w-[210px] truncate text-lg font-black text-slate-950">{displayName}</p>
      <p className="mt-1 max-w-[210px] truncate text-sm font-semibold text-slate-500">{email}</p>
    </div>
    <nav className="mt-9 space-y-2">
      {navItems.map((item) => (
        <SideButton key={item.id} item={item} active={activeTab === item.id} onClick={() => onNavigate(item.id)} />
      ))}
      <button type="button" onClick={onLogout} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-black text-slate-600 transition hover:bg-white">
        <LogOut className="h-5 w-5" />
        Log out
      </button>
    </nav>
  </aside>
);

const MobileSidebar = ({ activeTab, displayName, email, initials, navItems, onClose, onLogout, onNavigate }) => (
  <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm md:hidden">
    <aside className="h-full w-[86vw] max-w-sm bg-[#f1f3f7] p-6 shadow-2xl">
      <div className="mb-7 flex items-center justify-between">
        <p className="text-2xl font-black text-[#12309e]">VendorHub</p>
        <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl bg-white text-slate-700">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="mb-7 flex items-center gap-4">
        <div className="grid h-14 w-14 place-items-center rounded-full border-2 border-[#12309e] bg-white text-xl font-black text-slate-950">{initials}</div>
        <div className="min-w-0">
          <p className="truncate font-black text-slate-950">{displayName}</p>
          <p className="truncate text-sm font-semibold text-slate-500">{email}</p>
        </div>
      </div>
      <nav className="space-y-2">
        {navItems.map((item) => (
          <SideButton key={item.id} item={item} active={activeTab === item.id} onClick={() => onNavigate(item.id)} />
        ))}
        <button type="button" onClick={onLogout} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-black text-slate-600 transition hover:bg-white">
          <LogOut className="h-5 w-5" />
          Log out
        </button>
      </nav>
    </aside>
  </div>
);

const SideButton = ({ item, active, onClick }) => {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-black transition ${
        active ? 'border-l-4 border-[#12309e] bg-slate-200 text-[#12309e]' : 'text-slate-600 hover:bg-white hover:text-slate-950'
      }`}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {item.label}
    </button>
  );
};

const PageIntro = ({ title, text, action }) => (
  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
    <div>
      <h1 className="text-3xl font-black tracking-tight text-slate-950 lg:text-4xl">{title}</h1>
      <p className="mt-2 text-base font-semibold text-slate-600">{text}</p>
    </div>
    {action}
  </div>
);

const Panel = ({ title, icon: Icon, children }) => (
  <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
    <div className="mb-5 flex items-center gap-3">
      {Icon && <Icon className="h-5 w-5 text-[#12309e]" />}
      <h2 className="text-xl font-black text-slate-950">{title}</h2>
    </div>
    {children}
  </section>
);

const StatusCard = ({ icon: Icon, label, value, tone = 'blue' }) => {
  const toneClass = tone === 'green' ? 'bg-emerald-50 text-emerald-700' : tone === 'amber' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-[#12309e]';
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <span className={`grid h-12 w-12 place-items-center rounded-xl ${toneClass}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
        <p className="truncate text-base font-black text-slate-950">{value}</p>
      </div>
    </div>
  );
};

const QuickLink = ({ icon: Icon, title, text, onClick }) => (
  <button type="button" onClick={onClick} className="flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:bg-white hover:shadow-sm">
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-100 text-[#12309e]">
      <Icon className="h-5 w-5" />
    </span>
    <span>
      <span className="block font-black text-slate-950">{title}</span>
      <span className="block text-sm font-semibold text-slate-500">{text}</span>
    </span>
  </button>
);

const InfoRow = ({ label, value }) => (
  <div className="flex min-w-0 items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3">
    <span className="text-sm font-black text-slate-500">{label}</span>
    <span className="min-w-0 break-words text-right text-sm font-black text-slate-900">{value}</span>
  </div>
);

const AddressCard = ({ address, onDelete }) => (
  <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
    <div className="flex items-start justify-between gap-5">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.12em] text-[#12309e]">Saved address</p>
        <h3 className="mt-2 text-lg font-black text-slate-950">{address.addressLine}</h3>
        <p className="mt-2 text-sm font-semibold text-slate-600">{address.city}, {address.state} - {address.pincode}</p>
        <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-600"><Phone className="h-4 w-4" /> {address.phone}</p>
      </div>
      <MapPin className="h-6 w-6 text-[#12309e]" />
    </div>
    <button type="button" onClick={onDelete} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-black text-rose-600">
      <Trash2 className="h-4 w-4" /> Delete
    </button>
  </article>
);

const OrderPlaceholderCard = ({ order, onDelete }) => (
  <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-[#12309e]">{order.id}</p>
        <h3 className="mt-2 truncate text-lg font-black text-slate-950">{order.title}</h3>
        <p className="mt-1 text-sm font-semibold text-slate-500">Added locally on {order.createdAt}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-black text-[#12309e]">{order.status}</span>
        <button type="button" onClick={onDelete} className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-black text-rose-600">
          Remove
        </button>
      </div>
    </div>
  </article>
);

const SavedItemCard = ({ item, onDelete }) => (
  <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-[#12309e]">{item.id}</p>
        <h3 className="mt-2 break-words text-lg font-black text-slate-950">{item.title}</h3>
        <p className="mt-2 text-sm font-semibold text-slate-500">{item.note}</p>
      </div>
      <Heart className="h-6 w-6 shrink-0 text-[#12309e]" />
    </div>
    <button type="button" onClick={onDelete} className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-black text-rose-600">
      Remove
    </button>
  </article>
);

const SecurityInfo = ({ title, value, icon: Icon }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
    <Icon className="h-5 w-5 text-[#12309e]" />
    <p className="mt-3 text-xs font-black uppercase text-slate-500">{title}</p>
    <p className="mt-1 font-black text-slate-950">{value}</p>
  </div>
);

const ActionCard = ({ title, text, action, icon: Icon, onClick, danger = false }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
    <Icon className={`h-6 w-6 ${danger ? 'text-rose-600' : 'text-[#12309e]'}`} />
    <h3 className="mt-4 font-black text-slate-950">{title}</h3>
    <p className="mt-2 text-sm font-semibold text-slate-600">{text}</p>
    <button type="button" onClick={onClick} className={`mt-5 rounded-xl px-5 py-3 text-sm font-black ${danger ? 'bg-rose-50 text-rose-600 ring-1 ring-rose-200' : 'bg-[#12309e] text-white'}`}>
      {action}
    </button>
  </div>
);

const PreferenceRow = ({ title, text, enabled, onClick }) => (
  <div className="flex items-center justify-between gap-5 border-b border-slate-100 py-4 last:border-b-0">
    <div>
      <p className="font-black text-slate-950">{title}</p>
      <p className="mt-1 text-sm font-semibold text-slate-600">{text}</p>
    </div>
    <button type="button" onClick={onClick} className={`relative h-7 w-12 rounded-full transition ${enabled ? 'bg-[#12309e]' : 'bg-slate-300'}`}>
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${enabled ? 'left-6' : 'left-1'}`} />
    </button>
  </div>
);

const ProfileInput = ({ label, value, onChange, type = 'text', placeholder, maxLength, disabled = false }) => (
  <label className="block min-w-0">
    <span className="text-sm font-black text-slate-600">{label}</span>
    <input
      required
      disabled={disabled}
      type={type}
      value={value}
      maxLength={maxLength}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#12309e] focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:text-slate-700"
    />
  </label>
);

const EmptyState = ({ icon: Icon, title, text, action, onAction }) => (
  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
    <Icon className="mx-auto h-10 w-10 text-blue-300" />
    <p className="mt-4 text-lg font-black text-slate-950">{title}</p>
    <p className="mt-2 text-sm font-semibold text-slate-600">{text}</p>
    {action && (
      <button type="button" onClick={onAction} className="mt-5 rounded-xl bg-[#12309e] px-5 py-3 text-sm font-black text-white">{action}</button>
    )}
  </div>
);

const getInitials = (user) => {
  const first = user.fullName?.firstName?.charAt(0) || '';
  const last = user.fullName?.lastName?.charAt(0) || '';
  return (first + last).toUpperCase() || user.username?.slice(0, 2).toUpperCase() || 'AV';
};

export default Profile;
