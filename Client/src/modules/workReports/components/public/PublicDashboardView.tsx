import { LeftOutlined, ReloadOutlined, RightOutlined } from "@ant-design/icons";
import {
  Button,
  Card,
  Col,
  Empty,
  Row,
  Select,
  Skeleton,
  Table,
  Tooltip,
  Typography,
  type TableColumnsType,
} from "antd";
import { useState } from "react";
import { ErrorState } from "@/shared/components/ErrorState";
import { EMPTY_TEXT, formatNumber } from "@/shared/utils/format";
import {
  CATEGORICAL_COLORS,
  OTHER_COLOR,
} from "@/modules/incidents/constants/incidentDashboard";
import {
  GroupBarChartCard,
  type ChartGroup,
  type ChartSeries,
} from "@/modules/workReports/components/public/DashboardCharts";
import {
  usePublicDashboard,
  useWorkWeeks,
} from "@/modules/workReports/hooks/useWorkReportQueries";
import type {
  DashboardWeekStats,
  DashboardWorkshop,
  WorkCategory,
  WorkReportDashboard,
} from "@/modules/workReports/types/workReports";

type StatsKey = "report" | "plan";

/** Tên ngắn trên trục: "Xưởng Cơ điện Luyện gang 1" → "Luyện gang 1". */
const shortWorkshopName = (name: string) =>
  name.replace(/^Xưởng\s+(Cơ điện\s+)?/i, "").trim() || name;

const minutes = (value?: number | null) => formatNumber(value ?? 0, 0);

const percentText = (value?: number | null) =>
  value == null ? EMPTY_TEXT : `${formatNumber(value, 1)}%`;

/** Số đầu mục tối đa có màu riêng; còn lại gộp "Khác" (không sinh màu thứ 9). */
const MAX_CATEGORY_SERIES = CATEGORICAL_COLORS.length;
const OTHER_KEY = "other";

/**
 * Dãy số liệu đầu mục: màu theo thứ tự đầu mục (A, B…) cố định, không theo độ lớn,
 * nên đổi tuần không đổi màu của đầu mục. Quá 8 đầu mục: phần còn lại gộp "Khác".
 */
const categorySeries = (categories: WorkCategory[]) => {
  const colored = categories.slice(0, MAX_CATEGORY_SERIES - 1);
  const rest = categories.slice(MAX_CATEGORY_SERIES - 1);
  const keep = rest.length === 1 ? [...colored, rest[0]] : colored;
  const series: ChartSeries[] = keep.map((category, index) => ({
    key: `c${category.id}`,
    name: `${category.groupLetter}. ${category.name}`,
    color: CATEGORICAL_COLORS[index],
  }));
  const otherIds = new Set(
    (rest.length === 1 ? [] : rest).map((category) => category.id),
  );
  if (otherIds.size > 0)
    series.push({ key: OTHER_KEY, name: "Khác", color: OTHER_COLOR });
  return { series, otherIds };
};

const categoryGroups = (
  dashboard: WorkReportDashboard,
  statsKey: StatsKey,
  otherIds: Set<number>,
): ChartGroup[] =>
  dashboard.workshops.map((workshop) => {
    const values: Record<string, number> = {};
    workshop[statsKey].categories.forEach((item) => {
      const key = otherIds.has(item.categoryId)
        ? OTHER_KEY
        : `c${item.categoryId}`;
      values[key] = (values[key] ?? 0) + item.minutes;
    });
    return {
      key: String(workshop.workshopId),
      label: shortWorkshopName(workshop.workshopName),
      fullName: workshop.workshopName,
      values,
    };
  });

