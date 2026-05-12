import { useEffect, useRef, useState } from 'react';

const getDateKey = (dateValue = new Date()) => {
  const date = new Date(dateValue);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getMsUntilMidnight = () => {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.max(0, midnight.getTime() - now.getTime());
};

const formatCountdown = (ms) => {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value) => String(value).padStart(2, '0');

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

export default function useMidnightCountdown(active = true, onMidnight) {
  const [timeLeftMs, setTimeLeftMs] = useState(getMsUntilMidnight);
  const onMidnightRef = useRef(onMidnight);

  useEffect(() => {
    onMidnightRef.current = onMidnight;
  }, [onMidnight]);

  useEffect(() => {
    if (!active) {
      setTimeLeftMs(getMsUntilMidnight());
      return undefined;
    }

    let currentDateKey = getDateKey();

    const tick = () => {
      const nextDateKey = getDateKey();
      setTimeLeftMs(getMsUntilMidnight());

      if (nextDateKey !== currentDateKey) {
        currentDateKey = nextDateKey;
        onMidnightRef.current?.();
      }
    };

    tick();
    const timerId = setInterval(tick, 1000);

    return () => clearInterval(timerId);
  }, [active]);

  return {
    timeLeftMs,
    label: formatCountdown(timeLeftMs),
  };
}
