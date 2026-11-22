import { useEffect, useRef } from 'react';
import { router } from 'expo-router';
import type { NotificationResponse } from 'expo-notifications';
import { Notifications } from '../data/reminder';
import { REMINDER_OWNER, reminderDestination } from '../core/reminder';
import { useGame } from '../state/GameProvider';
export function ReminderNavigation() {
  const game = useGame(),
    latest = useRef(game);
  latest.current = game;
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
      router.push(reminderDestination(!!latest.current.save.activeSession, latest.current.counts.due));
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
