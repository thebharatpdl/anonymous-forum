import React, { createContext, useContext, useRef } from "react";

type FeedContextType = {
  triggerRefresh: () => void;
  onRefresh: (fn: () => void) => void;
};

const FeedContext = createContext<FeedContextType | null>(null);

export function FeedProvider({ children }: { children: React.ReactNode }) {
  const listenerRef = useRef<(() => void) | null>(null);

  const triggerRefresh = () => {
    listenerRef.current?.();
  };

  const onRefresh = (fn: () => void) => {
    listenerRef.current = fn;
  };

  return (
    <FeedContext.Provider value={{ triggerRefresh, onRefresh }}>
      {children}
    </FeedContext.Provider>
  );
}

export function useFeed() {
  const ctx = useContext(FeedContext);
  if (!ctx) throw new Error("useFeed must be used inside FeedProvider");
  return ctx;
}