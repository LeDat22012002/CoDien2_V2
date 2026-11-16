import {
  DatePicker,
  Form,
  Input,
  Tooltip,
  type FormInstance,
  type TableColumnsType,
} from "antd";
import type { ColumnType } from "antd/es/table";
import type { Dayjs } from "dayjs";
import { useMemo, useState, type ReactNode } from "react";
import dayjs from "@/shared/utils/dayjs";
import { EMPTY_TEXT, toIsoDate } from "@/shared/utils/format";
import { EquipmentInput } from "@/modules/workReports/components/EquipmentInput";
import { WorkerSelect } from "@/modules/workReports/components/WorkerSelect";
import {
  GROUP_ROW_BG,
  UNIT_ROW_BG,
} from "@/modules/workReports/constants/sheetTable";
import { useCollapsedKeys } from "@/modules/workReports/hooks/useCollapsedKeys";
import type {
  WeeklyFormBase,
  WorkCategory,
  WorkItemBase,
  WorkPlanItem,
  WorkWeek,
} from "@/modules/workReports/types/workReports";
import {
  formatDateRange,
  fromWorkerValue,
  toWorkerValue,
} from "@/modules/workReports/utils/workReportUtils";
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
export const toCommonFormValues = (item: WorkItemBase): RowFormValues => ({
  equipmentCode: item.equipmentCode ?? undefined,
  description: item.description,
  dates: [dayjs(item.startDate), dayjs(item.endDate)],
  workers: item.workers.map(toWorkerValue),
  note: item.note ?? undefined,
});

/** Phần chung của request lưu dòng. */
export const toCommonRequest = (
  values: RowFormValues,
  workCategoryId: number,
) => ({
  workCategoryId,
  equipmentCode: values.equipmentCode?.trim() || null,
  description: values.description.trim(),
  startDate: toIsoDate(values.dates?.[0]) ?? null,
  endDate: toIsoDate(values.dates?.[1] ?? values.dates?.[0]) ?? null,
  workers: values.workers.map(fromWorkerValue),
  note: values.note?.trim() || null,
});

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
) => {
  const [rowForm] = Form.useForm<RowFormValues>();
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
    rowForm.setFieldsValue({ workers: [], description: "", dates: [day, day] });
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
  engineerNamesOf: (row: TRow) => string | null | undefined;
  rowForm: FormInstance<RowFormValues>;
  editingWorkers?: WorkItemBase["workers"];
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
                  (ctx.rowForm.getFieldValue("workers") as string[] | undefined)
                    ?.length ?? 0
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
                />
              </Form.Item>,
              () =>
                wrapText(
                  ctx
                    .itemOf(row)
                    ?.workers.map((worker) => worker.displayName)
                    .join(", "),
                ),
            ),
        }),
        leaf({
          title: headerTitle("KTV phụ trách", 10),
          key: "engineers",
          width: 160,
          align: "center",
          render: (_, row) =>
            ctx.isHeaderRow(row)
              ? null
              : wrapText(ctx.engineerNamesOf(row)?.split(", ").join("\n")),
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
