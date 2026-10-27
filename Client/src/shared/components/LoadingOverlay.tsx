import { useId } from 'react';

interface SpinnerProps {
  className?: string;
}

/** Spinner SVG (theo ERP), màu lấy từ `color` hiện tại nên đổi bằng class text-*. */
export const Spinner = ({ className = '' }: SpinnerProps) => {
  const gradientId = useId();

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" className={className} aria-hidden="true">
      <linearGradient id={gradientId}>
        <stop offset="0" stopColor="currentColor" stopOpacity="0" />
        <stop offset="1" stopColor="currentColor" />
      </linearGradient>
      <circle
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="22"
        strokeLinecap="round"
        strokeDasharray="0 44 0 44 0 44 0 44 0 360"
        cx="100"
        cy="100"
        r="70"
        style={{ transformOrigin: 'center' }}
      >
        <animateTransform
          type="rotate"
          attributeName="transform"
          calcMode="discrete"
          dur="2"
          values="360;324;288;252;216;180;144;108;72;36"
          repeatCount="indefinite"
        />
      </circle>
    </svg>
  );
};

interface LoadingOverlayProps {
  show: boolean;
  /** Chữ dưới spinner, bỏ trống thì không hiện. */
  message?: string;
}

/** Lớp phủ loading toàn màn hình, chặn mọi thao tác trong lúc xử lý (vd đang đăng nhập). */
export const LoadingOverlay = ({ show, message }: LoadingOverlayProps) => {
  if (!show) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="fixed inset-0 z-1000 flex flex-col items-center justify-center gap-4 bg-white/30 backdrop-blur-[3px]"
    >
      <Spinner className="size-16 text-primary" />
      {message ? (
        <p className="text-base font-medium text-primary">{message}</p>
      ) : (
        <span className="sr-only">Đang tải</span>
      )}
    </div>
  );
};
