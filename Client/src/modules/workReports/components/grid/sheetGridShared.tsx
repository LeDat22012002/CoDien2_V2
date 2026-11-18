import {
  DatePicker,
  Form,
  Input,
  Select,
  Tooltip,
  type FormInstance,
  type TableColumnsType,
} from "antd";
import type { ColumnType } from "antd/es/table";
import type { Dayjs } from "dayjs";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import dayjs from "@/shared/utils/dayjs";
import { EMPTY_TEXT, formatDateTime, toIsoDate } from "@/shared/utils/format";
import type { ConflictField } from "@/modules/workReports/utils/conflictFields";
import { EquipmentInput } from "@/modules/workReports/components/EquipmentInput";
import { WorkerSelect } from "@/modules/workReports/components/WorkerSelect";
import {
  GROUP_ROW_BG,
  UNIT_ROW_BG,
} from "@/modules/workReports/constants/sheetTable";
import { useAuthStore } from "@/stores/authStore";
import { useCollapsedKeys } from "@/modules/workReports/hooks/useCollapsedKeys";
import { useWorkReportPresence } from "@/modules/workReports/hooks/useWorkReportLiveUpdates";
import type {
  EngineerOption,
  OrgUnitOption,
  WeeklyFormBase,
  WorkCategory,
  WorkItemBase,
  WorkItemWorker,
  WorkPlanItem,
  WorkReportEditor,
  WorkReportPhase,
  WorkWeek,
} from "@/modules/workReports/types/workReports";
import {
  countWorkerValues,
  formatDateRange,
  fromWorkerValue,
  isRowEngineer,
  isWholeGroupValue,
  isWholeUnitValue,
  isWholeValue,
  parseWholeGroupValue,
  toWholeGroupValue,
  toWholeUnitValue,
  toWorkerValue,
  wholeGroupLabel,
} from "@/modules/workReports/utils/workReportUtils";
import { WHOLE_UNIT_LABEL } from "@/modules/workReports/constants/workReportOptions";
import { createSheetLeafColumns } from "@/modules/workReports/utils/sheetTableColumns";

/**
 * Phần dùng chung của Bảng kế hoạch (PlanGridTable) và Bảng báo cáo (ReportGridTable): dựng dòng theo tổ/kíp → đầu mục,
 * trạng thái sửa tại chỗ, các cột chung (1)–(10) và (18), Tuần. Dòng tiêu đề tổ/đầu mục: SheetGridHeaders.tsx.
 */

/** Form có danh sách dòng (kế hoạch hoặc báo cáo). */
export type SheetForm<TItem extends WorkItemBase> = WeeklyFormBase & {
  items: TItem[];
};

/**
 * Dòng của bảng: tiêu đề tổ/kíp (I, II…), tiêu đề đầu mục (A, B…), dòng công việc, gợi ý từ kế hoạch (chỉ bảng báo cáo),
 * dòng mới đang nhập. collapsed: thuộc nhóm đang thu gọn (vẫn render để chạy hiệu ứng, chỉ co lại).
 */
export type SheetRow<
  TItem extends WorkItemBase,
  TForm extends SheetForm<TItem>,
> = (
  | { kind: "unit"; key: string; form: TForm }
  | {
      kind: "group";
      key: string;
      form: TForm;
      category: WorkCategory;
      count: number;
      suggestionCount: number;
    }
  | { kind: "item"; key: string; form: TForm; item: TItem }
  | { kind: "suggestion"; key: string; form: TForm; item: WorkPlanItem }
  | { kind: "draft"; key: string; form: TForm; categoryId: number }
) & { collapsed: boolean };

/** Dòng đang sửa: itemId có = sửa dòng, không có = dòng mới thuộc đầu mục categoryId. */
export interface EditingState {
  formId: number;
  itemId?: number;
  /** rowVersion lúc bắt đầu sửa: dữ liệu tự làm mới (SignalR) giữa chừng thì vẫn gửi bản cũ để Server báo 409. */
  rowVersion?: string;
  categoryId?: number;
}

/** Giá trị ô khi sửa 1 dòng (trường của giai đoạn nào thì bảng đó dùng). */
export interface RowFormValues {
  equipmentCode?: string;
  description: string;
  /** [ngày bắt đầu, ngày kết thúc]. */
  dates?: [Dayjs, Dayjs];
  workers: string[];
  /** (10) KTV phụ trách (Id nhân viên). */
  engineerIds?: number[];
  plannedMinutes?: string;
  actualMinutes?: string;
  resultPercent?: number | null;
  workPermit?: string | null;
  fiveS?: string;
  explanation?: string;
  note?: string;
}

