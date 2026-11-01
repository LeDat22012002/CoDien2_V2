import type { PublishStatus } from '@/modules/documents/types/documents';

/** Trạng thái ban hành, giữ đồng bộ với PublishStatuses ở Server (dữ liệu cũ: chua / co / huy). */
export const PUBLISH_STATUS_META: Record<PublishStatus, { label: string; color: string }> = {
  PENDING: { label: 'Chưa ban hành', color: 'default' },
  PUBLISHED: { label: 'Đã ban hành', color: 'green' },
  CANCELLED: { label: 'Đã hủy', color: 'red' },
};

export const PUBLISH_STATUS_OPTIONS = (Object.keys(PUBLISH_STATUS_META) as PublishStatus[]).map((status) => ({
  value: status,
  label: PUBLISH_STATUS_META[status].label,
}));

export const isPublishStatus = (value: string | null): value is PublishStatus =>
  value !== null && value in PUBLISH_STATUS_META;

export const DOCUMENT_ADMIN_PAGE_SIZE = 20;
export const DOCUMENT_ADMIN_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
