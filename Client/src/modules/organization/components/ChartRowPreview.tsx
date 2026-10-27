import { Card, Tag } from 'antd';
import type { PositionLevel } from '@/shared/types/organization';
import { CHART_ROW_HINT, CHART_ROWS } from '@/modules/organization/constants/organization';

interface ChartRowPreviewProps {
  /** Danh sách cấp bậc đã áp giá trị đang sửa. */
  levels: PositionLevel[];
  editingCode?: string;
}

/** Minh họa 6 hàng trên sơ đồ tổ chức và các cấp bậc nằm ở mỗi hàng. */
export const ChartRowPreview = ({ levels, editingCode }: ChartRowPreviewProps) => (
  <Card size="small" title="Xem trước các hàng trên sơ đồ">
    <div className="flex flex-col gap-1.5">
      {CHART_ROWS.map((row) => {
        const items = levels.filter((level) => level.chartRow === row);
        return (
          <div key={row} className="flex items-start gap-2 rounded-md border border-solid border-slate-200 px-2 py-1.5">
            <div className="w-28 shrink-0 leading-tight">
              <div className="text-sm font-semibold">Hàng {row}</div>
              <div className="text-sm text-text-secondary">{CHART_ROW_HINT[row]}</div>
            </div>
            <div className="flex flex-wrap gap-1">
              {items.length > 0 ? (
                items.map((level) => (
                  <Tag key={level.code} color={level.code === editingCode ? 'processing' : 'default'}>
                    {level.name}
                  </Tag>
                ))
              ) : (
                <span className="text-sm italic text-text-secondary">trống</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
    <div className="mt-2 text-sm leading-snug text-text-secondary">
      Cấp trưởng đặt cùng hàng hoặc thấp hơn cấp thành viên của nó thì khối thành viên tự đẩy xuống hàng kế tiếp.
    </div>
  </Card>
);