export const dash = <span className="text-text-secondary">{EMPTY_TEXT}</span>;

/** Chữ dài xuống dòng như ô Excel (Wrap text). */
export const wrapText = (value?: string | null) =>
  value ? (
    <span className="whitespace-pre-line wrap-break-word">{value}</span>
  ) : (
    dash
  );

/** Tiêu đề cột 2 dòng: tên + số cột (n) như file Excel. */
export const headerTitle = (label: string, columnNo?: number) => (
  <div className="flex flex-col items-center leading-tight">
    <span>{label}</span>
    {columnNo !== undefined && (
      <span className="text-xs font-normal text-text-secondary">
        ({columnNo})
      </span>
    )}
  </div>
);

/** Khóa thu gọn của tổ/kíp và của đầu mục trong tổ/kíp. */
export const unitKey = (formId: number) => `u-${formId}`;
export const groupKey = (formId: number, categoryId: number) =>
  `g-${formId}-${categoryId}`;

/** Giá trị chung của form khi sửa 1 dòng. */
export const toCommonFormValues = (
  item: WorkItemBase,
  form: WeeklyFormBase,
): RowFormValues => ({
  equipmentCode: item.equipmentCode ?? undefined,
  description: item.description,
  dates: [dayjs(item.startDate), dayjs(item.endDate)],
  workers: !item.isWholeUnit
    ? item.workers.map(toWorkerValue)
    : item.wholeGroups.length > 0
      ? // Không biết số người từng tổ đã chụp: dồn tổng vào tổ đầu (chỉ dùng để đếm)
        item.wholeGroups.map((group, index) =>
          toWholeGroupValue(group.orgUnitId, index === 0 ? item.workerCount : 0),
        )
      : [toWholeUnitValue(item.workerCount)],
  // Dòng cũ chưa lưu KTV: điền KTV của tổ (đúng như đang hiển thị)
  engineerIds: (item.engineers.length > 0
    ? item.engineers
    : form.engineers
  ).map((engineer) => engineer.employeeId),
  note: item.note ?? undefined,
});

/** Phần chung của request lưu dòng. */
export const toCommonRequest = (
  values: RowFormValues,
  workCategoryId: number,
) => {
  const isWholeUnit = values.workers.some(isWholeValue);
  return {
    workCategoryId,
    equipmentCode: values.equipmentCode?.trim() || null,
    description: values.description.trim(),
    startDate: toIsoDate(values.dates?.[0]) ?? null,
    endDate: toIsoDate(values.dates?.[1] ?? values.dates?.[0]) ?? null,
    isWholeUnit,
    wholeGroupOrgUnitIds: values.workers
      .filter(isWholeGroupValue)
      .map((value) => parseWholeGroupValue(value).orgUnitId),
    workers: isWholeUnit ? [] : values.workers.map(fromWorkerValue),
    engineerIds: values.engineerIds ?? [],
    note: values.note?.trim() || null,
  };
};

/** Tooltip "Sửa lần cuối: … · giờ" của 1 dòng (undefined nếu chưa có thông tin). */
export const lastEditText = (item: {
  updatedAt?: string | null;
  updatedBy?: string | null;
  updatedByName?: string | null;
}) =>
  item.updatedAt
    ? `Sửa lần cuối: ${item.updatedByName ?? item.updatedBy ?? "không rõ"} · ${formatDateTime(item.updatedAt)}`
    : undefined;

/** Nhãn "Cả tổ" của dòng: cả đơn vị hoặc "Cả tổ Lò cao 1, 2, Cả tổ Lò cao 3, 4". */
const wholeText = (item: WorkItemBase) =>
  item.wholeGroups.length > 0
    ? item.wholeGroups.map((group) => wholeGroupLabel(group.name)).join(", ")
    : WHOLE_UNIT_LABEL;

