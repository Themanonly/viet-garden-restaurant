'use client';

import { useEffect } from 'react';
import type { Locale } from '../content/models';

export function getDocumentDirection(locale: Locale): 'ltr' | 'rtl' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

export function LocaleDocumentAttributes({ locale }: { locale: Locale }) {
  useEffect(() => {
    const root = document.documentElement;
    root.lang = locale;
    root.dir = getDocumentDirection(locale);
  }, [locale]);

  return null;
}