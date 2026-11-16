import {
  AimOutlined,
  AppstoreOutlined,
  LeftOutlined,
  ReloadOutlined,
  RightOutlined,
  TableOutlined,
} from "@ant-design/icons";
import {
  Button,
  Empty,
  Segmented,
  Select,
  Skeleton,
  Tabs,
  Tooltip,
  Typography,
} from "antd";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { ErrorState } from "@/shared/components/ErrorState";
import { PageHeader } from "@/shared/components/PageHeader";
import { formatDateTime } from "@/shared/utils/format";
import { UnitManagementPanel } from "@/modules/workReports/components/UnitManagementPanel";
import { WorkGridView } from "@/modules/workReports/components/WorkGridView";
import { WorkshopMaterialTable } from "@/modules/workReports/components/WorkshopMaterialTable";
import { WorkSummaryTable } from "@/modules/workReports/components/WorkSummaryTable";
import { PHASE_OPTIONS } from "@/modules/workReports/constants/workReportOptions";
import {
  useMyWorkReportScope,
  useWorkingWeeks,
  useWorkReportGrid,
  useWorkWeeks,
} from "@/modules/workReports/hooks/useWorkReportQueries";
import type {
  WorkGridLayout,
  WorkReportFilter,
  WorkReportPhase,
} from "@/modules/workReports/types/workReports";

type TabKey = "grid" | "summary" | "materials" | "units";

/** Tham số trên URL để F5 / gửi link giữ đúng xưởng, tuần, giai đoạn, tab. */
const PARAMS = {
  workshop: "ws",
  week: "week",
  year: "year",
  phase: "phase",
  tab: "tab",
  view: "view",
} as const;
type ParamKey = keyof typeof PARAMS;

const TAB_KEYS: TabKey[] = ["grid", "summary", "materials", "units"];

/**
 * - submit: trang kỹ sư /member/work-reports (quyền work-reports.submit), nhập tổ/kíp được phân công.
 * - manage: trang quản trị /admin/work-reports (work-reports.manage) cho đội trưởng, quản đốc: xem/sửa đội/xưởng mình,
 *   thêm tab Đơn vị & kỹ sư.
 * - factory: trang công khai /work-reports cho Ban Giám đốc (ai cũng xem được, không cần đăng nhập), chỉ xem mọi xưởng;
 *   bọc trong WorkReportPublicContext để gọi API /work-reports/public/*.
 */
export type WorkReportWorkspaceMode = "submit" | "manage" | "factory";

const MODE_TEXT: Record<
  WorkReportWorkspaceMode,
  { title: string; description: string; empty: string }
> = {
  submit: {
    title: "Báo cáo công việc tuần",
    description:
      "Lập kế hoạch và báo cáo công việc tuần của tổ/kíp bạn phụ trách.",
    empty:
      "Bạn chưa được phân công phụ trách tổ/kíp nào. Liên hệ đội trưởng hoặc quản đốc để được phân công.",
  },
  manage: {
    title: "Quản lý báo cáo tuần",
    description:
      "Kế hoạch, báo cáo công việc tuần của đội/xưởng; phân công kỹ sư phụ trách tổ/kíp.",
    empty:
      "Bạn chưa là trưởng/phó đội hoặc xưởng nào trên sơ đồ tổ chức. Liên hệ quản trị để cập nhật chức vụ trên sơ đồ.",
  },
  factory: {
    title: "Báo cáo công việc tuần",
    description: "Kế hoạch và báo cáo công việc tuần của các xưởng.",
    empty: "Chưa có xưởng nào có đơn vị báo cáo tuần.",
  },
};

/**
 * Chiều cao màn hình = phần dưới header của layout (trừ lề trên + dưới), để trang không cuộn,
 * chỉ thân bảng cuộn và bảng dùng hết chỗ còn lại (giống trang Nhật ký hệ thống).
 * - submit / manage (PrivateLayout): header 56px + lề p-4 / md:p-6.
 * - factory (PublicLayout + FactoryWorkReportPage): header 64px + lề py-4 / md:py-6.
 */
const MODE_HEIGHT_CLASS: Record<WorkReportWorkspaceMode, string> = {
  submit: "h-[calc(100dvh-88px)] md:h-[calc(100dvh-104px)]",
  manage: "h-[calc(100dvh-88px)] md:h-[calc(100dvh-104px)]",
  factory: "h-[calc(100dvh-96px)] md:h-[calc(100dvh-112px)]",
};