/** Tên người thực hiện để so sánh khi xung đột: "Cả tổ" hoặc danh sách tên (nhân viên chưa biết tên: "NV #id"). */
const workersText = (
  values: string[],
  known: WorkItemWorker[],
  groups: OrgUnitOption[],
) => {
  if (values.some(isWholeUnitValue)) return WHOLE_UNIT_LABEL;
  if (values.some(isWholeGroupValue)) {
    return values
      .filter(isWholeGroupValue)
      .map((value) => {
        const { orgUnitId } = parseWholeGroupValue(value);
        const group = groups.find((item) => item.orgUnitId === orgUnitId);
        return group ? wholeGroupLabel(group.name) : `Cả tổ #${orgUnitId}`;
      })
      .join(", ");
  }
  const names = new Map(
    known.map((worker) => [toWorkerValue(worker), worker.displayName]),
  );
  return values
    .map(
      (value) =>
        names.get(value) ??
        (value.startsWith("e:") ? `NV #${value.slice(2)}` : value),
    )
    .join(", ");
};

/** Các ô chung để so bản đang sửa (mine) với bản mới nhất trên Server (latest) khi bị 409. */
export const commonConflictFields = (
  mine: RowFormValues,
  latest: WorkItemBase,
  knownWorkers: WorkItemWorker[],
  engineerOptions: EngineerOption[] = [],
  /** Tổ "Cả tổ" của dòng đang sửa (để hiện tên tổ bên bản đang sửa). */
  knownGroups: OrgUnitOption[] = [],
): ConflictField[] => [
  {
    label: "KTV phụ trách",
    mine: (mine.engineerIds ?? [])
      .map(
        (id) =>
          [...engineerOptions, ...latest.engineers].find(
            (engineer) => engineer.employeeId === id,
          )?.fullName ?? `NV #${id}`,
      )
      .join(", "),
    latest: latest.engineers.map((engineer) => engineer.fullName).join(", "),
  },
  {
    label: "Equipment",
    mine: mine.equipmentCode?.trim() ?? "",
    latest: latest.equipmentCode ?? "",
  },
  {
    label: "Hạng mục công việc",
    mine: mine.description?.trim() ?? "",
    latest: latest.description,
  },
  {
    label: "Thời gian",
    mine: formatDateRange(
      toIsoDate(mine.dates?.[0]),
      toIsoDate(mine.dates?.[1] ?? mine.dates?.[0]),
    ),
    latest: formatDateRange(latest.startDate, latest.endDate),
  },
  {
    label: "Người thực hiện",
    mine: workersText(
      mine.workers ?? [],
      [...knownWorkers, ...latest.workers],
      [...knownGroups, ...latest.wholeGroups],
    ),
    latest: latest.isWholeUnit
      ? wholeText(latest)
      : latest.workers.map((worker) => worker.displayName).join(", "),
  },
  {
    label: "Ghi chú",
    mine: mine.note?.trim() ?? "",
    latest: latest.note ?? "",
  },
];

/** Ô người thực hiện khi xem: "Cả tổ" (rê chuột xem danh sách) hoặc tên từng người, mỗi người 1 dòng. */
const renderWorkers = (item?: WorkItemBase) => {
  if (!item) return null;
  const names = item.workers.map((worker) => worker.displayName);
  if (item.isWholeUnit) {
    return (
      <Tooltip title={names.join(", ")}>
        <span className="cursor-help whitespace-pre-line">
          {item.wholeGroups.length > 0
            ? item.wholeGroups
                .map((group) => wholeGroupLabel(group.name))
                .join("\n")
            : WHOLE_UNIT_LABEL}
        </span>
      </Tooltip>
    );
  }
  return wrapText(names.join(", "));
};

/** Dựng dòng bảng: mọi đầu mục đang dùng đều hiện đủ A→… (đầu mục ngừng dùng chỉ hiện khi còn dòng / gợi ý). */
export const useSheetRows = <
  TItem extends WorkItemBase,
  TForm extends SheetForm<TItem>,
