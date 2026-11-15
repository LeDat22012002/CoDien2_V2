import { AimOutlined, LeftOutlined, ReloadOutlined, RightOutlined } from '@ant-design/icons';
import { Button, Empty, Segmented, Select, Skeleton, Tabs, Tooltip, Typography } from 'antd';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { ErrorState } from '@/shared/components/ErrorState';
import { PageHeader } from '@/shared/components/PageHeader';
import { formatDateTime } from '@/shared/utils/format';
import { UnitManagementPanel } from '@/modules/workReports/components/UnitManagementPanel';
import { WorkGridView } from '@/modules/workReports/components/WorkGridView';
import { WorkshopMaterialTable } from '@/modules/workReports/components/WorkshopMaterialTable';
import { WorkSummaryTable } from '@/modules/workReports/components/WorkSummaryTable';
import { PHASE_OPTIONS } from '@/modules/workReports/constants/workReportOptions';
import {
  useMyWorkReportScope,
  useWorkingWeeks,
  useWorkReportGrid,
  useWorkWeeks,
} from '@/modules/workReports/hooks/useWorkReportQueries';
import type { WorkReportFilter, WorkReportPhase } from '@/modules/workReports/types/workReports';

type TabKey = 'grid' | 'summary' | 'materials' | 'units';

/** Tham số trên URL để F5 / gửi link giữ đúng xưởng, tuần, giai đoạn, tab. */
const PARAMS = { workshop: 'ws', week: 'week', year: 'year', phase: 'phase', tab: 'tab' } as const;
type ParamKey = keyof typeof PARAMS;

const TAB_KEYS: TabKey[] = ['grid', 'summary', 'materials', 'units'];

/**
 * - submit: trang kỹ sư /member/work-reports (quyền work-reports.submit), nhập tổ/kíp được phân công.
 * - manage: trang quản trị /admin/work-reports (work-reports.manage) cho đội trưởng, quản đốc: xem/sửa đội/xưởng mình,
 *   thêm tab Đơn vị & kỹ sư.
 * - factory: trang công khai /work-reports cho Ban Giám đốc (ai cũng xem được, không cần đăng nhập), chỉ xem mọi xưởng;
 *   bọc trong WorkReportPublicContext để gọi API /work-reports/public/*.
 */
export type WorkReportWorkspaceMode = 'submit' | 'manage' | 'factory';

const MODE_TEXT: Record<WorkReportWorkspaceMode, { title: string; description: string; empty: string }> = {
  submit: {
    title: 'Báo cáo công việc tuần',
    description: 'Lập kế hoạch và báo cáo công việc tuần của tổ/kíp bạn phụ trách.',
    empty: 'Bạn chưa được phân công phụ trách tổ/kíp nào. Liên hệ đội trưởng hoặc quản đốc để được phân công.',
  },
  manage: {
    title: 'Quản lý báo cáo tuần',
    description: 'Kế hoạch, báo cáo công việc tuần của đội/xưởng; phân công kỹ sư phụ trách tổ/kíp.',
    empty:
      'Bạn chưa là trưởng/phó đội hoặc xưởng nào trên sơ đồ tổ chức. Liên hệ quản trị để cập nhật chức vụ trên sơ đồ.',
  },
  factory: {
    title: 'Báo cáo công việc tuần',
    description: 'Kế hoạch và báo cáo công việc tuần của các xưởng.',
    empty: 'Chưa có xưởng nào có đơn vị báo cáo tuần.',
  },
};

interface WorkReportWorkspaceProps {
  mode: WorkReportWorkspaceMode;
}

/**
 * Màn hình báo cáo công việc tuần dùng chung cho 3 trang (xem WorkReportWorkspaceMode); dữ liệu Server lọc theo
 * quyền + phạm vi trên sơ đồ tổ chức. Chọn xưởng, giai đoạn (Báo cáo tuần / Kế hoạch tuần), tuần; tab Bảng công việc,
 * Tổng hợp, Vật tư xưởng (+ Đơn vị & kỹ sư ở trang quản lý). Mặc định mở tuần đang làm việc của giai đoạn.
 */