/** Bảng phút theo đầu mục × xưởng: "phút (x%)" — bản số của biểu đồ cột chồng. */
const CategoryMatrixTable = ({
  dashboard,
  statsKey,
}: {
  dashboard: WorkReportDashboard;
  statsKey: StatsKey;
}) => {
  const rows = dashboard.categories.map((category) => ({ category }));
  const total = (workshop: DashboardWorkshop) =>
    workshop[statsKey].categories.reduce((sum, item) => sum + item.minutes, 0);
  const columns: TableColumnsType<{ category: WorkCategory }> = [
    {
      title: "Đầu mục",
      key: "category",
      fixed: "left",
      width: 220,
      render: (_, row) => `${row.category.groupLetter}. ${row.category.name}`,
    },
    ...dashboard.workshops.map((workshop) => ({
      title: shortWorkshopName(workshop.workshopName),
      key: String(workshop.workshopId),
      width: 140,
      align: "right" as const,
      render: (_: unknown, row: { category: WorkCategory }) => {
        const item = workshop[statsKey].categories.find(
          (candidate) => candidate.categoryId === row.category.id,
        );
        if (!item || item.minutes === 0)
          return <span className="text-text-secondary">{EMPTY_TEXT}</span>;
        return (
          <span>
            {minutes(item.minutes)}
            <Typography.Text type="secondary"> ({formatNumber(item.percent, 1)}%)</Typography.Text>
          </span>
        );
      },
    })),
  ];
  return (
    <Table
      rowKey={(row) => row.category.id}
      size="small"
      bordered
      columns={columns}
      dataSource={rows}
      pagination={false}
      scroll={{ x: "max-content" }}
      summary={() => (
        <Table.Summary.Row className="font-semibold">
          <Table.Summary.Cell index={0}>Tổng (phút)</Table.Summary.Cell>
          {dashboard.workshops.map((workshop, index) => (
            <Table.Summary.Cell
              key={workshop.workshopId}
              index={index + 1}
              align="right"
            >
              {minutes(total(workshop))}
            </Table.Summary.Cell>
          ))}
        </Table.Summary.Row>
      )}
    />
  );
};

/** Bảng tổng của từng xưởng (bản số của các biểu đồ): số việc, giờ công KH / TT, % thực hiện, vật tư. */
const WorkshopStatsTable = ({
  dashboard,
  statsKey,
}: {
  dashboard: WorkReportDashboard;
  statsKey: StatsKey;
}) => {
  const isReport = statsKey === "report";
  const stats = (workshop: DashboardWorkshop): DashboardWeekStats =>
    workshop[statsKey];
  const sum = (pick: (item: DashboardWeekStats) => number) =>
    dashboard.workshops.reduce((total, workshop) => total + pick(stats(workshop)), 0);
  const totalPlanned = sum((item) => item.plannedMinutes);
  const totalActual = sum((item) => item.actualMinutes);

  const columns: TableColumnsType<DashboardWorkshop> = [
    {
      title: "Xưởng",
      key: "workshop",
      fixed: "left",
      width: 240,
      render: (_, workshop) => workshop.workshopName,
    },
    {
      title: "Số việc",
      key: "items",
      width: 90,
      align: "right",
      render: (_, workshop) => formatNumber(stats(workshop).itemCount, 0),
    },
    ...(isReport
      ? [
          {
            title: "Phát sinh",
            key: "unplanned",
            width: 90,
            align: "right" as const,
            render: (_: unknown, workshop: DashboardWorkshop) =>
              formatNumber(stats(workshop).unplannedCount, 0),
          },
        ]
      : []),
    {
      title: "Giờ công KH (phút)",
      key: "planned",
      width: 140,
      align: "right",
      render: (_, workshop) => minutes(stats(workshop).plannedMinutes),
    },
    ...(isReport
      ? [
          {
            title: "Giờ công TT (phút)",
            key: "actual",
            width: 140,
            align: "right" as const,
            render: (_: unknown, workshop: DashboardWorkshop) =>
              minutes(stats(workshop).actualMinutes),
          },
          {
            title: "% thực hiện (TT/KH)",
            key: "completion",
            width: 140,
            align: "right" as const,
            render: (_: unknown, workshop: DashboardWorkshop) =>
              percentText(stats(workshop).completionPercent),
          },
        ]
      : []),
    {
      title: "Định biên (phút)",
      key: "capacity",
      width: 130,
      align: "right",
      render: (_, workshop) => minutes(stats(workshop).capacityMinutes),
    },
    {
      title: "Số mã vật tư",
      key: "materialCodes",
      width: 110,
      align: "right",
      render: (_, workshop) => formatNumber(stats(workshop).materialCodeCount, 0),
    },
    {
      title: "Số dòng vật tư",
      key: "materialLines",
      width: 120,
      align: "right",
      render: (_, workshop) => formatNumber(stats(workshop).materialLineCount, 0),
    },
  ];

  const summaryCells = [
    formatNumber(sum((item) => item.itemCount), 0),
    ...(isReport ? [formatNumber(sum((item) => item.unplannedCount), 0)] : []),
    minutes(totalPlanned),
    ...(isReport
      ? [
          minutes(totalActual),
          percentText(totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : null),
        ]
      : []),
    minutes(sum((item) => item.capacityMinutes)),
    formatNumber(sum((item) => item.materialCodeCount), 0),
    formatNumber(sum((item) => item.materialLineCount), 0),
  ];

  return (
    <Table<DashboardWorkshop>
      rowKey="workshopId"
      size="small"
      bordered
      columns={columns}
      dataSource={dashboard.workshops}
      pagination={false}
      scroll={{ x: "max-content" }}
      summary={() => (
        <Table.Summary.Row className="font-semibold">
          <Table.Summary.Cell index={0}>Tổng</Table.Summary.Cell>
          {summaryCells.map((value, index) => (
            <Table.Summary.Cell key={index} index={index + 1} align="right">
              {value}
            </Table.Summary.Cell>
          ))}
        </Table.Summary.Row>
      )}
    />
  );
};