/**
 * Tab cao hết phần còn lại của khung (để bảng bên trong tự đo chiều cao bằng useTableScrollY);
 * thanh tab sát nội dung (mb-2 thay 16px mặc định). Chỉ áp cho Tabs này (selector `>`), không ảnh hưởng Tabs lồng bên trong.
 * Cấu trúc Tabs của AntD 6: .ant-tabs > .ant-tabs-body-holder > .ant-tabs-body > .ant-tabs-content (1 nội dung tab; chỉ áp cho tab đang mở .ant-tabs-content-active để không đè display:none của tab ẩn).
 * Dùng flex cả chuỗi (không dùng %), nội dung tab cuộn bên trong khi dài hơn khung.
 */
const TABS_FILL_CLASS = [
  "flex min-h-0 flex-1 flex-col",
  "[&>.ant-tabs-nav]:mb-2",
  "[&>.ant-tabs-body-holder]:flex [&>.ant-tabs-body-holder]:min-h-0 [&>.ant-tabs-body-holder]:flex-col",
  "[&>.ant-tabs-body-holder>.ant-tabs-body]:flex [&>.ant-tabs-body-holder>.ant-tabs-body]:min-h-0 [&>.ant-tabs-body-holder>.ant-tabs-body]:flex-1 [&>.ant-tabs-body-holder>.ant-tabs-body]:flex-col",
  "[&>.ant-tabs-body-holder>.ant-tabs-body>.ant-tabs-content-active]:flex [&>.ant-tabs-body-holder>.ant-tabs-body>.ant-tabs-content-active]:min-h-0 [&>.ant-tabs-body-holder>.ant-tabs-body>.ant-tabs-content-active]:flex-1 [&>.ant-tabs-body-holder>.ant-tabs-body>.ant-tabs-content-active]:flex-col [&>.ant-tabs-body-holder>.ant-tabs-body>.ant-tabs-content-active]:overflow-auto",
].join(" ");

interface WorkReportWorkspaceProps {
  mode: WorkReportWorkspaceMode;
}

/**
 * Màn hình báo cáo công việc tuần dùng chung cho 3 trang (xem WorkReportWorkspaceMode); dữ liệu Server lọc theo
 * quyền + phạm vi trên sơ đồ tổ chức. Chọn xưởng, giai đoạn (Báo cáo tuần / Kế hoạch tuần), tuần; tab Bảng công việc,
 * Tổng hợp, Vật tư xưởng (+ Đơn vị & kỹ sư ở trang quản lý). Mặc định mở tuần đang làm việc của giai đoạn.
 * Bố cục gọn để dành tối đa chỗ cho bảng: tiêu đề + bộ chọn chung 1 khung, lọc tổ/kíp nằm cạnh thanh tab,
 * trang cao vừa màn hình và bảng tự cuộn bên trong.
 */
