import { useEffect, useRef } from 'react';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { REMINDER_OWNER, reminderDestination } from '../core/reminder';
import { useGame } from '../state/GameProvider';
export function ReminderNavigation() {
  const game = useGame(),
    latest = useRef(game);
  latest.current = game;
  const handled = useRef<string | null>(null);
  useEffect(() => {
    let alive = true;
    const receive = (response: Notifications.NotificationResponse | null) => {
      if (!alive || !response) return;
      const request = response.notification.request;
      if (request.content.data?.owner !== REMINDER_OWNER || handled.current === request.identifier) return;
      handled.current = request.identifier;
      router.push(reminderDestination(!!latest.current.save.activeSession, latest.current.counts.due));
      void Notifications.clearLastNotificationResponseAsync().catch(() => {});
    };
    const sub = Notifications.addNotificationResponseReceivedListener(receive);
    void Notifications.getLastNotificationResponseAsync().then(receive).catch(() => {});
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return null;
}
