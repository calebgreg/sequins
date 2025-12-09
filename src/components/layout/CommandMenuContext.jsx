import React, { createContext, useContext, useState, useEffect } from 'react';

const CommandMenuContext = createContext({
  isOpen: false,
  setIsOpen: () => {},
  toggle: () => {}
});

export function CommandMenuProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = () => setIsOpen(prev => !prev);

  // Global keyboard shortcut
  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
    }
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return (
    <CommandMenuContext.Provider value={{ isOpen, setIsOpen, toggle }}>
      {children}
    </CommandMenuContext.Provider>
  );
}

export const useCommandMenu = () => useContext(CommandMenuContext);