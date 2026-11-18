import {
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import { Button, Tooltip } from "antd";
import { toShortName } from "@/modules/workReports/utils/workReportUtils";

/** Nút lưu / hủy của dòng đang sửa. */
export const EditingActions = ({
  saving,
  onSave,
  onCancel,
}: {
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) => (
  <div className="flex justify-center">
    <Tooltip title="Lưu (Enter)">
      <Button
        type="text"
        size="small"
        aria-label="Lưu dòng"
        icon={<SaveOutlined className="text-primary" />}
        loading={saving}
        onClick={onSave}
      />
    </Tooltip>
    <Tooltip title="Hủy (Esc)">
      <Button
        type="text"
        size="small"
        aria-label="Hủy sửa"
        icon={<CloseOutlined />}
        onClick={onCancel}
      />
    </Tooltip>
  </div>
);

/** 3 chấm nhấp nhô "đang nhập". */
const TypingDots = () => (
  <span className="inline-flex items-end gap-0.5" aria-hidden>
    {[0, 0.2, 0.4].map((delay) => (
      <span
        key={delay}
        className="size-1 animate-typing-dot rounded-full bg-current"
        style={{ animationDelay: `${delay}s` }}
      />
    ))}
  </span>
);

/** Người khác đang nhập: bút + tên (2 chữ cuối) + 3 chấm động; rê chuột thấy họ tên đầy đủ. */
export const EditingByBadge = ({ names }: { names: string[] }) => {
  const label = `${names.join(", ")} đang nhập`;
  return (
    <Tooltip title={label}>
      <span
        className="inline-flex flex-wrap items-center justify-center gap-x-1 text-xs text-warning"
        aria-label={label}
      >
        <EditOutlined />
        <span>{names.map(toShortName).join(", ")}</span>
        <TypingDots />
      </span>
    </Tooltip>
  );
};

/** Nút sửa / xóa của 1 dòng (ẩn nút không có quyền); người khác đang nhập thì hiện người đó thay nút. */
export const ItemActions = ({
  code,
  canUpdate,
  canDelete,
  disabled,
  lockedBy,
  onEdit,
  onDelete,
}: {
  code: string;
  canUpdate: boolean;
  canDelete: boolean;
  disabled: boolean;
  /** Tên người khác đang sửa dòng này. */
  lockedBy?: string;
  onEdit: () => void;
  onDelete: () => void;
}) =>
  lockedBy ? (
    <EditingByBadge names={[lockedBy]} />
  ) : (
    <div className="flex justify-center">
      {canUpdate && (
        <Tooltip title="Sửa (double-click dòng)">
          <Button
            type="text"
            size="small"
            aria-label={`Sửa dòng ${code}`}
            icon={<EditOutlined className="text-primary" />}
            disabled={disabled}
            onClick={onEdit}
          />
        </Tooltip>
      )}
      {canDelete && (
        <Tooltip title="Xóa">
          <Button
            type="text"
            size="small"
            danger
            aria-label={`Xóa dòng ${code}`}
            icon={<DeleteOutlined />}
            disabled={disabled}
            onClick={onDelete}
          />
        </Tooltip>
      )}
    </div>
  );