const MATERIAL_SERIES: ChartSeries[] = [
  { key: "materialCodeCount", name: "Số mã vật tư", color: CATEGORICAL_COLORS[0] },
];

const materialGroups = (
  dashboard: WorkReportDashboard,
  statsKey: StatsKey,
): ChartGroup[] =>
  dashboard.workshops.map((workshop) => ({
    key: String(workshop.workshopId),
    label: shortWorkshopName(workshop.workshopName),
    fullName: workshop.workshopName,
    values: { materialCodeCount: workshop[statsKey].materialCodeCount },
    details: [`${workshop[statsKey].materialLineCount} dòng vật tư`],
  }));

/** Kế hoạch (xanh dương) – Thực tế (cam): 2 màu đầu của bảng màu. */
const PLAN_ACTUAL_SERIES: ChartSeries[] = [
  { key: "planned", name: "Kế hoạch", color: CATEGORICAL_COLORS[0] },
  { key: "actual", name: "Thực tế", color: CATEGORICAL_COLORS[1] },
];

/**
 * Trang công khai, tab "Phân tích": báo cáo tuần đang chọn (mặc định tuần đang báo cáo) và kế hoạch tuần kế tiếp
 * của các xưởng công khai. Mỗi phần: biểu đồ + bảng số (bản số của biểu đồ, đọc được không cần màu).
 */