>({
  forms,
  categories,
  editing,
  collapsed,
  suggestionsOf,
}: {
  forms: TForm[];
  categories: WorkCategory[];
  editing?: EditingState;
  collapsed: ReadonlySet<string>;
  suggestionsOf?: (form: TForm) => WorkPlanItem[];
}) =>
  useMemo(() => {
    type Row = SheetRow<TItem, TForm>;
    const isDraft = editing !== undefined && editing.itemId === undefined;
    const result: Row[] = [];
    forms.forEach((form) => {
      result.push({
        kind: "unit",
        key: `unit-${form.formId}`,
        form,
        collapsed: false,
      });
      const isEditingForm = editing?.formId === form.formId;
      // Tổ/kíp thu gọn: chỉ còn dòng tiêu đề (đang sửa dòng trong tổ thì luôn mở)
      const isUnitCollapsed =
        collapsed.has(unitKey(form.formId)) && !isEditingForm;
      const suggestions = suggestionsOf?.(form) ?? [];
      categories.forEach((category) => {
        const items = form.items.filter(
          (item) => item.workCategoryId === category.id,
        );
        const groupSuggestions = suggestions.filter(
          (item) => item.workCategoryId === category.id,
        );
        const hasDraft =
          isDraft && isEditingForm && editing?.categoryId === category.id;
        if (
          items.length === 0 &&
          groupSuggestions.length === 0 &&
          !hasDraft &&
          !category.isActive
        )
          return;
        result.push({
          kind: "group",
          key: `group-${form.formId}-${category.id}`,
          form,
          category,
          count: items.length,
          suggestionCount: groupSuggestions.length,
          collapsed: isUnitCollapsed,
        });
        // Đầu mục thu gọn: chỉ còn dòng tiêu đề (đang sửa / thêm dòng trong đầu mục thì luôn mở)
        const isEditingGroup =
          hasDraft ||
          (isEditingForm && items.some((item) => item.id === editing?.itemId));
        const isItemsCollapsed =
          isUnitCollapsed ||
          (collapsed.has(groupKey(form.formId, category.id)) &&
            !isEditingGroup);
        items.forEach((item) =>
          result.push({
            kind: "item",
            key: `item-${item.id}`,
            form,
            item,
            collapsed: isItemsCollapsed,
          }),
        );
        groupSuggestions.forEach((item) =>
          result.push({
            kind: "suggestion",
            key: `suggestion-${item.id}`,
            form,
            item,
            collapsed: isItemsCollapsed,
          }),
        );
        if (hasDraft)
          result.push({
            kind: "draft",
            key: `draft-${form.formId}`,
            form,
            categoryId: category.id,
            collapsed: false,
          });
      });
    });
    return result;
  }, [forms, categories, editing, collapsed, suggestionsOf]);

/** Trạng thái sửa tại chỗ 1 dòng (Form AntD dùng chung cho cả bảng). */
export const useSheetEditor = <
  TItem extends WorkItemBase,
  TForm extends SheetForm<TItem>,
