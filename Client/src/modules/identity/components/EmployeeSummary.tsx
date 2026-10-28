import { Tag } from 'antd';
import type { ReactNode } from 'react';
import { EMPTY_TEXT } from '@/shared/utils/format';
import { UserAvatar } from '@/modules/identity/components/UserAvatar';

interface EmployeeSummaryProps {
  fullName: string;
  empCode: string;
  avatarUrl?: string | null;
  jobTitle?: string | null;
  orgUnitName?: string | null;
  isActing?: boolean;
  email?: string | null;
  phone?: string | null;
  avatarSize?: number;
  /** Nội dung dưới avatar (vd nút Đổi ảnh). */
  avatarExtra?: ReactNode;
}

/** Thẻ thông tin nhân viên gắn với tài khoản (chỉ xem; sửa ở trang Nhân viên). */
export const EmployeeSummary = ({
  fullName,
  empCode,
  avatarUrl,
  jobTitle,
  orgUnitName,
  isActing,
  email,
  phone,
  avatarSize = 56,
  avatarExtra,
}: EmployeeSummaryProps) => (
  <div className="flex items-start gap-3 rounded-md border border-border bg-bg-layout p-3">
    <div className="flex shrink-0 flex-col items-center gap-2">
      <UserAvatar fullName={fullName} avatarUrl={avatarUrl} size={avatarSize} />
      {avatarExtra}
    </div>
    <div className="min-w-0 flex-1 leading-snug">
      <div className="truncate text-base font-semibold">{fullName}</div>
      <div className="text-sm text-text-secondary">
        Tên đăng nhập: <span className="font-mono text-text">{empCode}</span>
      </div>
      <div className="truncate text-sm text-text-secondary">
        {isActing && (
          <Tag color="gold" className="me-1">
            Quyền
          </Tag>
        )}
        {[jobTitle, orgUnitName].filter(Boolean).join(' · ') || 'Chưa xếp vị trí trên sơ đồ tổ chức'}
      </div>
      <div className="truncate text-sm text-text-secondary">
        {email || EMPTY_TEXT} · {phone || EMPTY_TEXT}
      </div>
    </div>
  </div>
);