export const PublicDashboardView = () => {
  const [weekId, setWeekId] = useState<number>();
  const dashboardQuery = usePublicDashboard(weekId);
  const dashboard = dashboardQuery.data;
  const weeksQuery = useWorkWeeks(dashboard?.reportWeek.isoYear);
  const weeks = weeksQuery.data ?? [];
  const currentId = dashboard?.reportWeek.id;
  const weekIndex = weeks.findIndex((week) => week.id === currentId);

  const toolbar = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md bg-bg-container px-3 py-2 md:px-4">
      <Typography.Text strong>Báo cáo tuần</Typography.Text>
      <div className="flex w-full min-w-0 items-center gap-1 sm:w-auto">
        <Tooltip title="Tuần trước">
          <Button
            aria-label="Tuần trước"
            icon={<LeftOutlined />}
            disabled={weekIndex <= 0}
            onClick={() => setWeekId(weeks[weekIndex - 1]?.id)}
          />
        </Tooltip>
        <Select
          aria-label="Chọn tuần báo cáo"
          value={currentId}
          onChange={setWeekId}
          options={weeks.map((week) => ({ value: week.id, label: week.label }))}
          loading={weeksQuery.isFetching}
          showSearch
          optionFilterProp="label"
          className="min-w-0 flex-1 sm:w-72 sm:flex-none"
        />
        <Tooltip title="Tuần sau">
          <Button
            aria-label="Tuần sau"
            icon={<RightOutlined />}
            disabled={weekIndex < 0 || weekIndex >= weeks.length - 1}
            onClick={() => setWeekId(weeks[weekIndex + 1]?.id)}
          />
        </Tooltip>
      </div>
      <Button disabled={weekId === undefined} onClick={() => setWeekId(undefined)}>
        Tuần hiện tại
      </Button>
      <Tooltip title="Tải lại">
        <Button
          aria-label="Tải lại"
          icon={<ReloadOutlined />}
          loading={dashboardQuery.isFetching}
          onClick={() => dashboardQuery.refetch()}
        />
      </Tooltip>
    </div>
  );

  if (dashboardQuery.isError && !dashboard)
    return (
      <ErrorState
        error={dashboardQuery.error}
        onRetry={() => dashboardQuery.refetch()}
      />
    );
  if (!dashboard) return <Skeleton active paragraph={{ rows: 10 }} />;
  if (dashboard.workshops.length === 0)
    return <Empty description="Chưa có xưởng nào hiện trên trang công khai." />;

  const { series: categorySeriesList, otherIds } = categorySeries(
    dashboard.categories,
  );
  const reportLabel = `Tuần ${String(dashboard.reportWeek.isoWeek).padStart(2, "0")}`;
  const planLabel = dashboard.planWeek
    ? `Tuần ${String(dashboard.planWeek.isoWeek).padStart(2, "0")}`
    : "tuần tới";

  const planActualGroups: ChartGroup[] = dashboard.workshops.map((workshop) => ({
    key: String(workshop.workshopId),
    label: shortWorkshopName(workshop.workshopName),
    fullName: workshop.workshopName,
    values: {
      planned: workshop.report.plannedMinutes,
      actual: workshop.report.actualMinutes,
    },
    details: [`Thực hiện: ${percentText(workshop.report.completionPercent)}`],
  }));

  return (
    <div className="flex flex-col gap-3">
      {toolbar}

      <Card
        size="small"
        title={`Báo cáo ${reportLabel} – ${dashboard.reportWeek.label}`}
      >
        <div className="flex flex-col gap-3">
          <WorkshopStatsTable dashboard={dashboard} statsKey="report" />
          <Row gutter={[12, 12]}>
            <Col xs={24} xl={12}>
              <GroupBarChartCard
                title="Giờ công kế hoạch và thực tế (phút)"
                groups={planActualGroups}
                series={PLAN_ACTUAL_SERIES}
                unit="phút"
              />
            </Col>
            <Col xs={24} xl={12}>
              <GroupBarChartCard
                title="Giờ công thực tế theo đầu mục (phút)"
                groups={categoryGroups(dashboard, "report", otherIds)}
                series={categorySeriesList}
                unit="phút"
                stacked
              />
            </Col>
            <Col xs={24} xl={12}>
              <GroupBarChartCard
                title="Số mã vật tư sử dụng"
                groups={materialGroups(dashboard, "report")}
                series={MATERIAL_SERIES}
                unit="mã"
              />
            </Col>
            <Col xs={24} xl={12}>
              <Card size="small" title="Phút theo đầu mục (% trong tổng của xưởng)" className="h-full">
                <CategoryMatrixTable dashboard={dashboard} statsKey="report" />
              </Card>
            </Col>
          </Row>
        </div>
      </Card>

      <Card
        size="small"
        title={
          dashboard.planWeek
            ? `Kế hoạch ${planLabel} – ${dashboard.planWeek.label}`
            : "Kế hoạch tuần tới"
        }
      >
        {dashboard.planWeek ? (
          <div className="flex flex-col gap-3">
            <WorkshopStatsTable dashboard={dashboard} statsKey="plan" />
            <Row gutter={[12, 12]}>
              <Col xs={24} xl={12}>
                <GroupBarChartCard
                  title="Giờ công kế hoạch theo đầu mục (phút)"
                  groups={categoryGroups(dashboard, "plan", otherIds)}
                  series={categorySeriesList}
                  unit="phút"
                  stacked
                />
              </Col>
              <Col xs={24} xl={12}>
                <GroupBarChartCard
                  title="Số mã vật tư dự kiến"
                  groups={materialGroups(dashboard, "plan")}
                  series={MATERIAL_SERIES}
                  unit="mã"
                />
              </Col>
              <Col xs={24}>
                <Card size="small" title="Phút kế hoạch theo đầu mục (% trong tổng của xưởng)">
                  <CategoryMatrixTable dashboard={dashboard} statsKey="plan" />
                </Card>
              </Col>
            </Row>
          </div>
        ) : (
          <Empty description="Chưa có kỳ tuần kế tiếp." />
        )}
      </Card>
    </div>
  );
};