>(
  forms: TForm[],
  week: WorkWeek,
  phase: WorkReportPhase,
) => {
  const [rowForm] = Form.useForm<RowFormValues>();
  const presence = useWorkReportPresence();
  const currentUser = useAuthStore((state) => state.user);
  const [editingState, setEditing] = useState<EditingState>();
  const collapse = useCollapsedKeys();

  const editingForm = forms.find(
    (form) => form.formId === editingState?.formId,
  );
  const editingItem =
    editingState?.itemId === undefined
      ? undefined
      : editingForm?.items.find((item) => item.id === editingState.itemId);
  // Dòng / tổ đang sửa vừa bị người khác xóa (dữ liệu tự làm mới): coi như hết sửa
  const isStale =
    editingState !== undefined &&
    (!editingForm || (editingState.itemId !== undefined && !editingItem));
  const editing = isStale ? undefined : editingState;

  // Báo người khác mình đang sửa / thêm dòng nào; lưu, hủy, rời trang thì thôi
  const editingFormId = editing?.formId;
  const editingItemId = editing?.itemId;
  const { startEditing, stopEditing } = presence;
  useEffect(() => {
    if (editingFormId === undefined) return;
    startEditing(editingFormId, phase, editingItemId);
    return stopEditing;
  }, [editingFormId, editingItemId, phase, startEditing, stopEditing]);

  /** Người khác đang sửa của giai đoạn này. */
  const phaseEditors = presence.editors.filter(
    (editor) => editor.phase === phase,
  );
  /** Người khác đang sửa đúng dòng này (khóa mềm). */
  const lockOf = (
    formId: number,
    itemId: number,
  ): WorkReportEditor | undefined =>
    phaseEditors.find(
      (editor) => editor.formId === formId && editor.itemId === itemId,
    );
  /** Tên người đang thêm dòng mới trong tổ/kíp (hiện ở dòng tiêu đề; người sửa dòng có sẵn hiện ngay trên dòng). */
  const editorNamesOf = (formId: number) => [
    ...new Set(
      phaseEditors
        .filter((editor) => editor.formId === formId && editor.itemId == null)
        .map((editor) => editor.fullName),
    ),
  ];
  /** Sửa / xóa được dòng: quyền của tổ/kíp + là KTV phụ trách dòng (kỹ sư). */
  const canUpdateItem = (form: TForm, item: TItem) =>
    form.canUpdate && isRowEngineer(form.role, item, currentUser?.employeeId);
  const canDeleteItem = (form: TForm, item: TItem) =>
    form.canDelete && isRowEngineer(form.role, item, currentUser?.employeeId);

  /** Lựa chọn cột (10) của dòng đang sửa: KTV đang có trên dòng, kỹ sư được phân công tổ/kíp, người nhập. */
  const engineerOptions = (() => {
    const options = new Map<number, EngineerOption>();
    [
      ...(editingItem?.engineers ?? []),
      ...(editingForm?.engineers ?? []),
      ...(currentUser?.employeeId
        ? [
            {
              employeeId: currentUser.employeeId,
              fullName: currentUser.fullName,
            },
          ]
        : []),
    ].forEach((engineer) => {
      if (!options.has(engineer.employeeId))
        options.set(engineer.employeeId, engineer);
    });
    return [...options.values()];
  })();

  /** Sau khi chọn ghi đè: lưu tiếp với rowVersion mới nhất. */
  const setRowVersion = (rowVersion: string) =>
    setEditing((current) => (current ? { ...current, rowVersion } : current));

  const startEdit = (form: TForm, item: TItem, values: RowFormValues) => {
    rowForm.setFieldsValue(values);
    setEditing({
      formId: form.formId,
      itemId: item.id,
      rowVersion: item.rowVersion,
    });
  };

  const startDraft = (form: TForm, categoryId: number) => {
    collapse.expand(unitKey(form.formId), groupKey(form.formId, categoryId));
    rowForm.resetFields();
    // Ngày mặc định: hôm nay nếu trong tuần, không thì thứ 2 của tuần
    const today = dayjs().format("YYYY-MM-DD");
    const day =
      today >= week.startDate && today <= week.endDate
        ? dayjs(today)
        : dayjs(week.startDate);
    rowForm.setFieldsValue({
      workers: [],
      description: "",
      dates: [day, day],
      // KTV phụ trách mặc định: người nhập
      engineerIds: currentUser?.employeeId ? [currentUser.employeeId] : [],
    });
    setEditing({ formId: form.formId, categoryId });
  };

  const cancelEdit = () => {
    setEditing(undefined);
    rowForm.resetFields();
  };

  return {
    rowForm,
    editing,
    editingForm: editing ? editingForm : undefined,
    editingItem: editing ? editingItem : undefined,
    isDraft: editing !== undefined && editing.itemId === undefined,
    isBusy: editing !== undefined,
    startEdit,
    startDraft,
    cancelEdit,
    setRowVersion,
    engineerOptions,
    lockOf,
    editorNamesOf,
    canUpdateItem,
    canDeleteItem,
    collapse,
  };
};

interface CommonColumnContext<TRow> {
  leaf: (column: ColumnType<TRow>) => ColumnType<TRow>;
  categories: WorkCategory[];
  week: WorkWeek;
  /** Ô TT của dòng tiêu đề tổ / đầu mục. */
  renderHeader: (row: TRow) => ReactNode;
  isHeaderRow: (row: TRow) => boolean;
  isEditingRow: (row: TRow) => boolean;
  /** Dòng công việc / gợi ý của hàng (dòng tiêu đề, dòng mới: undefined). */
  itemOf: (row: TRow) => WorkItemBase | undefined;
  /** TT hiển thị ở cột (1) (dòng gợi ý: icon). */
  renderTt: (row: TRow) => ReactNode;
  /** Mã công việc kèm nhãn (vd PS / gợi ý). */
  renderCode: (row: TRow) => ReactNode;
  categoryIdOf: (row: TRow) => number | undefined;
  unitNameOf: (row: TRow) => string;
  unitIdOf: (row: TRow) => number;
  /** KTV của tổ/kíp (form): hiện cho dòng cũ chưa lưu KTV theo dòng. */
  engineerNamesOf: (row: TRow) => string | null | undefined;
  /** Lựa chọn KTV của dòng đang sửa. */
  engineerOptions: EngineerOption[];
  rowForm: FormInstance<RowFormValues>;
  editingWorkers?: WorkItemBase["workers"];
  /** Tổ "Cả tổ" đã lưu của dòng đang sửa (hiện đúng tên khi danh sách gợi ý chưa tải). */
  editingWholeGroups?: OrgUnitOption[];
  onSave: () => void;
}

