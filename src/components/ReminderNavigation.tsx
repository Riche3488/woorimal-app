import { useEffect, useRef } from 'react';
import { router, usePathname } from 'expo-router';
import type { NotificationResponse } from 'expo-notifications';
import { Notifications } from '../data/reminder';
import { REMINDER_OWNER, reminderNavigation } from '../core/reminder';
import { useGame } from '../state/GameProvider';
export function ReminderNavigation() {
  const game = useGame(),
    latest = useRef(game);
  latest.current = game;
  const pathname = usePathname(),
    latestPath = useRef(pathname);
  latestPath.current = pathname;
  const handled = useRef<string | null>(null);
  useEffect(() => {
    const notifications = Notifications;
    if (!notifications) return;
    let alive = true;
    const receive = (response: NotificationResponse | null) => {
      if (!alive || !response) return;
      const request = response.notification.request;
      const deliveryId = `${request.identifier}:${response.notification.date}`;
      if (request.content.data?.owner !== REMINDER_OWNER || handled.current === deliveryId) return;
      handled.current = deliveryId;
      const next = reminderNavigation(latestPath.current, !!latest.current.save.activeSession, latest.current.counts.due);
      if (next.action === 'push') router.push(next.href);else if (next.action === 'replace') router.replace(next.href);
      void notifications.clearLastNotificationResponseAsync().catch(() => {});
    };
    const sub = notifications.addNotificationResponseReceivedListener(receive);
    void notifications.getLastNotificationResponseAsync().then(receive).catch(() => {});
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return null;
}