export const WorkReportWorkspace = ({ mode }: WorkReportWorkspaceProps) => {
  const text = MODE_TEXT[mode];
  const [searchParams, setSearchParams] = useSearchParams();
  const scopeQuery = useMyWorkReportScope();
  const workshops = scopeQuery.data?.workshops ?? [];

  const workshopParam = Number(searchParams.get(PARAMS.workshop)) || undefined;
  const workshop = workshops.find((item) => item.workshopId === workshopParam) ?? workshops[0];
  const workshopId = workshop?.workshopId;
  const phase: WorkReportPhase = searchParams.get(PARAMS.phase) === 'PLAN' ? 'PLAN' : 'REPORT';
  const tabParam = searchParams.get(PARAMS.tab) as TabKey | null;

  const workingWeeksQuery = useWorkingWeeks(workshopId);
  const workingWeek =
    phase === 'REPORT' ? workingWeeksQuery.data?.reportWeek : workingWeeksQuery.data?.planWeek;
  const year = Number(searchParams.get(PARAMS.year)) || workingWeek?.isoYear;
  const weeksQuery = useWorkWeeks(year, workshopId);
  const weeks = useMemo(() => weeksQuery.data ?? [], [weeksQuery.data]);

  // Tuần: theo URL; không có thì tuần đang làm việc (hoặc tuần đầu năm khi đã đổi năm)
  const weekParam = Number(searchParams.get(PARAMS.week)) || undefined;
  const weekId =
    weekParam ??
    (workingWeek && (!searchParams.get(PARAMS.year) || weeks.some((week) => week.id === workingWeek.id))
      ? workingWeek.id
      : weeks[0]?.id);
  const weekIndex = weeks.findIndex((week) => week.id === weekId);
  const selectedWeek = weeks[weekIndex] ?? (workingWeek?.id === weekId ? workingWeek : undefined);

  const canManageUnits =
    mode === 'manage' &&
    (Boolean(workshop?.isManager) || Boolean(workshop?.units.some((unit) => unit.canManageEngineers)));
  const tab: TabKey = tabParam && TAB_KEYS.includes(tabParam) && (tabParam !== 'units' || canManageUnits) ? tabParam : 'grid';

  const filter: WorkReportFilter | undefined =
    workshopId && weekId ? { workshopId, weekId, phase } : undefined;
  const gridQuery = useWorkReportGrid(tab === 'grid' ? filter : undefined);

  const updateParams = (patch: Partial<Record<ParamKey, string | number | undefined>>) =>
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        Object.entries(patch).forEach(([key, value]) => {
          const param = PARAMS[key as ParamKey];
          if (value === undefined || value === '') next.delete(param);
          else next.set(param, String(value));
        });
        return next;
      },
      { replace: true },
    );

  if (scopeQuery.isLoading) return <Skeleton active paragraph={{ rows: 8 }} />;
  if (scopeQuery.isError) return <ErrorState error={scopeQuery.error} onRetry={() => scopeQuery.refetch()} />;
  if (!workshop) {
    return (
      <div>
        <PageHeader title={text.title} />
        <Empty description={text.empty} />
      </div>
    );
  }

  const weekOptions = weeks.map((week) => ({ value: week.id, label: week.label }));
  const yearOptions = workingWeek
    ? [workingWeek.isoYear - 1, workingWeek.isoYear, workingWeek.isoYear + 1].map((value) => ({ value, label: `Năm ${value}` }))
    : [];

  const toolbar = (
    <div className="flex flex-col gap-3 rounded-md bg-bg-container p-3 md:p-4">
      <div className="flex flex-wrap items-center gap-2">
        {workshops.length > 1 && (
          <Select
            aria-label="Chọn xưởng"
            value={workshopId}
            onChange={(value: number) => updateParams({ workshop: value, week: undefined, year: undefined })}
            options={workshops.map((item) => ({ value: item.workshopId, label: item.workshopName }))}
            showSearch
            optionFilterProp="label"
            className="w-full sm:w-72"
          />
        )}
        <Segmented<WorkReportPhase>
          aria-label="Giai đoạn"
          options={PHASE_OPTIONS}
          value={phase}
          // Đổi giai đoạn → về tuần đang làm việc của giai đoạn đó
          onChange={(value) => updateParams({ phase: value === 'REPORT' ? undefined : value, week: undefined, year: undefined })}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Tooltip title="Tuần trước">
          <Button
            aria-label="Tuần trước"
            icon={<LeftOutlined />}
            disabled={weekIndex <= 0}
            onClick={() => updateParams({ week: weeks[weekIndex - 1]?.id })}
          />
        </Tooltip>
        <Select
          aria-label="Chọn tuần"
          value={weekId}
          onChange={(value: number) => updateParams({ week: value })}
          options={weekOptions}
          loading={weeksQuery.isFetching}
          showSearch
          optionFilterProp="label"
          className="min-w-0 flex-1 sm:max-w-96"
        />
        <Tooltip title="Tuần sau">
          <Button
            aria-label="Tuần sau"
            icon={<RightOutlined />}
            disabled={weekIndex < 0 || weekIndex >= weeks.length - 1}
            onClick={() => updateParams({ week: weeks[weekIndex + 1]?.id })}
          />
        </Tooltip>
        <Select
          aria-label="Chọn năm"
          value={year}
          onChange={(value: number) => updateParams({ year: value, week: undefined })}
          options={yearOptions}
          className="w-32"
        />
        <Tooltip title={phase === 'REPORT' ? 'Tuần đang nhập báo cáo' : 'Tuần đang lập kế hoạch'}>
          <Button
            icon={<AimOutlined />}
            disabled={!workingWeek || weekId === workingWeek.id}
            onClick={() => updateParams({ week: undefined, year: undefined })}
          >
            Tuần hiện tại
          </Button>
        </Tooltip>
        <Tooltip title="Tải lại">
          <Button
            aria-label="Tải lại"
            icon={<ReloadOutlined />}
            loading={gridQuery.isFetching}
            onClick={() => {
              scopeQuery.refetch();
              gridQuery.refetch();
            }}
          />
        </Tooltip>
      </div>

      {selectedWeek && (
        <Typography.Text type="secondary">
          Hạn {phase === 'REPORT' ? 'báo cáo' : 'kế hoạch'} tuần {String(selectedWeek.isoWeek).padStart(2, '0')}:{' '}
          <Typography.Text strong>
            {formatDateTime(phase === 'REPORT' ? selectedWeek.effectiveReportDeadlineAt : selectedWeek.effectivePlanDeadlineAt)}
          </Typography.Text>
          {phase === 'REPORT'
            ? ' · Báo cáo mở từ 00:00 thứ 2 của tuần.'
            : ' · Ở giai đoạn báo cáo, dòng kế hoạch không xóa và không sửa giờ công kế hoạch.'}
        </Typography.Text>
      )}
    </div>
  );

  const renderGrid = () => {
    if (!filter) return <Skeleton active />;
    if (gridQuery.isError && !gridQuery.data) {
      return <ErrorState error={gridQuery.error} onRetry={() => gridQuery.refetch()} />;
    }
    if (!gridQuery.data) return <Skeleton active paragraph={{ rows: 10 }} />;
    return <WorkGridView grid={gridQuery.data} />;
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={text.title} description={gridQuery.data?.title ?? text.description} />
      {toolbar}
      <div className="rounded-md bg-bg-container p-3 md:p-4">
        <Tabs
          activeKey={tab}
          onChange={(key) => updateParams({ tab: key === 'grid' ? undefined : key })}
          destroyOnHidden
          items={[
            { key: 'grid', label: 'Bảng công việc', children: renderGrid() },
            {
              key: 'summary',
              label: 'Tổng hợp',
              children: filter ? <WorkSummaryTable filter={filter} /> : <Skeleton active />,
            },
            {
              key: 'materials',
              label: 'Vật tư xưởng',
              children: filter ? <WorkshopMaterialTable filter={filter} /> : <Skeleton active />,
            },
            ...(canManageUnits
              ? [
                  {
                    key: 'units',
                    label: 'Đơn vị & kỹ sư',
                    children: <UnitManagementPanel workshopId={workshop.workshopId} isManager={workshop.isManager} />,
                  },
                ]
              : []),
          ]}
        />
      </div>
    </div>
  );
};
