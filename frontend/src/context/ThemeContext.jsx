import React, { createContext, useContext, useEffect, useState } from 'react';

// eslint-disable-next-line react-refresh/only-export-components
export const ThemeContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    // Set data-theme attribute for CSS variable switching (index.css)
    body.setAttribute('data-theme', theme);
    root.setAttribute('data-theme', theme);

    // Set .dark class for Tailwind dark: variant support
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