/** Ô đang sửa thì hiện control, không thì hiện giá trị. */
const makeCell =
  <TRow,>(ctx: CommonColumnContext<TRow>) =>
  (row: TRow, editor: ReactNode, display: () => ReactNode) => {
    if (ctx.isHeaderRow(row)) return null;
    if (ctx.isEditingRow(row)) return editor;
    return display();
  };

/** Cột chung đầu bảng (1)–(10). Gọi trước các cột riêng để thứ tự cột lá đúng (gộp ô dòng tiêu đề theo thứ tự). */
export const commonLeadingColumns = <TRow,>(
  ctx: CommonColumnContext<TRow>,
): TableColumnsType<TRow> => {
  const { leaf, week } = ctx;
  const cell = makeCell(ctx);
  return [
    // Không đặt align ở cột TT: ô gộp của dòng tiêu đề phải căn trái; số TT căn giữa bên trong
    leaf({
      title: headerTitle("TT", 1),
      key: "tt",
      width: 52,
      fixed: "left",
      render: (_, row) =>
        ctx.isHeaderRow(row) ? (
          ctx.renderHeader(row)
        ) : (
          <div className="text-center">{ctx.renderTt(row)}</div>
        ),
    }),
    leaf({
      title: headerTitle("Tổ thực hiện", 2),
      key: "unit",
      width: 150,
      align: "center",
      fixed: "left",
      render: (_, row) =>
        ctx.isHeaderRow(row) ? null : wrapText(ctx.unitNameOf(row)),
    }),
    leaf({
      title: headerTitle("Công việc thực hiện", 3),
      key: "category",
      width: 130,
      align: "center",
      fixed: "left",
      // Đầu mục cố định theo nhóm (A, B…) nên chỉ hiển thị, không cho chọn
      render: (_, row) => {
        if (ctx.isHeaderRow(row)) return null;
        const categoryId = ctx.categoryIdOf(row);
        return (
          ctx.categories.find((category) => category.id === categoryId)?.code ??
          dash
        );
      },
    }),
    leaf({
      title: headerTitle("Mã công việc", 4),
      key: "code",
      width: 150,
      align: "center",
      fixed: "left",
      render: (_, row) => (ctx.isHeaderRow(row) ? null : ctx.renderCode(row)),
    }),
    leaf({
      title: headerTitle("Equipment", 5),
      key: "equipment",
      width: 160,
      align: "center",
      fixed: "left",
      render: (_, row) =>
        cell(
          row,
          <Form.Item
            name="equipmentCode"
            className="mb-0"
            rules={[{ max: 50, message: "Tối đa 50 ký tự" }]}
          >
            <EquipmentInput onPressEnter={ctx.onSave} />
          </Form.Item>,
          () => {
            const item = ctx.itemOf(row);
            return item?.equipmentCode ? (
              <Tooltip
                title={
                  item.equipmentName ??
                  (item.equipmentId
                    ? undefined
                    : "Mã gõ tự do (không có trong danh mục)")
                }
              >
                <span className="break-all font-mono">
                  {item.equipmentCode}
                </span>
              </Tooltip>
            ) : (
              dash
            );
          },
        ),
    }),
    leaf({
      title: headerTitle("Hạng mục công việc", 6),
      key: "description",
      width: 300,
      align: "center",
      render: (_, row) =>
        cell(
          row,
          <Form.Item
            name="description"
            className="mb-0"
            rules={[
              { required: true, whitespace: true, message: "Nhập hạng mục" },
              { max: 1000, message: "Tối đa 1000 ký tự" },
            ]}
          >
            <Input.TextArea
              aria-label="Hạng mục công việc"
              autoSize={{ minRows: 1, maxRows: 4 }}
              autoFocus
            />
          </Form.Item>,
          () => wrapText(ctx.itemOf(row)?.description),
        ),
    }),
    leaf({
      title: headerTitle("Thời gian thực hiện", 7),
      key: "dates",
      width: 150,
      align: "center",
      render: (_, row) =>
        cell(
          row,
          <Form.Item
            name="dates"
            className="mb-0"
            rules={[{ required: true, message: "Chọn ngày" }]}
          >
            <DatePicker.RangePicker
              aria-label="Ngày bắt đầu – ngày kết thúc"
              placeholder={["Bắt đầu", "Kết thúc"]}
              format="DD/MM"
              className="w-full"
              allowClear={false}
              minDate={dayjs(week.startDate)}
              maxDate={dayjs(week.endDate)}
              defaultPickerValue={[
                dayjs(week.startDate),
                dayjs(week.startDate),
              ]}
            />
          </Form.Item>,
          () => {
            const item = ctx.itemOf(row);
            return item ? formatDateRange(item.startDate, item.endDate) : null;
          },
        ),
    }),
    {
      title: "Nhân sự thực hiện (Người)",
      key: "people",
      children: [
        leaf({
          title: headerTitle("Số người", 8),
          key: "workerCount",
          width: 72,
          align: "center",
          render: (_, row) =>
            ctx.isEditingRow(row) ? (
              <Form.Item noStyle shouldUpdate>
                {() =>
                  countWorkerValues(
                    ctx.rowForm.getFieldValue("workers") as
                      string[] | undefined,
                  )
                }
              </Form.Item>
            ) : (
              ctx.itemOf(row)?.workerCount
            ),
        }),
        leaf({
          title: headerTitle("Tên người thực hiện", 9),
          key: "workers",
          width: 220,
          align: "center",
          render: (_, row) =>
            cell(
              row,
              <Form.Item name="workers" className="mb-0">
                <WorkerSelect
                  unitId={ctx.unitIdOf(row)}
                  initialWorkers={ctx.editingWorkers}
                  initialGroups={ctx.editingWholeGroups}
                />
              </Form.Item>,
              () => renderWorkers(ctx.itemOf(row)),
            ),
        }),
        leaf({
          title: headerTitle("KTV phụ trách", 10),
          key: "engineers",
          width: 160,
          align: "center",
          render: (_, row) =>
            cell(
              row,
              <Form.Item name="engineerIds" className="mb-0">
                <Select
                  mode="multiple"
                  aria-label="KTV phụ trách"
                  placeholder="Người nhập"
                  className="w-full"
                  optionFilterProp="label"
                  options={ctx.engineerOptions.map((engineer) => ({
                    value: engineer.employeeId,
                    label: engineer.fullName,
                  }))}
                />
              </Form.Item>,
              () => {
                // KTV của dòng; dòng cũ chưa lưu KTV theo dòng thì KTV của tổ/kíp
                const engineers = ctx.itemOf(row)?.engineers ?? [];
                return wrapText(
                  engineers.length > 0
                    ? engineers.map((engineer) => engineer.fullName).join("\n")
                    : ctx.engineerNamesOf(row)?.split(", ").join("\n"),
                );
              },
            ),
        }),
      ],
    },
  ];
};

