import { Empty, Select } from 'antd';
import { useMemo, useState } from 'react';
import { FormMaterialsDrawer } from '@/modules/workReports/components/FormMaterialsDrawer';
import { WorkGridTable } from '@/modules/workReports/components/WorkGridTable';
import type { WeeklyForm, WorkReportGrid } from '@/modules/workReports/types/workReports';

interface WorkGridViewProps {
  grid: WorkReportGrid;
}

/**
 * Bảng công việc của xưởng (giống sheet Excel, bảng tự cuộn): lọc tổ/kíp; mỗi tổ/kíp có nút Vật tư
 * trên dòng tiêu đề của tổ.
 */
export const WorkGridView = ({ grid }: WorkGridViewProps) => {
  const [unitFilter, setUnitFilter] = useState<number[]>([]);
  const [materialForm, setMaterialForm] = useState<WeeklyForm>();

  const forms = useMemo(
    () => (unitFilter.length === 0 ? grid.forms : grid.forms.filter((form) => unitFilter.includes(form.unitId))),
    [grid.forms, unitFilter],
  );
  // Dữ liệu lưới tải lại (sau khi lưu) → lấy form mới nhất cho Drawer đang mở
  const currentMaterialForm = grid.forms.find((form) => form.formId === materialForm?.formId) ?? materialForm;

  if (grid.forms.length === 0) {
    return (
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Xưởng chưa có tổ/kíp nào bạn được xem trong tuần này." />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {grid.forms.length > 1 && (
        <Select
          mode="multiple"
          allowClear
          aria-label="Lọc tổ/kíp"
          placeholder="Tất cả tổ/kíp"
          value={unitFilter}
          onChange={setUnitFilter}
          options={grid.forms.map((form) => ({
            value: form.unitId,
            label: `${form.orderLabel}. ${form.unitName}`,
          }))}
          maxTagCount="responsive"
          className="w-full md:max-w-xl"
        />
      )}

      <WorkGridTable grid={grid} forms={forms} onMaterials={setMaterialForm} />

      <FormMaterialsDrawer
        open={materialForm !== undefined}
        form={currentMaterialForm}
        phase={grid.phase}
        week={grid.week}
        onClose={() => setMaterialForm(undefined)}
      />
    </div>
  );
};
