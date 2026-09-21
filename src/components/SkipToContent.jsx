import React from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function SkipToContent() {
  const { lang, t } = useLanguage();
  const label = t('skip_to_content') || (lang === 'ar' ? 'تخطي إلى المحتوى الرئيسي' : 'Skip to main content');

  return (
    <a href="#main-content" className="th-skip-to-content">
      {label}
    </a>
  );
}
