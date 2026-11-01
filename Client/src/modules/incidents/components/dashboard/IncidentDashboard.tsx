import {
  ArrowLeftOutlined,
  ExclamationCircleFilled,
  FileTextOutlined,
  ReloadOutlined,
  SyncOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { Button, Card, DatePicker, Select, Spin, Tooltip } from 'antd';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { ErrorState } from '@/shared/components/ErrorState';
import { RibbonTitle } from '@/shared/components/RibbonTitle';
import dayjs from '@/shared/utils/dayjs';
import {
  CATEGORICAL_COLORS,
  INCIDENT_TYPE_CHART_COLOR,
  OTHER_COLOR,
  SINGLE_SERIES_COLOR,
  STATUS_CHART_COLOR,
} from '@/modules/incidents/constants/incidentDashboard';
import { ANALYSIS_DUE_DAYS, SUPPLEMENT_DUE_DAYS } from '@/modules/incidents/constants/incidentOptions';
import { useIncidentDashboard, useRepeatedEquipment } from '@/modules/incidents/hooks/useIncidentQueries';
import type { IncidentDashboard as Dashboard, IncidentWorkshop } from '@/modules/incidents/types/incidents';
import {
  ColumnChartCard,
  PieChartCard,
  StatTile,
  type ChartRow,
} from '@/modules/incidents/components/dashboard/DashboardCharts';
import { RepeatedEquipmentTable } from '@/modules/incidents/components/dashboard/RepeatedEquipmentTable';

/** Tham số dashboard trên URL (F5 không mất bộ lọc). */
const PARAMS = { year: 'year', workshopId: 'dw' } as const;

interface IncidentDashboardProps {
  workshops: IncidentWorkshop[];
  isWorkshopsLoading: boolean;
  onBack: () => void;
}

/** Nhãn trục X ngắn: "Xưởng Cơ điện Luyện gang 1" → "Luyện gang 1". */
const getShortWorkshopName = (name: string) => name.replace(/^Xưởng\s+Cơ\s+điện\s+/i, '');

const getPercent = (part: number, total: number) => (total ? Math.round((part * 10000) / total) / 100 : 0);

/** Toàn nhà máy: số sự cố theo xưởng + phần quá hạn của từng xưởng (màu xưởng giống nhau ở 2 biểu đồ). */
const buildWorkshopRows = (dashboard: Dashboard, getWorkshopColor: (id?: number | null) => string) => {
  const byWorkshop: ChartRow[] = dashboard.byWorkshop.map((item) => {
    const name = item.workshopName ?? '(Chưa gán xưởng)';
    return {
      key: String(item.workshopId ?? 'none'),
      name,
      shortName: getShortWorkshopName(name),
      count: item.count,
      percent: item.percent,
      color: getWorkshopColor(item.workshopId),
    };
  });

  const overdueByWorkshop: ChartRow[] = dashboard.byWorkshop
    .filter((item) => item.overdueCount > 0)
    .sort((a, b) => b.overdueCount - a.overdueCount)
    .map((item) => ({
      key: String(item.workshopId ?? 'none'),
      name: item.workshopName ?? '(Chưa gán xưởng)',
      count: item.overdueCount,
      percent: item.overdueShareOfTotal,
      color: getWorkshopColor(item.workshopId),
      details: [
        `Quá hạn ${item.overdueCount} / ${item.count} báo cáo của xưởng (${item.overduePercent}%)`,
        `– Chưa đủ phân tích: ${item.analysisOverdueCount}`,
        `– Thiếu số order / biên bản: ${item.supplementOverdueCount}`,
      ],
    }));

  return { byWorkshop, overdueByWorkshop };
};

/** 1 xưởng: báo cáo quá hạn cập nhật và đúng hạn (cộng lại = tổng báo cáo của xưởng). */
const buildOverdueStatusRows = (dashboard: Dashboard): ChartRow[] => {
  const onTimeCount = Math.max(dashboard.totalCount - dashboard.overdueCount, 0);
  return [
    {
      key: 'overdue',
      name: 'Quá hạn cập nhật',
      count: dashboard.overdueCount,
      percent: dashboard.overduePercent,
      color: STATUS_CHART_COLOR.critical,
      details: [
        `– Chưa đủ phân tích (> ${ANALYSIS_DUE_DAYS} ngày): ${dashboard.analysisOverdueCount}`,
        `– Thiếu order / biên bản (> ${SUPPLEMENT_DUE_DAYS} ngày): ${dashboard.supplementOverdueCount}`,
      ],
    },
    {
      key: 'on-time',
      name: 'Đúng hạn',
      count: onTimeCount,
      percent: getPercent(onTimeCount, dashboard.totalCount),
      color: STATUS_CHART_COLOR.good,
    },
  ];
};

/**
 * Dashboard báo cáo sự cố (Baocaosucodashboard hệ thống cũ), mở từ nút "Dashboard" ở trang danh sách.
 * Thống kê 1 năm theo thời điểm nhập: toàn nhà máy (kèm theo xưởng) hoặc 1 xưởng; bảng thiết bị sự cố lặp lại.
 */
const IncidentDashboard = ({ workshops, isWorkshopsLoading, onBack }: IncidentDashboardProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const year = Number(searchParams.get(PARAMS.year)) || dayjs().year();
  const workshopId = Number(searchParams.get(PARAMS.workshopId)) || undefined;
  const filter = { year, workshopId };

  const dashboardQuery = useIncidentDashboard(filter);
  const repeatedQuery = useRepeatedEquipment(filter);
  const dashboard = dashboardQuery.data;

  const updateParam = (key: keyof typeof PARAMS, value?: number) =>
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (value === undefined) next.delete(PARAMS[key]);
        else next.set(PARAMS[key], String(value));
        return next;
      },
      { replace: true },
    );

  // Màu theo thứ tự cố định của danh mục xưởng, không theo thứ hạng số sự cố
  const getWorkshopColor = useMemo(() => {
    const colorById = new Map(
      workshops.map((workshop, index) => [workshop.id, CATEGORICAL_COLORS[index] ?? OTHER_COLOR]),
    );
    return (id?: number | null) => (id ? (colorById.get(id) ?? OTHER_COLOR) : OTHER_COLOR);
  }, [workshops]);

  const typeRows: ChartRow[] = (dashboard?.byIncidentType ?? []).map((item) => ({
    key: item.name,
    name: item.name,
    count: item.count,
    percent: item.percent,
    color: INCIDENT_TYPE_CHART_COLOR[item.name] ?? OTHER_COLOR,
  }));
  const stopLevelRows: ChartRow[] = (dashboard?.byStopLevel ?? []).map((item) => ({
    key: item.name,
    name: item.name,
    count: item.count,
    percent: item.percent,
    color: SINGLE_SERIES_COLOR,
  }));
  const workshopRows = dashboard && !workshopId ? buildWorkshopRows(dashboard, getWorkshopColor) : undefined;

  const workshopName = workshopId
    ? (dashboard?.workshopName ?? workshops.find((workshop) => workshop.id === workshopId)?.name)
    : undefined;
  const handleReload = () => {
    void dashboardQuery.refetch();
    void repeatedQuery.refetch();
  };

  return (
    <div className="flex w-full flex-col gap-3 px-4 py-4 md:px-6 xl:px-10">
      <RibbonTitle title="DASHBOARD SỰ CỐ" />

      {/* Bộ lọc */}
      <div className="flex flex-wrap items-end gap-3 border border-solid border-gray-300 bg-bg-container p-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="dashboard-year" className="text-sm font-semibold">
            Năm
          </label>
          <DatePicker
            id="dashboard-year"
            picker="year"
            allowClear={false}
            value={dayjs().year(year)}
            onChange={(value) => updateParam('year', value ? value.year() : undefined)}
            disabledDate={(value) => value.year() > dayjs().year()}
            className="w-32"
          />
        </div>
        <div className="flex min-w-56 flex-1 flex-col gap-1.5 sm:flex-none">
          <label htmlFor="dashboard-workshop" className="text-sm font-semibold">
            Xưởng
          </label>
          <Select
            id="dashboard-workshop"
            allowClear
            showSearch={{ optionFilterProp: 'label' }}
            placeholder="-- Toàn nhà máy --"
            value={workshopId}
            onChange={(value?: number) => updateParam('workshopId', value)}
            options={workshops.map((workshop) => ({ label: workshop.name, value: workshop.id }))}
            loading={isWorkshopsLoading}
            className="w-full sm:w-72"
          />
        </div>
        <Tooltip title="Tải lại">
          <Button
            aria-label="Tải lại dashboard"
            icon={<ReloadOutlined />}
            onClick={handleReload}
            loading={dashboardQuery.isFetching || repeatedQuery.isFetching}
          />
        </Tooltip>
        <Button icon={<ArrowLeftOutlined />} onClick={onBack} className="ml-auto">
          Danh sách báo cáo
        </Button>
      </div>

      {dashboardQuery.isError && !dashboard ? (
        <ErrorState error={dashboardQuery.error} onRetry={() => dashboardQuery.refetch()} />
      ) : (
        <Spin spinning={dashboardQuery.isFetching}>
          <div className="flex flex-col gap-3">
            {/* Chỉ số */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatTile
                title={`Tổng báo cáo năm ${year}`}
                value={dashboard?.totalCount ?? 0}
                icon={<FileTextOutlined aria-hidden />}
              />
              <StatTile
                title="Báo cáo quá hạn cập nhật"
                value={dashboard?.overdueCount ?? 0}
                percent={dashboard?.overduePercent ?? 0}
                icon={<ExclamationCircleFilled aria-hidden style={{ color: STATUS_CHART_COLOR.critical }} />}
              />
              <StatTile
                title="Sự cố ảnh hưởng sản xuất"
                value={dashboard?.productionImpact.affectedCount ?? 0}
                percent={dashboard?.productionImpact.affectedPercent ?? 0}
                icon={<ThunderboltOutlined aria-hidden style={{ color: STATUS_CHART_COLOR.serious }} />}
              />
              <StatTile
                title={`Thiết bị sự cố lặp lại (> ${dashboard?.repeatThreshold ?? 3} lần)`}
                value={dashboard?.repeatedEquipmentCount ?? 0}
                icon={<SyncOutlined aria-hidden style={{ color: STATUS_CHART_COLOR.critical }} />}
              />
            </div>

            {/* Biểu đồ */}
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
              <PieChartCard title="Sự cố theo loại" rows={typeRows} />
              {workshopRows ? (
                <>
                  <ColumnChartCard title="Sự cố theo xưởng" rows={workshopRows.byWorkshop} />
                  <PieChartCard
                    title="Báo cáo quá hạn cập nhật theo xưởng"
                    rows={workshopRows.overdueByWorkshop}
                    emptyText="Không có báo cáo quá hạn"
                  />
                </>
              ) : (
                <>
                  <ColumnChartCard title="Sự cố theo cấp dừng" rows={stopLevelRows} />
                  <PieChartCard
                    title="Báo cáo quá hạn cập nhật"
                    rows={dashboard ? buildOverdueStatusRows(dashboard) : []}
                  />
                </>
              )}
            </div>
          </div>
        </Spin>
      )}

      {/* Thiết bị lặp lại */}
      <Card
        size="small"
        title={`Thiết bị xảy ra sự cố trên ${dashboard?.repeatThreshold ?? 3} lần trong năm ${year}${
          workshopName ? ` – ${workshopName}` : ''
        }`}
      >
        {repeatedQuery.isError && !repeatedQuery.data ? (
          <ErrorState error={repeatedQuery.error} onRetry={() => repeatedQuery.refetch()} />
        ) : (
          <RepeatedEquipmentTable items={repeatedQuery.data ?? []} isLoading={repeatedQuery.isFetching} />
        )}
      </Card>
    </div>
  );
};

export default IncidentDashboard;
