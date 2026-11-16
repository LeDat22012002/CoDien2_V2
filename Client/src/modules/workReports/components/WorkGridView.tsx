import { Empty } from "antd";
import { useMemo, useState } from "react";
import { UnitSheetSlider } from "@/modules/workReports/components/UnitSheetSlider";
import { WorkGridTable } from "@/modules/workReports/components/WorkGridTable";
import type {
  WorkGridLayout,
  WorkReportGrid,
} from "@/modules/workReports/types/workReports";

interface WorkGridViewProps {
  grid: WorkReportGrid;
  /** Tổ/kíp đang lọc (ô lọc cạnh thanh tab); trống = tất cả. */
  unitFilter: number[];
  /** ALL: mọi tổ/kíp trong 1 bảng; SHEET: mỗi tổ/kíp 1 "sheet", chọn ở dãy slider phía trên bảng. */
  layout: WorkGridLayout;
}

/**
 * Bảng công việc của xưởng (giống sheet Excel), cao hết tab, bảng tự cuộn.
 * Vật tư của từng tổ/kíp nhập ở tab Vật tư xưởng.
 */
export const WorkGridView = ({
  grid,
  unitFilter,
  layout,
}: WorkGridViewProps) => {
  const [activeFormId, setActiveFormId] = useState<number>();

  const forms = useMemo(
    () =>
      unitFilter.length === 0
        ? grid.forms
        : grid.forms.filter((form) => unitFilter.includes(form.unitId)),
    [grid.forms, unitFilter],
  );

  if (grid.forms.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="Xưởng chưa có tổ/kíp nào bạn được xem trong tuần này."
      />
    );
  }

  if (layout === "ALL") return <WorkGridTable grid={grid} forms={forms} />;

  // Sheet đang chọn không còn trong danh sách (đổi lọc / tuần) → về sheet đầu
  const activeForm =
    forms.find((form) => form.formId === activeFormId) ?? forms[0];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <UnitSheetSlider
        forms={forms}
        activeFormId={activeForm?.formId}
        onChange={setActiveFormId}
      />
      {/* key: đổi sheet thì bỏ dòng đang sửa dở của sheet trước */}
      <WorkGridTable
        key={activeForm?.formId}
        grid={grid}
        forms={activeForm ? [activeForm] : []}
      />
    </div>
  );
};
