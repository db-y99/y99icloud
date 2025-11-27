"use client";

import React, { createContext, useState, useContext, ReactNode, useCallback } from "react";

interface PageActionsContextType {
  actions: ReactNode;
  setActions: (actions: ReactNode) => void;
  clearActions: () => void;
}

const PageActionsContext = createContext<PageActionsContextType | undefined>(
  undefined
);

export function PageActionsProvider({ children }: { children: ReactNode }) {
  const [actions, setActions] = useState<ReactNode>(null);

  const clearActions = useCallback(() => {
    setActions(null);
  }, []);

  const value = { actions, setActions, clearActions };

  return (
    <PageActionsContext.Provider value={value}>
      {children}
    </PageActionsContext.Provider>
  );
}

export function usePageActions() {
  const context = useContext(PageActionsContext);
  if (context === undefined) {
    throw new Error("usePageActions must be used within a PageActionsProvider");
  }
  return context;
}
