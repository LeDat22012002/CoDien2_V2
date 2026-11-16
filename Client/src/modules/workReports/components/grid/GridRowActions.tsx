import {
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import { Button, Tooltip } from "antd";

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

/** Nút sửa / xóa của 1 dòng (ẩn nút không có quyền). */
export const ItemActions = ({
  code,
  canUpdate,
  canDelete,
  disabled,
  onEdit,
  onDelete,
}: {
  code: string;
  canUpdate: boolean;
  canDelete: boolean;
  disabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) => (
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
