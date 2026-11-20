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
import { useSearchParams } from "react-router";
import { ErrorState } from "@/shared/components/ErrorState";
import { EMPTY_TEXT, formatNumber } from "@/shared/utils/format";
import {
  CATEGORICAL_COLORS,
  OTHER_COLOR,
} from "@/modules/incidents/constants/incidentDashboard";
import {
  dashboardChartHeight,
  GroupBarChartCard,
  SharePieChartCard,
  type ChartGroup,
  type ChartSeries,
  type ShareSlice,
} from "@/modules/workReports/components/public/DashboardCharts";
import {
  usePublicDashboard,
  useWorkWeeks,
} from "@/modules/workReports/hooks/useWorkReportQueries";
import type {
  DashboardWorkshop,
  WorkCategory,
  WorkReportDashboard,
  WorkWeek,
} from "@/modules/workReports/types/workReports";

/**
 * Tên viết tắt trên biểu đồ (tooltip vẫn hiện tên đầy đủ): bỏ "Xưởng (Cơ điện)", mỗi từ lấy chữ cái đầu viết hoa,
 * từ có chữ số giữ nguyên, các vế cách nhau dấu phẩy nối bằng "-".
 * Vd "Xưởng Cơ điện Luyện gang 1" → "LG1", "Nhiệt điện 2" → "NĐ2", "Xử lý nước, trạm 110kV" → "XLN-T110kV".
 */
const abbreviateWorkshop = (name: string) => {
  const short = name.replace(/^Xưởng\s+(Cơ điện\s+)?/i, "").trim() || name;
  return short
    .split(",")
    .map((part) =>
      part
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((word) =>
          /\d/.test(word) ? word : word.charAt(0).toLocaleUpperCase("vi"),
        )
        .join(""),
    )
    .filter(Boolean)
    .join("-");
};

const count = (value?: number | null) => formatNumber(value ?? 0, 0);

const percentText = (value?: number | null) =>
  value == null ? EMPTY_TEXT : `${formatNumber(value, 1)}%`;

/** % thực tế / kế hoạch; null khi kế hoạch = 0. */
const completion = (planned: number, actual: number) =>
  planned > 0 ? (actual / planned) * 100 : null;

/** Giờ công: kế hoạch (màu 1) – thực tế (màu 2). */
const MINUTES_SERIES: ChartSeries[] = [
  { key: "planned", name: "Kế hoạch", color: CATEGORICAL_COLORS[0] },
  { key: "actual", name: "Thực tế", color: CATEGORICAL_COLORS[1] },
];

/** Mã vật tư: cặp màu khác giờ công (màu 3 – màu 4) để 2 biểu đồ cạnh nhau không lẫn. */
const MATERIAL_SERIES: ChartSeries[] = [
  { key: "planned", name: "Kế hoạch", color: CATEGORICAL_COLORS[2] },
  { key: "actual", name: "Thực tế", color: CATEGORICAL_COLORS[3] },
];

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

const groupBase = (workshop: DashboardWorkshop) => ({
  key: String(workshop.workshopId),
  label: abbreviateWorkshop(workshop.workshopName),
  fullName: workshop.workshopName,
});

const minutesGroups = (dashboard: WorkReportDashboard): ChartGroup[] =>
  dashboard.workshops.map((workshop) => ({
    ...groupBase(workshop),
    values: {
      planned: workshop.plannedMinutes,
      actual: workshop.actualMinutes,
    },
    details: [`Thực tế / kế hoạch: ${percentText(workshop.completionPercent)}`],
  }));

const categoryGroups = (
  dashboard: WorkReportDashboard,
  otherIds: Set<number>,
): ChartGroup[] =>
  dashboard.workshops.map((workshop) => {
    const values: Record<string, number> = {};
    workshop.categories.forEach((item) => {
      const key = otherIds.has(item.categoryId)
        ? OTHER_KEY
        : `c${item.categoryId}`;
      values[key] = (values[key] ?? 0) + item.minutes;
    });
    return {
      ...groupBase(workshop),
      values,
      details: [`Tổng thực tế: ${count(workshop.actualMinutes)} phút`],
    };
  });

