import { Tag } from 'antd';
import { LEVEL_TAG_COLOR } from '@/shared/constants/organization';
import { formatDate } from '@/shared/utils/format';

interface PositionCardProps {
  /** Nhãn nhỏ phía trên (vd "Hiện tại", "Sau khi lưu"). */
  label?: string;
  levelCode?: string;
  levelName?: string;
  unitName?: string;
  jobTitle?: string | null;
  isActing?: boolean;
  /** False = kiêm nhiệm. */
  isPrimary?: boolean;
  startDate?: string;
  /** Có giá trị thì hiện câu này thay cho thông tin vị trí. */
  emptyText?: string | null;
  isHighlighted?: boolean;
}

/** Thẻ hiển thị 1 vị trí trên sơ đồ tổ chức. */
export const PositionCard = ({
  label,
  levelCode,
  levelName,
  unitName,
  jobTitle,
  isActing,
  isPrimary = true,
  startDate,
  emptyText,
  isHighlighted,
}: PositionCardProps) => (
  <div
    className={`min-w-0 flex-1 rounded-md border border-solid px-3 py-2 ${
      isHighlighted ? 'border-primary bg-blue-50' : 'border-slate-200 bg-slate-50'
    }`}
  >
    {label && <div className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{label}</div>}
    {emptyText ? (
      <div className="mt-0.5 text-sm italic text-text-secondary">{emptyText}</div>
    ) : (
      <>
        <div className="mt-0.5 flex flex-wrap items-center gap-1 text-sm font-semibold">
          {isActing && <Tag color="gold">Quyền</Tag>}
          {!isPrimary && <Tag>Kiêm nhiệm</Tag>}
          {levelCode ? <Tag color={LEVEL_TAG_COLOR[levelCode]}>{levelName}</Tag> : levelName}
          <span>{unitName}</span>
        </div>
        {jobTitle && (
          <div className="mt-0.5 truncate text-sm text-text-secondary" title={jobTitle}>
            {jobTitle}
          </div>
        )}
        {startDate && <div className="text-sm text-text-secondary">Từ {formatDate(startDate)}</div>}
      </>
    )}
  </div>
);
