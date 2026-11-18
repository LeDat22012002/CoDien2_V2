import { PlusOutlined } from "@ant-design/icons";
import { Button, Typography } from "antd";
import type { ReactNode } from "react";
import { CollapseToggle } from "@/modules/workReports/components/collapsible/CollapseToggle";
import { FormStatusTag } from "@/modules/workReports/components/FormStatusTag";
import { FormUnlockButton } from "@/modules/workReports/components/grid/FormUnlockButton";
import { EditingByBadge } from "@/modules/workReports/components/grid/GridRowActions";
import type {
  WeeklyFormBase,
  WorkCategory,
  WorkReportPhase,
} from "@/modules/workReports/types/workReports";

/**
 * Dòng tiêu đề tổ/kíp: thứ tự La Mã, tên, trạng thái, mở khóa, nút riêng của bảng (extra),
 * người khác đang thêm dòng mới ở tổ/kíp này (cập nhật tức thì).
 */
export const SheetUnitHeader = ({
  form,
  phase,
  expanded,
  onToggle,
  collapsedLabel,
  extra,
  editorNames = [],
}: {
  form: WeeklyFormBase;
  phase: WorkReportPhase;
  expanded: boolean;
  onToggle: () => void;
  collapsedLabel: string;
  extra?: ReactNode;
  editorNames?: string[];
}) => (
  // sticky: nội dung luôn thấy khi cuộn ngang bảng
  <div className="sticky inset-s-2 inline-flex items-center gap-x-3 whitespace-nowrap">
    <CollapseToggle expanded={expanded} onToggle={onToggle}>
      <Typography.Text strong>
        {form.orderLabel}. {form.unitName}
      </Typography.Text>
      {!expanded && (
        <Typography.Text type="secondary">· {collapsedLabel}</Typography.Text>
      )}
    </CollapseToggle>
    {/* Đang nhập (mở) là bình thường: chỉ hiện Đã khóa / Chưa tới tuần */}
    {form.status !== "OPEN" && <FormStatusTag status={form.status} />}
    <FormUnlockButton form={form} phase={phase} />
    {extra}
    {editorNames.length > 0 && <EditingByBadge names={editorNames} />}
  </div>
);

/** Dòng tiêu đề đầu mục: chữ nhóm, tên, số dòng, nút thêm dòng (khi được thêm). */
export const SheetGroupHeader = ({
  category,
  count,
  suggestionCount = 0,
  expanded,
  onToggle,
  canAdd,
  onAdd,
}: {
  category: WorkCategory;
  count: number;
  suggestionCount?: number;
  expanded: boolean;
  onToggle: () => void;
  canAdd: boolean;
  onAdd: () => void;
}) => (
  <div className="sticky inset-s-2 inline-flex items-center gap-2 whitespace-nowrap">
    <CollapseToggle expanded={expanded} onToggle={onToggle}>
      <Typography.Text strong>
        {category.groupLetter}. {category.name}
      </Typography.Text>
      <Typography.Text type="secondary">
        ({category.code}) · {count} dòng
        {suggestionCount > 0 ? ` · ${suggestionCount} gợi ý từ kế hoạch` : ""}
      </Typography.Text>
    </CollapseToggle>
    {canAdd && (
      <Button size="small" type="link" icon={<PlusOutlined />} onClick={onAdd}>
        Thêm dòng
      </Button>
    )}
  </div>
);
