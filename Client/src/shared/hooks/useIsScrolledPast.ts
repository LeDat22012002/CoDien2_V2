import { useEffect, useState } from 'react';

/**
 * True khi trang đã cuộn quá `threshold` px. Chỉ đổi state khi vượt ngưỡng (không re-render mỗi lần cuộn),
 * listener passive + requestAnimationFrame để không làm giật khi cuộn.
 */
export const useIsScrolledPast = (threshold: number) => {
  const [isScrolledPast, setIsScrolledPast] = useState(() => window.scrollY > threshold);

  useEffect(() => {
    let frameId = 0;
    const handleScroll = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => setIsScrolledPast(window.scrollY > threshold));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(frameId);
    };
  }, [threshold]);

  return isScrolledPast;
};
