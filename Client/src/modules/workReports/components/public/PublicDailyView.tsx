import { ReloadOutlined } from "@ant-design/icons";
import {
  Badge,
  Button,
  DatePicker,
  Empty,
  Segmented,
  Select,
  Skeleton,
  Tooltip,
} from "antd";
import type { Dayjs } from "dayjs";
import { useMemo, useState } from "react";
import { ErrorState } from "@/shared/components/ErrorState";
import dayjs from "@/shared/utils/dayjs";
import { PlanGridTable } from "@/modules/workReports/components/grid/PlanGridTable";
import { ReportGridTable } from "@/modules/workReports/components/grid/ReportGridTable";
import type { SheetSection } from "@/modules/workReports/components/grid/sheetGridShared";
import {
  readOnlyPresence,
  useWorkReportLiveGroups,
  WorkReportPresenceContext,
} from "@/modules/workReports/hooks/useWorkReportLiveUpdates";
import { usePublicDailyWork } from "@/modules/workReports/hooks/useWorkReportQueries";
import type {
  DailyWorkshop,
  WeeklyPlanForm,
  WeeklyReportForm,
  WorkCategory,
  WorkGrid,
  WorkReportEditor,
  WorkReportPhase,
} from "@/modules/workReports/types/workReports";

const PHASE_TITLE: Record<WorkReportPhase, string> = {
  REPORT: "BÁO CÁO CÔNG VIỆC NGÀY",
  PLAN: "KẾ HOẠCH CÔNG VIỆC NGÀY",
};

/**
 * Gộp lưới trong ngày của các xưởng thành 1 lưới: form nối theo thứ tự xưởng, đầu mục = hợp đầu mục các xưởng
 * (theo thứ tự nhóm; đầu mục không có dòng bị ẩn).
 */
const mergeGrids = (
  workshops: DailyWorkshop<WorkGrid>[],
  phase: WorkReportPhase,
  title: string,
): WorkGrid | undefined => {
  const first = workshops[0]?.grid;
  if (!first) return undefined;
  const categories = new Map<number, WorkCategory>();
  workshops.forEach((workshop) =>
    workshop.grid.categories.forEach((category) =>
      categories.set(category.id, category),
    ),
  );
  const base = {
    workshopId: 0,
    workshopName: "",
    title,
    week: first.week,
    categories: [...categories.values()].sort(
      (a, b) => a.sortOrder - b.sortOrder || a.id - b.id,
    ),
  };
  const forms = workshops.flatMap((workshop) => workshop.grid.forms);
  return phase === "REPORT"
    ? { ...base, phase, forms: forms as WeeklyReportForm[] }
    : { ...base, phase, forms: forms as WeeklyPlanForm[] };
};

/** "Tổ I: Nguyễn A, Trần B · Kíp II: Lê C" — tổ/kíp đang có người nhập (theo thứ tự bắt đầu nhập). */
const editingUnitsText = (editors: WorkReportEditor[]) => {
  const byForm = new Map<number, { unitName: string; names: Set<string> }>();
  editors.forEach((editor) => {
    const entry = byForm.get(editor.formId) ?? {
      unitName: editor.unitName,
      names: new Set<string>(),
    };
    entry.names.add(editor.fullName);
    byForm.set(editor.formId, entry);
  });
  return [...byForm.values()]
    .map((entry) => `${entry.unitName}: ${[...entry.names].join(", ")}`)
    .join(" · ");
};

/** Dấu chấm nhấp nháy + tổ/kíp đang nhập của xưởng (người nhập lưu xong thì bảng tự tải lại). */
const EditingBadge = ({ editors }: { editors: WorkReportEditor[] }) =>
  editors.length === 0 ? null : (
    <Badge
      status="processing"
      text={
        <span className="text-xs font-normal">
          Đang nhập – {editingUnitsText(editors)}
        </span>
      }
    />
  );

/**
 * Trang công khai, tab "Hôm nay": báo cáo của ngày đang chọn (mặc định hôm nay) và kế hoạch ngày kế tiếp
 * (mặc định ngày mai) của các xưởng công khai trong 1 bảng giống Chi tiết tuần (cột (1)–(18)), nhóm 3 cấp đều
 * thu gọn được: xưởng (xanh dương) → tổ/kíp (vàng) → đầu mục (xanh lá). Chỉ dòng có khoảng ngày làm phủ ngày đó;
 * số việc, tổng phút tính theo ngày; xưởng không có việc chỉ còn dòng tiêu đề. Bảng cao vừa màn hình, tự cuộn bên trong.
 * Cập nhật tức thì (SignalR, nhóm xưởng × tuần của ngày báo cáo và ngày kế hoạch): KTV lưu / xóa dòng thì bảng tự tải
 * lại; KTV đang nhập thì dòng xưởng hiện "Đang nhập – tổ/kíp: người", dòng đang được sửa hiện tên người sửa.
 */
