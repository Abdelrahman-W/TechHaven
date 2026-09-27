import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { LanguageProvider } from './context/LanguageContext';
import { SettingsProvider } from './context/SettingsContext';
import ErrorBoundary from './components/ErrorBoundary';

// Layouts & Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import SkipToContent from './components/SkipToContent';

// Core Public Pages (Eagerly Loaded for Instant First Paint)
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import Checkout from './pages/Checkout';

// User Pages (Eagerly Loaded)
import Profile from './pages/Profile';
import Wishlist from './pages/Wishlist';
import Search from './pages/Search';
import Orders from './pages/Orders';

// Secondary Public Pages (Lazy Loaded)
const PCBuilder = React.lazy(() => import('./pages/PCBuilder'));
const B2B = React.lazy(() => import('./pages/B2B'));
const Compare = React.lazy(() => import('./pages/Compare'));

// Admin Layout & Pages (Lazy Loaded — Isolates ~400KB Admin bundle from regular shoppers)
const AdminLayout = React.lazy(() => import('./components/admin/AdminLayout'));
const AdminDashboard = React.lazy(() => import('./pages/Admin/Dashboard'));
const AdminProducts = React.lazy(() => import('./pages/Admin/Products'));
const AdminInventoryLedger = React.lazy(() => import('./pages/Admin/InventoryLedger'));
const AdminSuppliers = React.lazy(() => import('./pages/Admin/Suppliers'));
const AdminReorderIntelligence = React.lazy(() => import('./pages/Admin/ReorderIntelligence'));
const AdminPurchaseOrders = React.lazy(() => import('./pages/Admin/PurchaseOrders'));
const AdminOrders = React.lazy(() => import('./pages/Admin/Orders'));
const AdminUsers = React.lazy(() => import('./pages/Admin/Users'));
const AdminCategories = React.lazy(() => import('./pages/Admin/Categories'));
const AdminAnalytics = React.lazy(() => import('./pages/Admin/Analytics'));
const AdminSettings = React.lazy(() => import('./pages/Admin/Settings'));
const AdminB2B = React.lazy(() => import('./pages/Admin/B2B'));
const AdminReviews = React.lazy(() => import('./pages/Admin/Reviews'));

import NotFound from './pages/NotFound';

// Tactile Loading Spinner Fallback for Lazy Chunks
function PageLoadingFallback() {
  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        color: 'var(--text-secondary)',
      }}
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: '3px solid rgba(255, 94, 20, 0.15)',
          borderTopColor: 'var(--brand-orange)',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>جاري التحميل...</span>
    </div>
  );
}

import MobileBottomNav from './components/MobileBottomNav';

// Automatically scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

function AppLayout() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <div className={`app-container ${isAdmin ? 'admin-app-mode' : ''}`}>
      <SkipToContent />
      {!isAdmin && <Navbar />}
      <main id="main-content" tabIndex="-1" className={`main-content ${!isAdmin ? 'th-mobile-safe-bottom' : ''}`}>
        <ErrorBoundary>
          <React.Suspense fallback={<PageLoadingFallback />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/pc-builder" element={<PCBuilder />} />
              <Route path="/build" element={<PCBuilder />} />
              <Route path="/b2b" element={<B2B />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/checkout" element={<Checkout />} />
              
              {/* User Routes */}
              <Route path="/profile" element={<Profile />} />
              <Route path="/wishlist" element={<Wishlist />} />
              <Route path="/compare" element={<Compare />} />
              <Route path="/search" element={<Search />} />
              <Route path="/orders" element={<Orders />} />

              {/* Admin Routes */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="inventory" element={<AdminInventoryLedger />} />
                <Route path="reorder" element={<AdminReorderIntelligence />} />
                <Route path="suppliers" element={<AdminSuppliers />} />
                <Route path="purchasing" element={<AdminPurchaseOrders />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="categories" element={<AdminCategories />} />
                <Route path="analytics" element={<AdminAnalytics />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="b2b" element={<AdminB2B />} />
                <Route path="reviews" element={<AdminReviews />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </React.Suspense>
        </ErrorBoundary>
      </main>
      {!isAdmin && <Footer />}
      <CartDrawer />
      {!isAdmin && <MobileBottomNav />}
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <SettingsProvider>
        <ThemeProvider>
          <AuthProvider>
            <CartProvider>
              <LanguageProvider>
                <Router>
                  <ScrollToTop />
                  <AppLayout />
                </Router>
              </LanguageProvider>
            </CartProvider>
          </AuthProvider>
        </ThemeProvider>
      </SettingsProvider>
    </ErrorBoundary>
  );
}

export default App;