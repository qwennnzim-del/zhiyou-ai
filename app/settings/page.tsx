'use client';

import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Globe, Check } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '../contexts/LanguageContext';

const languages = [
  { code: 'id', name: 'Bahasa Indonesia' },
  { code: 'en', name: 'English' },
  { code: 'ja', name: '日本語 (Japanese)' },
  { code: 'ko', name: '한국어 (Korean)' },
  { code: 'zh', name: '中文 (Simplified Chinese)' },
];

export default function SettingsPage() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center sticky top-0 z-10">
        <Link href="/" className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </Link>
        <h1 className="text-lg font-semibold text-gray-900 ml-2">{t('settings')}</h1>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">{t('language')}</h2>
              <p className="text-sm text-gray-500">{t('selectLanguage')}</p>
            </div>
          </div>

          <div className="p-2 max-h-[60vh] overflow-y-auto">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code as any)}
                className={`w-full flex items-center justify-between p-4 rounded-xl transition-all active:scale-[0.98] ${
                  language === lang.code 
                    ? 'bg-blue-50 border border-blue-100' 
                    : 'hover:bg-gray-50 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-sm ${language === lang.code ? 'font-semibold text-blue-700' : 'font-medium text-gray-700'}`}>
                    {lang.name}
                  </span>
                </div>
                {language === lang.code && (
                  <Check className="w-5 h-5 text-blue-600" />
                )}
              </button>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