export const PublicDailyView = () => {
  const [date, setDate] = useState<Dayjs>(() => dayjs());
  const [phase, setPhase] = useState<WorkReportPhase>("REPORT");
  const [workshopId, setWorkshopId] = useState<number>();

  // Báo cáo: ngày đang chọn; kế hoạch: ngày kế tiếp
  const reportDate = date.format("YYYY-MM-DD");
  const planDate = date.add(1, "day").format("YYYY-MM-DD");
  const reportQuery = usePublicDailyWork("REPORT", reportDate);
  const planQuery = usePublicDailyWork("PLAN", planDate);
  const query = phase === "REPORT" ? reportQuery : planQuery;
  const isToday = date.isSame(dayjs(), "day");

  const countOf = (data?: { workshops: { itemCount: number }[] }) =>
    data?.workshops.reduce((sum, workshop) => sum + workshop.itemCount, 0);
  const reportCount = countOf(reportQuery.data);
  const planCount = countOf(planQuery.data);

  const reportLabel = `${isToday ? "Báo cáo hôm nay" : "Báo cáo"} ${date.format("DD/MM")}`;
  const planLabel = `${isToday ? "Kế hoạch ngày mai" : "Kế hoạch"} ${date.add(1, "day").format("DD/MM")}`;

  const workshops = query.data?.workshops ?? [];
  const visibleWorkshops = workshopId
    ? workshops.filter((workshop) => workshop.workshopId === workshopId)
    : workshops;

  // Theo dõi mọi xưởng công khai ở tuần của ngày báo cáo và tuần của ngày kế hoạch (2 tab đều tự cập nhật)
  const reportWeekId = reportQuery.data?.week?.id;
  const planWeekId = planQuery.data?.week?.id;
  const workshopIds = [
    ...new Set(
      [
        ...(reportQuery.data?.workshops ?? []),
        ...(planQuery.data?.workshops ?? []),
      ].map((workshop) => workshop.workshopId),
    ),
  ].join(",");
  const liveTargets = useMemo(
    () =>
      workshopIds
        ? workshopIds
            .split(",")
            .flatMap((id) =>
              [...new Set([reportWeekId, planWeekId])]
                .filter((weekId): weekId is number => weekId !== undefined)
                .map((weekId) => ({ workshopId: Number(id), weekId })),
            )
        : [],
    [workshopIds, reportWeekId, planWeekId],
  );
  const { editorsOf } = useWorkReportLiveGroups(liveTargets);
  /** Người đang nhập giai đoạn đang xem của xưởng (tuần chứa ngày đang xem). */
  const phaseEditorsOf = (id: number) =>
    editorsOf(id, query.data?.week?.id).filter(
      (editor) => editor.phase === phase,
    );

  const visibleEditors = visibleWorkshops.flatMap((workshop) =>
    phaseEditorsOf(workshop.workshopId),
  );
  // Mỗi xưởng 1 nhóm cấp trên tổ/kíp (xưởng không có việc vẫn hiện dòng tiêu đề)
  const sections: SheetSection[] = visibleWorkshops.map((workshop) => ({
    key: String(workshop.workshopId),
    title: workshop.workshopName,
    itemCount: workshop.itemCount,
    formIds: workshop.grid.forms.map((form) => form.formId),
    extra: <EditingBadge editors={phaseEditorsOf(workshop.workshopId)} />,
  }));
  const shownDate = phase === "REPORT" ? date : date.add(1, "day");
  const grid = mergeGrids(
    visibleWorkshops,
    phase,
    `${PHASE_TITLE[phase]} ${shownDate.format("DD/MM/YYYY")}`,
  );

  const renderContent = () => {
    if (query.isError && !query.data)
      return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
    if (!query.data) return <Skeleton active paragraph={{ rows: 8 }} />;
    if (!query.data.week)
      return (
        <Empty description="Chưa có kỳ tuần cho ngày này." className="py-10" />
      );
    if (!grid)
      return (
        <Empty
          description="Chưa có xưởng nào hiện trên trang công khai."
          className="py-10"
        />
      );
    return (
      // Bảng hiện tên người đang sửa ngay trên dòng / dòng tiêu đề tổ/kíp
      <WorkReportPresenceContext value={readOnlyPresence(visibleEditors)}>
        {grid.phase === "PLAN" ? (
          <PlanGridTable
            grid={grid}
            forms={grid.forms}
            sections={sections}
            hideEmptyGroups
          />
        ) : (
          <ReportGridTable
            grid={grid}
            forms={grid.forms}
            sections={sections}
            hideEmptyGroups
          />
        )}
      </WorkReportPresenceContext>
    );
  };

  return (
    // Cao vừa phần dưới thanh chọn phần (như Chi tiết tuần): chỉ thân bảng cuộn
    <div className="flex h-[calc(100dvh-136px)] flex-col gap-2 md:h-[calc(100dvh-156px)] md:gap-3">
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 rounded-md bg-bg-container px-3 py-2 md:px-4">
        <Segmented<WorkReportPhase>
          aria-label="Báo cáo hoặc kế hoạch"
          value={phase}
          onChange={setPhase}
          options={[
            {
              value: "REPORT",
              label: `${reportLabel}${reportCount !== undefined ? ` (${reportCount})` : ""}`,
            },
            {
              value: "PLAN",
              label: `${planLabel}${planCount !== undefined ? ` (${planCount})` : ""}`,
            },
          ]}
        />
        <DatePicker
          aria-label="Ngày báo cáo"
          value={date}
          onChange={(value) => setDate(value ?? dayjs())}
          format="DD/MM/YYYY"
          allowClear={false}
        />
        <Button disabled={isToday} onClick={() => setDate(dayjs())}>
          Hôm nay
        </Button>
        <Select
          aria-label="Lọc xưởng"
          allowClear
          placeholder="Tất cả xưởng"
          value={workshopId}
          onChange={setWorkshopId}
          options={workshops.map((workshop) => ({
            value: workshop.workshopId,
            label: workshop.workshopName,
          }))}
          className="w-full sm:w-72"
        />
        <Tooltip title="Tải lại">
          <Button
            aria-label="Tải lại"
            icon={<ReloadOutlined />}
            loading={query.isFetching}
            onClick={() => {
              reportQuery.refetch();
              planQuery.refetch();
            }}
          />
        </Tooltip>
      </div>
      <div className="flex min-h-0 flex-1 flex-col rounded-md bg-bg-container px-3 py-2 md:px-4 md:py-3">
        {renderContent()}
      </div>
    </div>
  );
};
