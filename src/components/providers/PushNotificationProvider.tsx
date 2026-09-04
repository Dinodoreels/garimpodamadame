import { usePushSubscription } from '@/hooks/usePushSubscription';

export function PushNotificationProvider({ children }: { children: React.ReactNode }) {
  usePushSubscription();
  return <>{children}</>;
}
