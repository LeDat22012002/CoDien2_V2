import { useEffect, useState } from 'react';

/** Trả về `value` sau khi ngừng thay đổi `delayMs` ms (dùng cho ô tìm kiếm gọi API). */
export const useDebouncedValue = <T>(value: T, delayMs: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timerId = window.setTimeout(() => setDebouncedValue(value), delayMs);
    return () => window.clearTimeout(timerId);
  }, [value, delayMs]);

  return debouncedValue;
};
