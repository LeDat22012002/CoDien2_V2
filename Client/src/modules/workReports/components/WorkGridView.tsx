import { Empty } from "antd";
import { useState } from "react";
import { UnitSheetSlider } from "@/modules/workReports/components/UnitSheetSlider";
import { PlanGridTable } from "@/modules/workReports/components/grid/PlanGridTable";
import { ReportGridTable } from "@/modules/workReports/components/grid/ReportGridTable";
import type {
  WeeklyForm,
  WorkGrid,
  WorkGridLayout,
} from "@/modules/workReports/types/workReports";

interface WorkGridViewProps {
  /** Lưới kế hoạch hoặc báo cáo (theo grid.phase). */
  grid: WorkGrid;
  /** Tổ/kíp đang lọc (ô lọc cạnh thanh tab); trống = tất cả. */
  unitFilter: number[];
  /** ALL: mọi tổ/kíp trong 1 bảng; SHEET: mỗi tổ/kíp 1 "sheet", chọn ở dãy slider phía trên bảng. */
  layout: WorkGridLayout;
}

const filterForms = <T extends WeeklyForm>(forms: T[], unitFilter: number[]) =>
  unitFilter.length === 0
    ? forms
    : forms.filter((form) => unitFilter.includes(form.unitId));

/**
 * Bảng công việc của xưởng (giống sheet Excel), cao hết tab, bảng tự cuộn: kế hoạch → PlanGridTable,
 * báo cáo → ReportGridTable (2 bảng, 2 API riêng). Vật tư của từng tổ/kíp nhập ở tab Vật tư xưởng.
 */
export const WorkGridView = ({
  grid,
  unitFilter,
  layout,
}: WorkGridViewProps) => {
  const [activeFormId, setActiveFormId] = useState<number>();

  if (grid.forms.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="Xưởng chưa có tổ/kíp nào bạn được xem trong tuần này."
      />
    );
  }

  const forms = filterForms<WeeklyForm>(grid.forms, unitFilter);
  // Kiểu xem theo sheet: sheet đang chọn không còn trong danh sách (đổi lọc / tuần) → về sheet đầu
  const activeForm =
    forms.find((form) => form.formId === activeFormId) ?? forms[0];
  const shownIds = new Set(
    layout === "ALL"
      ? forms.map((form) => form.formId)
      : activeForm
        ? [activeForm.formId]
        : [],
  );

  const table =
    grid.phase === "PLAN" ? (
      <PlanGridTable
        key={layout === "SHEET" ? activeForm?.formId : "all"}
        grid={grid}
        forms={grid.forms.filter((form) => shownIds.has(form.formId))}
      />
    ) : (
      // key: đổi sheet thì bỏ dòng đang sửa dở của sheet trước
      <ReportGridTable
        key={layout === "SHEET" ? activeForm?.formId : "all"}
        grid={grid}
        forms={grid.forms.filter((form) => shownIds.has(form.formId))}
      />
    );

  if (layout === "ALL") return table;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <UnitSheetSlider
        forms={forms}
        activeFormId={activeForm?.formId}
        onChange={setActiveFormId}
      />
      {table}
    </div>
  );
};
