import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { localDay } from '../core/growth';
export function useToday() {
  const [today, setToday] = useState(() => localDay(new Date()));
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timer);
      const now = new Date();
      setToday(localDay(now));
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timer = setTimeout(refresh, Math.max(100, midnight.getTime() - now.getTime() + 25));
    };
    refresh();
    const check = setInterval(() => {
      setToday(localDay(new Date()));
    }, 60000);
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') refresh();
    });
    return () => {
      clearTimeout(timer);
      clearInterval(check);
      sub.remove();
    };
  }, []);
  return today;
}
