import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

const DEFAULT_SETTINGS = {
  store_name: 'TechHaven Egypt',
  store_name_en: 'TechHaven',
  slogan: 'SMARTER TECH. BETTER LIFE.',
  hotline: '19888',
  email: 'support@techhaven.com.eg',
  whatsapp_phone: '01274757241',
  address: 'السويس',
  commercial_reg: '409214',
  tax_card: '712-441-903',
  shipping_cairo: 55,
  shipping_governorates: 80,
  shipping_express: 120,
  free_shipping_threshold: 2500,
  estimated_days: '24-48 ساعة',
  estimated_days_gov: '2-4 أيام عمل',
  return_policy_days: 14,
  cod_extra_fee: 15,
  enable_visa: true,
  enable_meeza: true,
  enable_vodafone_cash: true,
  enable_instapay: true,
  enable_cod: true,
  vodafone_cash_phone: '01012345678',
  instapay_address: 'techhaven@instapay',
  maintenance_mode: false,
  announcement_active: true,
  announcement_text: 'تخفيضات كبرى على كروت الشاشة وشاشات 240Hz لفترة محدودة | شحن مجاني للطلبات فوق 2500 ج.م',
  announcement_link: '/shop',
  // Paymob Public Client Info
  paymob_mode: 'sandbox',
  paymob_public_key: '',
  // Analytics
  ga4_measurement_id: '',
  meta_pixel_id: '',
  gtm_id: '',
  tiktok_pixel_id: '',
};

const SettingsContext = createContext({
  settings: DEFAULT_SETTINGS,
  loading: false,
  updateSettings: async () => {},
  refreshSettings: async () => {},
});

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('th_settings');
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      // Fallback
    }
    return DEFAULT_SETTINGS;
  });

  const [loading, setLoading] = useState(false);

  const refreshSettings = useCallback(async () => {
    try {
      const res = await api.getSettings();
      if (res?.data) {
        const merged = { ...DEFAULT_SETTINGS, ...res.data };
        setSettings(merged);
        try {
          localStorage.setItem('th_settings', JSON.stringify(merged));
        } catch {
          // ignore storage quota error
        }
      }
    } catch {
      // Keep existing state
    }
  }, []);

  useEffect(() => {
    refreshSettings();

    // Listen for cross-component and cross-tab settings updates
    const handleSettingsUpdated = (event) => {
      if (event.detail) {
        setSettings((prev) => ({ ...prev, ...event.detail }));
      }
    };

    const handleStorageChange = (e) => {
      if (e.key === 'th_settings' && e.newValue) {
        try {
          setSettings((prev) => ({ ...prev, ...JSON.parse(e.newValue) }));
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener('th:settings_updated', handleSettingsUpdated);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('th:settings_updated', handleSettingsUpdated);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [refreshSettings]);

  const updateSettings = async (newSettings) => {
    setLoading(true);
    try {
      const merged = { ...settings, ...newSettings };
      const res = await api.updateSettings(merged);
      const savedData = res?.data || merged;
      setSettings(savedData);
      try {
        localStorage.setItem('th_settings', JSON.stringify(savedData));
      } catch {
        // ignore
      }
      window.dispatchEvent(new CustomEvent('th:settings_updated', { detail: savedData }));
      return savedData;
    } finally {
      setLoading(false);
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, loading, updateSettings, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return ctx;
}
