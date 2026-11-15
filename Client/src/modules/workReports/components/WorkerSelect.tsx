import { Segmented, Select, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { WORKER_SCOPE_OPTIONS } from '@/modules/workReports/constants/workReportOptions';
import { useWorkerOptions } from '@/modules/workReports/hooks/useWorkReportQueries';
import type { WorkerOptionScope, WorkItemWorker } from '@/modules/workReports/types/workReports';
import { EMPLOYEE_PREFIX, toWorkerValue } from '@/modules/workReports/utils/workReportUtils';

const SEARCH_DEBOUNCE_MS = 300;

interface WorkerSelectProps {
  unitId: number;
  value?: string[];
  onChange?: (value: string[]) => void;
  /** Người đang có trên dòng (để hiện đúng tên khi chưa tìm). */
  initialWorkers?: WorkItemWorker[];
  ariaLabel?: string;
}

/**
 * Chọn người thực hiện: gợi ý nhân viên của tổ/kíp (mở rộng đội → xưởng), hoặc gõ tên tự do rồi Enter.
 * Số người = số mục đã chọn.
 */
export const WorkerSelect = ({ unitId, value, onChange, initialWorkers = [], ariaLabel }: WorkerSelectProps) => {
  const [scope, setScope] = useState<WorkerOptionScope>('UNIT');
  const [keyword, setKeyword] = useState('');
  const debouncedKeyword = useDebouncedValue(keyword.trim(), SEARCH_DEBOUNCE_MS);
  const optionsQuery = useWorkerOptions(unitId, scope, debouncedKeyword);

  const options = useMemo(() => {
    const known = new Map<string, { value: string; label: string }>();
    initialWorkers.forEach((worker) =>
      known.set(toWorkerValue(worker), {
        value: toWorkerValue(worker),
        label: worker.empCode ? `${worker.displayName} (${worker.empCode})` : worker.displayName,
      }),
    );
    (optionsQuery.data ?? []).forEach((option) =>
      known.set(`${EMPLOYEE_PREFIX}${option.employeeId}`, {
        value: `${EMPLOYEE_PREFIX}${option.employeeId}`,
        label: `${option.fullName} (${option.empCode})`,
      }),
    );
    return [...known.values()];
  }, [initialWorkers, optionsQuery.data]);

  return (
    <Select
      mode="tags"
      value={value}
      onChange={(next: string[]) => {
        onChange?.(next);
        setKeyword('');
      }}
      searchValue={keyword}
      onSearch={setKeyword}
      options={options}
      optionFilterProp="label"
      tokenSeparators={[',', ';']}
      maxTagCount="responsive"
      placeholder="Chọn hoặc gõ tên"
      aria-label={ariaLabel ?? 'Người thực hiện'}
      loading={optionsQuery.isFetching}
      className="w-full"
      popupRender={(menu) => (
        <div>
          <div className="flex items-center gap-2 px-2 pb-2">
            <Typography.Text type="secondary" className="shrink-0">
              Gợi ý trong
            </Typography.Text>
            <Segmented<WorkerOptionScope>
              size="small"
              options={WORKER_SCOPE_OPTIONS}
              value={scope}
              onChange={setScope}
              onMouseDown={(event) => event.preventDefault()}
            />
          </div>
          {menu}
          <Typography.Text type="secondary" className="block px-2 pt-2 text-sm">
            Không có trong danh sách: gõ tên rồi nhấn Enter.
          </Typography.Text>
        </div>
      )}
    />
  );
};
