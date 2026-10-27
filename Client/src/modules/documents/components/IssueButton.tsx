import { LoadingOutlined } from '@ant-design/icons';
import type { ReactNode } from 'react';

interface IssueButtonProps {
  children: ReactNode;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
  onClick: () => void;
}

/** Nút "Lấy số" giống Button hệ thống cũ: nền màu chủ đạo, chữ trắng; bị khóa thì nền xám mờ. */
export const IssueButton = ({ children, disabled = false, isLoading = false, className = '', onClick }: IssueButtonProps) => {
  const isDisabled = disabled || isLoading;

  return (
    <button
      type="button"
      disabled={isDisabled}
      aria-busy={isLoading}
      onClick={() => {
        if (!isDisabled) onClick();
      }}
      className={`my-2 inline-flex w-fit items-center justify-center gap-2 rounded-md border-0 px-4 py-2 text-white transition ${
        isDisabled ? 'cursor-not-allowed bg-gray-400 opacity-60' : 'cursor-pointer bg-primary hover:bg-blue-800'
      } ${className}`}
    >
      {isLoading && <LoadingOutlined aria-hidden />}
      {children}
    </button>
  );
};
