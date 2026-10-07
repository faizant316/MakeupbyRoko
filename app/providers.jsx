'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

export default function Providers({ children }) {
  // Reloads land at the top because layout.jsx turns off the browser's scroll
  // restoration in <head>, before anything renders. This effect used to do it
  // (plus a window.scrollTo(0, 0)) after hydration, which was harmless while the
  // homepage was a loading screen until then. It is server-rendered now, so a
  // visitor on a slow phone can already be scrolling when React takes over, and
  // that scrollTo yanked them back to the hero. Kept as a fallback only.
  useEffect(() => {
    history.scrollRestoration = 'manual';
  }, []);

  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { refetchOnWindowFocus: false, retry: 1 },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