/** Cột chung cuối bảng: (18) Ghi chú, Tuần. Gọi sau các cột riêng. */
export const commonTrailingColumns = <TRow,>(
  ctx: CommonColumnContext<TRow>,
): TableColumnsType<TRow> => {
  const { leaf, week } = ctx;
  const cell = makeCell(ctx);
  const weekLabel = `Tuần ${String(week.isoWeek).padStart(2, "0")}`;
  return [
    leaf({
      title: headerTitle("Ghi chú", 18),
      key: "note",
      width: 180,
      align: "center",
      render: (_, row) =>
        cell(
          row,
          <Form.Item
            name="note"
            className="mb-0"
            rules={[{ max: 500, message: "Tối đa 500 ký tự" }]}
          >
            <Input.TextArea
              aria-label="Ghi chú"
              autoSize={{ minRows: 1, maxRows: 4 }}
            />
          </Form.Item>,
          () => wrapText(ctx.itemOf(row)?.note),
        ),
    }),
    leaf({
      title: headerTitle("Tuần"),
      key: "week",
      width: 80,
      align: "center",
      render: (_, row) => (ctx.isHeaderRow(row) ? null : weekLabel),
    }),
  ];
};

/** Cột lá có gộp ô cho dòng tiêu đề tổ (vàng) / đầu mục (xanh). */
export const createGridLeafColumns = <
  TItem extends WorkItemBase,
  TForm extends SheetForm<TItem>,
>() =>
  createSheetLeafColumns<SheetRow<TItem, TForm>>(
    (row) => row.kind === "unit" || row.kind === "group",
    (row) => (row.kind === "unit" ? UNIT_ROW_BG : GROUP_ROW_BG),
  );
