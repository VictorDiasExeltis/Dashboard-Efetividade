'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface HeaderState {
  title?: string;
  subtitle?: string;
  filters?: ReactNode;
}

interface LayoutContextType {
  headerState: HeaderState;
  setHeaderState: (state: HeaderState) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [headerState, setHeaderState] = useState<HeaderState>({});

  return (
    <LayoutContext.Provider value={{ headerState, setHeaderState }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
}
