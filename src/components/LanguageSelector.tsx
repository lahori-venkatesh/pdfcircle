import React, { useState } from 'react';
import { Globe } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation } from 'react-i18next';

export function LanguageSelector() {
  const { currentLanguage, setLanguage, languages } = useLanguage();
  const { i18n } = useTranslation();

  const [isDropdownVisible, setDropdownVisible] = useState(false);

  const handleLanguageChange = (code: string) => {
    setLanguage(code);
    i18n.changeLanguage(code);
    setDropdownVisible(false); // Close the dropdown after language change
  };

  // Toggle dropdown visibility
  const toggleDropdown = () => {
    setDropdownVisible(!isDropdownVisible);
  };

  // Function to generate language buttons
  const renderLanguageButtons = (filterLanguages: string[], label: string) => (
    <div>
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
        {label}
      </div>
      {Object.entries(languages)
        .filter(([code]) => filterLanguages.includes(code))
        .map(([code, lang]) => (
          <button
            key={code}
            onClick={() => handleLanguageChange(code)}
            className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-700 ${
              currentLanguage === code ? 'text-indigo-400 font-medium' : 'text-gray-300'
            }`}
          >
            {lang.nativeName}
          </button>
        ))}
    </div>
  );

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="flex items-center space-x-2 text-gray-400 hover:text-white"
      >
        <Globe className="w-5 h-5" />
        <span>{languages[currentLanguage as keyof typeof languages]?.nativeName}</span>
      </button>

      {isDropdownVisible && (
        <div className="absolute bottom-full left-0 mb-2 py-2 w-48 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50">
          <div className="max-h-96 overflow-y-auto">
            {/* Global Languages */}
            {renderLanguageButtons(
              Object.keys(languages).filter(
                (code) => !['hi', 'te', 'ta', 'kn', 'ml', 'bn', 'mr', 'gu'].includes(code)
              ),
              'Global Languages'
            )}

            {/* Indian Languages */}
            <div className="border-t border-gray-700 px-4 py-2">
              {renderLanguageButtons(
                ['hi', 'te', 'ta', 'kn', 'ml', 'bn', 'mr', 'gu'],
                'Indian Languages'
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