const materialGroups = (dashboard: WorkReportDashboard): ChartGroup[] =>
  dashboard.workshops.map((workshop) => ({
    ...groupBase(workshop),
    values: {
      planned: workshop.plannedMaterialCodeCount,
      actual: workshop.actualMaterialCodeCount,
    },
  }));

/** Lát biểu đồ tròn: màu theo thứ tự xưởng trên sơ đồ (cố định khi đổi tuần). */
const workshopSlices = (dashboard: WorkReportDashboard): ShareSlice[] =>
  dashboard.workshops.map((workshop, index) => ({
    ...groupBase(workshop),
    value: workshop.actualMinutes,
    color:
      index < CATEGORICAL_COLORS.length
        ? CATEGORICAL_COLORS[index]
        : OTHER_COLOR,
  }));

interface SummaryTableProps {
  dashboard: WorkReportDashboard;
  /** Bấm tên xưởng: mở Chi tiết tuần của xưởng. */
  onOpenWorkshop: (workshop: DashboardWorkshop) => void;
}

/** Bảng tổng hợp theo xưởng (bản số của các biểu đồ) + dòng Tổng. */
const WorkshopSummaryTable = ({
  dashboard,
  onOpenWorkshop,
}: SummaryTableProps) => {
  const { workshops } = dashboard;
  const sum = (pick: (workshop: DashboardWorkshop) => number) =>
    workshops.reduce((total, workshop) => total + pick(workshop), 0);
  const totalPlanned = sum((item) => item.plannedMinutes);
  const totalActual = sum((item) => item.actualMinutes);

  const numberColumn = (
    title: string,
    key: string,
    pick: (workshop: DashboardWorkshop) => number,
    width = 110,
  ) => ({
    title,
    key,
    width,
    align: "right" as const,
    render: (_: unknown, workshop: DashboardWorkshop) => count(pick(workshop)),
  });

  const columns: TableColumnsType<DashboardWorkshop> = [
    {
      title: "Xưởng",
      key: "workshop",
      fixed: "left",
      width: 260,
      render: (_, workshop) => (
        <Tooltip title="Xem chi tiết tuần của xưởng">
          <Typography.Link onClick={() => onOpenWorkshop(workshop)}>
            {workshop.workshopName}
          </Typography.Link>
        </Tooltip>
      ),
    },
    numberColumn("Số việc KH", "plannedItems", (item) => item.plannedItemCount),
    {
      title: "Số việc TT",
      key: "actualItems",
      width: 130,
      align: "right",
      render: (_, workshop) => (
        <span>
          {count(workshop.actualItemCount)}
          {/* {workshop.unplannedItemCount > 0 && (
            <Typography.Text type="secondary">
              {" "}
              ({count(workshop.unplannedItemCount)} phát sinh)
            </Typography.Text>
          )} */}
        </span>
      ),
    },
    numberColumn(
      "Số mã vật tư KH",
      "plannedMaterials",
      (item) => item.plannedMaterialCodeCount,
      120,
    ),
    numberColumn(
      "Số mã vật tư TT",
      "actualMaterials",
      (item) => item.actualMaterialCodeCount,
      120,
    ),
    numberColumn(
      "Giờ công KH (phút)",
      "plannedMinutes",
      (item) => item.plannedMinutes,
      130,
    ),
    numberColumn(
      "Giờ công TT (phút)",
      "actualMinutes",
      (item) => item.actualMinutes,
      130,
    ),
    {
      title: "% giờ công TT / KH",
      key: "completion",
      width: 140,
      align: "right",
      render: (_, workshop) => percentText(workshop.completionPercent),
    },
  ];

  // const unplannedTotal = sum((item) => item.unplannedItemCount);
  const summaryCells = [
    count(sum((item) => item.plannedItemCount)),
    <span key="actualItems">
      {count(sum((item) => item.actualItemCount))}
      {/* {unplannedTotal > 0 && (
        <Typography.Text type="secondary">
          {" "}
          ({count(unplannedTotal)} phát sinh)
        </Typography.Text>
      )} */}
    </span>,
    count(sum((item) => item.plannedMaterialCodeCount)),
    count(sum((item) => item.actualMaterialCodeCount)),
    count(totalPlanned),
    count(totalActual),
    percentText(completion(totalPlanned, totalActual)),
  ];

  return (
    <Table<DashboardWorkshop>
      rowKey="workshopId"
      size="small"
      bordered
      columns={columns}
      dataSource={workshops}
      pagination={false}
      scroll={{ x: "max-content" }}
      summary={() => (
        <Table.Summary.Row className="font-semibold">
          <Table.Summary.Cell index={0}>Tổng nhà máy</Table.Summary.Cell>
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

/** Nhãn "Tuần 46 – …" của tuần đang xem. */
const weekTitle = (week: WorkWeek) =>
  `Tuần ${String(week.isoWeek).padStart(2, "0")} – ${week.label}`;

/**
 * Trang công khai, tab "Phân tích": kế hoạch – thực hiện của tuần đang chọn (mặc định tuần đang báo cáo) theo xưởng công khai.
 * Kế hoạch lấy từ form kế hoạch, thực tế từ form báo cáo của cùng tuần.
 * - 1 hàng 4 biểu đồ: giờ công KH – TT (cột dọc), giờ công TT theo đầu mục (thanh ngang chồng, phút + % trong xưởng),
 *   mã vật tư KH – TT (cột dọc, cặp màu khác giờ công), tỉ trọng giờ công TT của từng xưởng trong nhà máy.
 * - Bảng tổng hợp theo xưởng (bản số của biểu đồ); bấm tên xưởng mở Chi tiết tuần của xưởng.
 */
export const PublicDashboardView = () => {
  const [, setSearchParams] = useSearchParams();
  const [weekId, setWeekId] = useState<number>();
  const dashboardQuery = usePublicDashboard(weekId);
  const dashboard = dashboardQuery.data;
  const weeksQuery = useWorkWeeks(dashboard?.week.isoYear);
  const weeks = weeksQuery.data ?? [];
  const currentId = dashboard?.week.id;
  const weekIndex = weeks.findIndex((week) => week.id === currentId);

  const toolbar = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md bg-bg-container px-3 py-2 md:px-4">
      <Typography.Text strong>Tuần</Typography.Text>
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
          aria-label="Chọn tuần"
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
      <Button
        disabled={weekId === undefined}
        onClick={() => setWeekId(undefined)}
      >
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
  // Các thẻ trong hàng cao bằng nhau
  const chartHeight = dashboardChartHeight(dashboard.workshops.length);

  // Mở Chi tiết tuần (báo cáo) của xưởng, đúng tuần đang xem
  const openWorkshop = (workshop: DashboardWorkshop) =>
    setSearchParams(
      {
        page: "week",
        ws: String(workshop.workshopId),
        week: String(dashboard.week.id),
        year: String(dashboard.week.isoYear),
      },
      { replace: false },
    );

  return (
    <div className="flex flex-col gap-3">
      {toolbar}

      {/* Biểu đồ đầu mục rộng hơn (5 – 8 – 5 – 6 / 24) */}
      <Row gutter={[12, 12]}>
        <Col xs={24} md={12} xl={5}>
          <GroupBarChartCard
            title="Giờ công kế hoạch – thực tế (phút)"
            groups={minutesGroups(dashboard)}
            series={MINUTES_SERIES}
            unit="phút"
            direction="column"
            height={chartHeight}
          />
        </Col>
        <Col xs={24} md={12} xl={8}>
          <GroupBarChartCard
            title="Giờ công thực tế theo đầu mục (phút)"
            groups={categoryGroups(dashboard, otherIds)}
            series={categorySeriesList}
            unit="phút"
            stacked
            direction="bar"
            height={chartHeight}
          />
        </Col>
        <Col xs={24} md={12} xl={5}>
          <GroupBarChartCard
            title="Số mã vật tư kế hoạch – thực tế"
            groups={materialGroups(dashboard)}
            series={MATERIAL_SERIES}
            unit="mã"
            direction="column"
            height={chartHeight}
          />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <SharePieChartCard
            title="Giờ công thực tế theo xưởng"
            slices={workshopSlices(dashboard)}
            unit="phút"
            height={chartHeight}
          />
        </Col>
      </Row>

      <Card size="small" title="Tổng hợp theo xưởng">
        <WorkshopSummaryTable
          dashboard={dashboard}
          onOpenWorkshop={openWorkshop}
        />
      </Card>
    </div>
  );
};
