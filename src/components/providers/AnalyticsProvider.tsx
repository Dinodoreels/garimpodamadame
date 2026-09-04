import React from 'react';
import { usePageAnalytics } from '@/hooks/usePageAnalytics';

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  // Initialize page analytics tracking
  usePageAnalytics();

  return <>{children}</>;
}
