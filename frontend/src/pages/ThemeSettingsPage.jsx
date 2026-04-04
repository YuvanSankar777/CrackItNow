import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeContext } from '../context/ThemeContext';

const ThemeSettingsPage = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useContext(ThemeContext);
  const [saved, setSaved] = useState(false);

  const handleThemeChange = (newTheme) => {
    if (theme !== newTheme) {
      toggleTheme();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-theme-bg text-theme-text">
      {/* Header */}
      <header className="border-b border-theme-border sticky top-0 z-40 bg-theme-surface/50 backdrop-blur">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-theme-bg rounded-lg transition-colors"
              title="Go back"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold">Theme Settings</h1>
          </div>
          {saved && (
            <div className="flex items-center gap-2 text-green-500 animate-pulse">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">Saved!</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12 max-w-2xl">
        {/* Theme Selection Section */}
        <section className="mb-12">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-theme-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
            Appearance
          </h2>
          <p className="text-theme-text-muted mb-6">Choose how DevVox AI should look and feel</p>

          {/* Theme Options Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Light Theme */}
            <div
              onClick={() => handleThemeChange('light')}
              className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
                theme === 'light'
                  ? 'border-theme-accent bg-theme-accent/10'
                  : 'border-theme-border hover:border-theme-accent/50'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Light Theme</h3>
                {theme === 'light' && (
                  <div className="w-6 h-6 bg-theme-accent rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Light Theme Preview */}
              <div className="bg-white rounded p-3 border border-gray-200 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                <div className="h-2 bg-gray-100 rounded w-full"></div>
                <div className="h-2 bg-gray-100 rounded w-5/6"></div>
              </div>

              <p className="text-theme-text-muted text-sm mt-3">
                Clean, bright interface perfect for daytime use
              </p>
            </div>

            {/* Dark Theme */}
            <div
              onClick={() => handleThemeChange('dark')}
              className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
                theme === 'dark'
                  ? 'border-theme-accent bg-theme-accent/10'
                  : 'border-theme-border hover:border-theme-accent/50'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Dark Theme</h3>
                {theme === 'dark' && (
                  <div className="w-6 h-6 bg-theme-accent rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Dark Theme Preview */}
              <div className="bg-slate-900 rounded p-3 border border-slate-700 space-y-2">
                <div className="h-3 bg-slate-700 rounded w-3/4"></div>
                <div className="h-2 bg-slate-800 rounded w-full"></div>
                <div className="h-2 bg-slate-800 rounded w-5/6"></div>
              </div>

              <p className="text-theme-text-muted text-sm mt-3">
                Comfortable, dark interface for extended use
              </p>
            </div>
          </div>
        </section>

        {/* Theme Info Section */}
        <section className="bg-theme-surface border border-theme-border rounded-lg p-6">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            About Themes
          </h3>
          <ul className="space-y-2 text-sm text-theme-text-muted">
            <li>• Your theme preference is saved automatically</li>
            <li>• Light theme uses bright colors optimized for daytime environments</li>
            <li>• Dark theme reduces eye strain during long coding sessions</li>
            <li>• The interface adapts all components to your chosen theme</li>
          </ul>
        </section>
      </main>
    </div>
  );
};

export default ThemeSettingsPage;