export const WorkReportWorkspace = ({ mode }: WorkReportWorkspaceProps) => {
  const text = MODE_TEXT[mode];
  const [searchParams, setSearchParams] = useSearchParams();
  const scopeQuery = useMyWorkReportScope();
  const workshops = scopeQuery.data?.workshops ?? [];

  const workshopParam = Number(searchParams.get(PARAMS.workshop)) || undefined;
  const workshop =
    workshops.find((item) => item.workshopId === workshopParam) ?? workshops[0];
  const workshopId = workshop?.workshopId;
  const phase: WorkReportPhase =
    searchParams.get(PARAMS.phase) === "PLAN" ? "PLAN" : "REPORT";
  const tabParam = searchParams.get(PARAMS.tab) as TabKey | null;
  // Kiểu xem theo sheet chỉ ở trang quản lý và trang xem; lưu trên URL (?view=sheet) để F5 / gửi link giữ nguyên
  const canSwitchLayout = mode === "manage" || mode === "factory";
  const gridLayout: WorkGridLayout =
    canSwitchLayout && searchParams.get(PARAMS.view) === "sheet"
      ? "SHEET"
      : "ALL";

  // Lọc tổ/kíp dùng chung cho tab Bảng công việc và Vật tư xưởng; đổi xưởng thì bỏ lọc
  const [unitFilterState, setUnitFilterState] = useState<{
    workshopId?: number;
    unitIds: number[];
  }>({ unitIds: [] });
  const unitFilter =
    unitFilterState.workshopId === workshopId ? unitFilterState.unitIds : [];

  const workingWeeksQuery = useWorkingWeeks(workshopId);
  const workingWeek =
    phase === "REPORT"
      ? workingWeeksQuery.data?.reportWeek
      : workingWeeksQuery.data?.planWeek;
  const year = Number(searchParams.get(PARAMS.year)) || workingWeek?.isoYear;
  const weeksQuery = useWorkWeeks(year, workshopId);
  const weeks = useMemo(() => weeksQuery.data ?? [], [weeksQuery.data]);

  // Tuần: theo URL; không có thì tuần đang làm việc (hoặc tuần đầu năm khi đã đổi năm)
  const weekParam = Number(searchParams.get(PARAMS.week)) || undefined;
  const weekId =
    weekParam ??
    (workingWeek &&
    (!searchParams.get(PARAMS.year) ||
      weeks.some((week) => week.id === workingWeek.id))
      ? workingWeek.id
      : weeks[0]?.id);
  const weekIndex = weeks.findIndex((week) => week.id === weekId);
  const selectedWeek =
    weeks[weekIndex] ?? (workingWeek?.id === weekId ? workingWeek : undefined);

  const canManageUnits =
    mode === "manage" &&
    (Boolean(workshop?.isManager) ||
      Boolean(workshop?.units.some((unit) => unit.canManageEngineers)));
  const tab: TabKey =
    tabParam &&
    TAB_KEYS.includes(tabParam) &&
    (tabParam !== "units" || canManageUnits)
      ? tabParam
      : "grid";

  const filter: WorkReportFilter | undefined =
    workshopId && weekId ? { workshopId, weekId, phase } : undefined;
  const gridQuery = useWorkReportGrid(tab === "grid" ? filter : undefined);

  const updateParams = (
    patch: Partial<Record<ParamKey, string | number | undefined>>,
  ) =>
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        Object.entries(patch).forEach(([key, value]) => {
          const param = PARAMS[key as ParamKey];
          if (value === undefined || value === "") next.delete(param);
          else next.set(param, String(value));
        });
        return next;
      },
      { replace: true },
    );

  if (scopeQuery.isLoading) return <Skeleton active paragraph={{ rows: 8 }} />;
  if (scopeQuery.isError)
    return (
      <ErrorState
        error={scopeQuery.error}
        onRetry={() => scopeQuery.refetch()}
      />
    );
  if (!workshop) {
    return (
      <div>
        <PageHeader title={text.title} />
        <Empty description={text.empty} />
      </div>
    );
  }

  const weekOptions = weeks.map((week) => ({
    value: week.id,
    label: week.label,
  }));
  const yearOptions = workingWeek
    ? [
        workingWeek.isoYear - 1,
        workingWeek.isoYear,
        workingWeek.isoYear + 1,
      ].map((value) => ({ value, label: `Năm ${value}` }))
    : [];
  const unitOptions = workshop.units
    .filter((unit) => unit.canView)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((unit) => ({ value: unit.unitId, label: unit.displayName }));

  // Tiêu đề + bộ chọn trong 1 khung, tự xuống dòng khi hẹp; hạn nộp nối cuối hàng
  const toolbar = (
    <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 rounded-md bg-bg-container px-3 py-2 md:px-4">
      <Typography.Title level={4} className="mb-0 basis-full sm:basis-auto">
        {text.title}
      </Typography.Title>
      {workshops.length > 1 && (
        <Select
          aria-label="Chọn xưởng"
          value={workshopId}
          onChange={(value: number) =>
            updateParams({ workshop: value, week: undefined, year: undefined })
          }
          options={workshops.map((item) => ({
            value: item.workshopId,
            label: item.workshopName,
          }))}
          showSearch
          optionFilterProp="label"
          className="w-full sm:w-64"
        />
      )}
      <Segmented<WorkReportPhase>
        aria-label="Giai đoạn"
        options={PHASE_OPTIONS}
        value={phase}
        // Đổi giai đoạn → về tuần đang làm việc của giai đoạn đó
        onChange={(value) =>
          updateParams({
            phase: value === "REPORT" ? undefined : value,
            week: undefined,
            year: undefined,
          })
        }
      />
      <div className="flex w-full min-w-0 items-center gap-1 sm:w-auto">
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
          className="min-w-0 flex-1 sm:w-72 sm:flex-none"
        />
        <Tooltip title="Tuần sau">
          <Button
            aria-label="Tuần sau"
            icon={<RightOutlined />}
            disabled={weekIndex < 0 || weekIndex >= weeks.length - 1}
            onClick={() => updateParams({ week: weeks[weekIndex + 1]?.id })}
          />
        </Tooltip>
      </div>
      <Select
        aria-label="Chọn năm"
        value={year}
        onChange={(value: number) =>
          updateParams({ year: value, week: undefined })
        }
        options={yearOptions}
        className="w-32"
      />
      <Tooltip
        title={
          phase === "REPORT"
            ? "Tuần đang nhập báo cáo"
            : "Tuần đang lập kế hoạch"
        }
      >
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
      {selectedWeek && (
        <Typography.Text type="secondary">
          Hạn {phase === "REPORT" ? "báo cáo" : "kế hoạch"} tuần{" "}
          {String(selectedWeek.isoWeek).padStart(2, "0")}:{" "}
          <Typography.Text strong>
            {formatDateTime(
              phase === "REPORT"
                ? selectedWeek.effectiveReportDeadlineAt
                : selectedWeek.effectivePlanDeadlineAt,
            )}
          </Typography.Text>
        </Typography.Text>
      )}
    </div>
  );

  // Lọc tổ/kíp cạnh thanh tab (chỉ ở 2 tab có bảng theo tổ/kíp), không chiếm thêm 1 hàng
  const unitFilterSelect =
    (tab === "grid" || tab === "materials") && unitOptions.length > 1 ? (
      <Select
        mode="multiple"
        allowClear
        aria-label="Lọc tổ/kíp"
        placeholder="Tất cả tổ/kíp"
        value={unitFilter}
        onChange={(unitIds: number[]) =>
          setUnitFilterState({ workshopId, unitIds })
        }
        options={unitOptions}
        optionFilterProp="label"
        maxTagCount="responsive"
        className="w-40 sm:w-64 lg:w-96"
      />
    ) : undefined;

  // Đổi kiểu xem Bảng công việc (trang quản lý và trang xem): 1 bảng chung ↔ mỗi tổ/kíp 1 sheet
  const isSheetLayout = gridLayout === "SHEET";
  const layoutToggle =
    tab === "grid" && canSwitchLayout ? (
      <Tooltip
        title={
          isSheetLayout
            ? "Xem mọi tổ/kíp trong 1 bảng"
            : "Xem từng tổ/kíp theo sheet"
        }
      >
        <Button
          icon={isSheetLayout ? <TableOutlined /> : <AppstoreOutlined />}
          onClick={() =>
            updateParams({ view: isSheetLayout ? undefined : "sheet" })
          }
        >
          <span className="max-sm:hidden">
            {isSheetLayout ? "Bảng chung" : "Theo sheet"}
          </span>
        </Button>
      </Tooltip>
    ) : undefined;

  const tabBarExtra =
    unitFilterSelect || layoutToggle ? (
      <div className="flex items-center gap-2">
        {unitFilterSelect}
        {layoutToggle}
      </div>
    ) : undefined;

  const renderGrid = () => {
    if (!filter) return <Skeleton active />;
    if (gridQuery.isError && !gridQuery.data) {
      return (
        <ErrorState
          error={gridQuery.error}
          onRetry={() => gridQuery.refetch()}
        />
      );
    }
    if (!gridQuery.data) return <Skeleton active paragraph={{ rows: 10 }} />;
    return (
      <WorkGridView
        grid={gridQuery.data}
        unitFilter={unitFilter}
        layout={gridLayout}
      />
    );
  };

  return (
    <div className={`flex flex-col gap-2 md:gap-3 ${MODE_HEIGHT_CLASS[mode]}`}>
      {toolbar}
      <div className="flex min-h-0 flex-1 flex-col rounded-md bg-bg-container px-3 pb-2 md:px-4 md:pb-3">
        <Tabs
          activeKey={tab}
          onChange={(key) =>
            updateParams({ tab: key === "grid" ? undefined : key })
          }
          destroyOnHidden
          tabBarExtraContent={tabBarExtra}
          className={TABS_FILL_CLASS}
          items={[
            { key: "grid", label: "Bảng công việc", children: renderGrid() },
            {
              key: "summary",
              label: "Tổng hợp",
              children: filter ? (
                <WorkSummaryTable filter={filter} />
              ) : (
                <Skeleton active />
              ),
            },
            {
              key: "materials",
              label: "Vật tư xưởng",
              children: filter ? (
                <WorkshopMaterialTable
                  filter={filter}
                  unitFilter={unitFilter}
                />
              ) : (
                <Skeleton active />
              ),
            },
            ...(canManageUnits
              ? [
                  {
                    key: "units",
                    label: "Đơn vị & kỹ sư",
                    children: (
                      <UnitManagementPanel
                        workshopId={workshop.workshopId}
                        isManager={workshop.isManager}
                      />
                    ),
                  },
                ]
              : []),
          ]}
        />
      </div>
    </div>
  );
};
