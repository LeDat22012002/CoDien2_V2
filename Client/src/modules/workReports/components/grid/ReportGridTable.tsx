import { BulbOutlined, ImportOutlined, PlusOutlined } from "@ant-design/icons";
import {
  App,
  AutoComplete,
  Button,
  ConfigProvider,
  Form,
  Input,
  InputNumber,
  Select,
  Table,
  Tooltip,
  Typography,
  type TableColumnsType,
} from "antd";
import type { KeyboardEvent, ReactNode } from "react";
import { toApiError } from "@/shared/api/axiosClient";
import { useTableScrollY } from "@/shared/hooks/useTableScrollY";
import { applyServerErrors } from "@/shared/utils/formErrors";
import { EMPTY_TEXT, formatNumber } from "@/shared/utils/format";
import { notify } from "@/shared/utils/notify";
import {
  COLLAPSIBLE_TABLE_COMPONENTS,
  collapsibleRowProps,
} from "@/modules/workReports/components/collapsible/CollapsibleTable";
import {
  EditingActions,
  ItemActions,
} from "@/modules/workReports/components/grid/GridRowActions";
import {
  SheetGroupHeader,
  SheetUnitHeader,
} from "@/modules/workReports/components/grid/SheetGridHeaders";
import {
  commonLeadingColumns,
  commonTrailingColumns,
  createGridLeafColumns,
  groupKey,
  headerTitle,
  toCommonFormValues,
  toCommonRequest,
  unitKey,
  useSheetEditor,
  useSheetRows,
  wrapText,
  type RowFormValues,
  type SheetRow,
} from "@/modules/workReports/components/grid/sheetGridShared";
import {
  EDITING_ROW_CLASS,
  SHEET_TABLE_CLASS,
  SHEET_TABLE_THEME,
} from "@/modules/workReports/constants/sheetTable";
import {
  FIVE_S_SUGGESTIONS,
  WORK_PERMIT_OPTIONS,
} from "@/modules/workReports/constants/workReportOptions";
import {
  useAcceptPlanItems,
  useDeleteReportItem,
  useSaveReportItem,
} from "@/modules/workReports/hooks/useWorkReportQueries";
import type {
  ReportItemRequest,
  WeeklyReportForm,
  WorkPlanItem,
  WorkReportGrid,
  WorkReportItem,
} from "@/modules/workReports/types/workReports";
import { parseMinutesInput } from "@/modules/workReports/utils/workReportUtils";
import { sumColumnWidths } from "@/modules/workReports/utils/sheetTableColumns";

type Row = SheetRow<WorkReportItem, WeeklyReportForm>;

/** Dòng gợi ý: chữ nhạt, nghiêng (chưa phải dữ liệu báo cáo). */
const SUGGESTION_ROW_CLASS = "[&>td]:text-text-secondary [&>td]:italic";

/** Gợi ý từ kế hoạch (Server chỉ trả cho người đang thêm được dòng báo cáo). Ngoài component để giữ tham chiếu. */
const suggestionsOf = (form: WeeklyReportForm) => form.suggestions;

const Tag = ({ title, children }: { title: string; children: string }) => (
  <Tooltip title={title}>
    <span className="rounded bg-warning/15 px-1 text-xs not-italic text-warning">
      {children}
    </span>
  </Tooltip>
);

interface ReportGridTableProps {
  grid: WorkReportGrid;
  /** Tổ/kíp hiển thị (đã lọc), theo thứ tự I, II… */
  forms: WeeklyReportForm[];
}

/**
 * Bảng BÁO CÁO tuần (AntD Table, giống sheet Excel). Thêm / sửa / xóa tự do trong từng đầu mục khi báo cáo đang mở
 * (theo quyền canCreate/canUpdate/canDelete); dòng lưu xong là trang xem thấy ngay.
 * Người nhập thấy thêm dòng kế hoạch chưa báo cáo (chữ nhạt) làm gợi ý: bấm "Đưa vào" để chép thành dòng báo cáo
 * (giữ mã công việc, giờ KH, người, vật tư) rồi nhập phần thực hiện.
 */
export const ReportGridTable = ({ grid, forms }: ReportGridTableProps) => {
  const { modal } = App.useApp();
  const { containerRef, scrollY } = useTableScrollY();
  const { week, categories } = grid;
  const editor = useSheetEditor<WorkReportItem, WeeklyReportForm>(forms, week);
  const { rowForm, editing, editingForm, editingItem, isBusy, collapse } =
    editor;
  const saveMutation = useSaveReportItem();
  const deleteMutation = useDeleteReportItem();
  const acceptMutation = useAcceptPlanItems();

  const rows = useSheetRows<WorkReportItem, WeeklyReportForm>({
    forms,
    categories,
    editing,
    collapsed: collapse.collapsed,
    suggestionsOf,
  });

  const canEditAny = forms.some((form) => form.canEditNow);

  const startEdit = (form: WeeklyReportForm, item: WorkReportItem) => {
    if (!form.canUpdate) return;
    editor.startEdit(form, item, {
      ...toCommonFormValues(item),
      plannedMinutes: item.plannedMinutes?.toString() ?? undefined,
      actualMinutes: item.actualMinutes?.toString() ?? undefined,
      resultPercent: item.resultPercent ?? null,
      workPermit: item.workPermit ?? null,
      fiveS: item.fiveS ?? undefined,
      explanation: item.explanation ?? undefined,
    });
  };

  const accept = async (form: WeeklyReportForm, planItems: WorkPlanItem[]) => {
    try {
      await acceptMutation.mutateAsync({
        formId: form.formId,
        planItemIds: planItems.map((item) => item.id),
      });
      notify.success(
        planItems.length === 1
          ? `Đã đưa ${planItems[0].code} vào báo cáo. Nhập giờ thực tế, kết quả… cho dòng này.`
          : `Đã đưa ${planItems.length} dòng kế hoạch vào báo cáo.`,
      );
    } catch (error) {
      notify.apiError(error);
    }
  };

  const confirmAcceptAll = (form: WeeklyReportForm) =>
    modal.confirm({
      title: `Đưa ${form.suggestions.length} dòng kế hoạch vào báo cáo?`,
      content: `${form.unitName}: chép mọi dòng kế hoạch chưa báo cáo (giữ mã công việc, giờ KH, người thực hiện, vật tư). Sau đó sửa phần thực hiện hoặc xóa việc không làm.`,
      okText: "Đưa vào báo cáo",
      cancelText: "Hủy",
      onOk: () => accept(form, form.suggestions),
    });

  const handleSave = async () => {
    if (!editingForm) return;
    const workCategoryId = editingItem?.workCategoryId ?? editing?.categoryId;
    if (workCategoryId === undefined) return;
    let values: RowFormValues;
    try {
      values = await rowForm.validateFields();
    } catch {
      return;
    }

    const planned = parseMinutesInput(
      values.plannedMinutes,
      values.workers.length,
    );
    const actual = parseMinutesInput(
      values.actualMinutes,
      values.workers.length,
    );
    if (planned === undefined || actual === undefined) {
      rowForm.setFields([
        {
          name: planned === undefined ? "plannedMinutes" : "actualMinutes",
          errors: ["Nhập số phút hoặc dạng 8h"],
        },
      ]);
      return;
    }

    const request: ReportItemRequest = {
      ...toCommonRequest(values, workCategoryId),
      // Giờ KH chỉ Server nhận với dòng thêm ở báo cáo; dòng từ kế hoạch giữ giờ KH cũ
      plannedMinutes: planned,
      actualMinutes: actual,
      resultPercent: values.resultPercent ?? null,
      workPermit: values.workPermit ?? null,
      fiveS: values.fiveS?.trim() || null,
      explanation: values.explanation?.trim() || null,
    };
    try {
      if (editingItem) {
        await saveMutation.mutateAsync({
          mode: "update",
          id: editingItem.id,
          request: {
            ...request,
            rowVersion: editing?.rowVersion ?? editingItem.rowVersion,
          },
        });
      } else {
        await saveMutation.mutateAsync({
          mode: "create",
          formId: editingForm.formId,
          request,
        });
      }
      editor.cancelEdit();
    } catch (error) {
      const apiError = toApiError(error);
      if (apiError.status === 409) {
        notify.warning(apiError.message, {
          toastId: `conflict-${editingItem?.id ?? "draft"}`,
        });
        editor.cancelEdit();
        return;
      }
      if (!applyServerErrors(rowForm, error)) notify.apiError(error);
    }
  };

  const confirmDelete = (item: WorkReportItem) =>
    modal.confirm({
      title: `Xóa dòng báo cáo ${item.code}?`,
      content: item.isUnplanned
        ? "Vật tư báo cáo gắn với dòng này cũng bị xóa."
        : "Vật tư báo cáo gắn với dòng này cũng bị xóa. Dòng kế hoạch gốc sẽ hiện lại thành gợi ý.",
      okText: "Xóa",
      okButtonProps: { danger: true },
      cancelText: "Hủy",
      onOk: async () => {
        try {
          await deleteMutation.mutateAsync(item.id);
          notify.success("Đã xóa dòng báo cáo.");
        } catch (error) {
          notify.apiError(error);
        }
      },
    });

  const isHeaderRow = (row: Row) => row.kind === "unit" || row.kind === "group";
  const isEditingRow = (row: Row) =>
    (row.kind === "item" && editing?.itemId === row.item.id) ||
    row.kind === "draft";
  const itemOf = (row: Row) =>
    row.kind === "item" || row.kind === "suggestion" ? row.item : undefined;
  const reportItemOf = (row: Row) =>
    row.kind === "item" ? row.item : undefined;

  const renderHeader = (row: Row) => {
    if (row.kind === "unit") {
      const { form } = row;
      return (
        <SheetUnitHeader
          form={form}
          phase="REPORT"
          expanded={!collapse.collapsed.has(unitKey(form.formId))}
          onToggle={() => collapse.toggle(unitKey(form.formId))}
          collapsedLabel={`${form.itemCount} dòng`}
          extra={
            form.canCreate && form.suggestions.length > 0 ? (
              <Button
                size="small"
                type="link"
                icon={<ImportOutlined />}
                disabled={isBusy}
                loading={acceptMutation.isPending}
                onClick={() => confirmAcceptAll(form)}
              >
                Đưa tất cả kế hoạch vào báo cáo ({form.suggestions.length})
              </Button>
            ) : undefined
          }
        />
      );
    }
    if (row.kind !== "group") return null;
    const key = groupKey(row.form.formId, row.category.id);
    return (
      <SheetGroupHeader
        category={row.category}
        count={row.count}
        suggestionCount={row.suggestionCount}
        expanded={!collapse.collapsed.has(key)}
        onToggle={() => collapse.toggle(key)}
        canAdd={row.form.canCreate && row.category.isActive && !isBusy}
        onAdd={() => editor.startDraft(row.form, row.category.id)}
      />
    );
  };

  const { leaf, leafColumns } = createGridLeafColumns<
    WorkReportItem,
    WeeklyReportForm
  >();
  const ctx = {
    leaf,
    categories,
    week,
    renderHeader,
    isHeaderRow,
    isEditingRow,
    itemOf,
    renderTt: (row: Row) => {
      if (row.kind === "item") return row.item.tt;
      if (row.kind === "suggestion")
        return (
          <Tooltip title="Gợi ý từ kế hoạch (chỉ bạn thấy, chưa có trong báo cáo)">
            <BulbOutlined
              className="text-warning"
              aria-label="Gợi ý từ kế hoạch"
            />
          </Tooltip>
        );
      return <PlusOutlined className="text-primary" aria-label="Dòng mới" />;
    },
    renderCode: (row: Row) => {
      if (row.kind === "draft")
        return <Typography.Text type="secondary">Tự sinh</Typography.Text>;
      const item = itemOf(row);
      return (
        <span className="inline-flex items-center gap-1">
          <span className="font-mono">{item?.code}</span>
          {row.kind === "suggestion" && (
            <Tag title="Dòng kế hoạch chưa đưa vào báo cáo">KH</Tag>
          )}
          {row.kind === "item" && row.item.isUnplanned && (
            <Tag title="Việc phát sinh (không có trong kế hoạch)">PS</Tag>
          )}
        </span>
      );
    },
    categoryIdOf: (row: Row) =>
      row.kind === "item" || row.kind === "suggestion"
        ? row.item.workCategoryId
        : row.kind === "draft"
          ? row.categoryId
          : undefined,
    unitNameOf: (row: Row) => row.form.unitName,
    unitIdOf: (row: Row) => row.form.unitId,
    engineerNamesOf: (row: Row) => row.form.engineerNames,
    rowForm,
    editingWorkers: editingItem?.workers,
    onSave: handleSave,
  };

  /** Ô phần thực hiện: đang sửa → control; dòng báo cáo → giá trị; gợi ý / tiêu đề → trống. */
  const reportCell = (
    row: Row,
    control: ReactNode,
    display: (item: WorkReportItem) => ReactNode,
  ) => {
    if (isEditingRow(row)) return control;
    const item = reportItemOf(row);
    return item ? display(item) : null;
  };

  const columns: TableColumnsType<Row> = [
    ...commonLeadingColumns(ctx),
    {
      title: "Giờ công thực hiện (phút)",
      key: "minutes",
      children: [
        leaf({
          title: headerTitle("Theo kế hoạch", 11),
          key: "plannedMinutes",
          width: 110,
          align: "center",
          render: (_, row) => {
            // Dòng thêm ở báo cáo (mới / việc phát sinh): tự điền giờ KH; dòng từ kế hoạch: giữ giờ KH
            const isOwnPlanned =
              row.kind === "draft" ||
              (row.kind === "item" && row.item.isUnplanned);
            if (isEditingRow(row) && isOwnPlanned) {
              return (
                <Form.Item
                  name="plannedMinutes"
                  className="mb-0"
                  rules={[{ required: true, message: "Nhập giờ KH" }]}
                >
                  <Input
                    aria-label="Giờ công kế hoạch"
                    placeholder="phút / 8h"
                    onPressEnter={handleSave}
                    className="text-right"
                  />
                </Form.Item>
              );
            }
            const item = itemOf(row) as
              (WorkPlanItem | WorkReportItem) | undefined;
            return item ? formatNumber(item.plannedMinutes, 2) : null;
          },
        }),
        leaf({
          title: headerTitle("Theo thực tế", 12),
          key: "actualMinutes",
          width: 110,
          align: "center",
          render: (_, row) =>
            reportCell(
              row,
              <Form.Item name="actualMinutes" className="mb-0">
                <Input
                  aria-label="Giờ công thực tế"
                  placeholder="phút / 8h"
                  onPressEnter={handleSave}
                  className="text-right"
                />
              </Form.Item>,
              (item) =>
                item.actualMinutes === null ||
                item.actualMinutes === undefined ? (
                  <Tooltip title="Chưa nhập: tính bằng giờ kế hoạch">
                    <span className="text-text-secondary">
                      {formatNumber(item.effectiveActualMinutes, 2)}
                    </span>
                  </Tooltip>
                ) : (
                  formatNumber(item.actualMinutes, 2)
                ),
            ),
        }),
        leaf({
          title: headerTitle("Chênh lệch", 13),
          key: "diff",
          width: 90,
          align: "center",
          render: (_, row) => {
            const item = reportItemOf(row);
            if (!item || isEditingRow(row)) return null;
            return (
              <span
                className={
                  item.diffMinutes > 0
                    ? "text-error"
                    : item.diffMinutes < 0
                      ? "text-success"
                      : ""
                }
              >
                {formatNumber(item.diffMinutes, 2)}
              </span>
            );
          },
        }),
      ],
    },
    leaf({
      title: headerTitle("Kết quả thực hiện", 14),
      key: "resultPercent",
      width: 100,
      align: "center",
      render: (_, row) =>
        reportCell(
          row,
          <Form.Item name="resultPercent" className="mb-0">
            <InputNumber
              aria-label="Kết quả thực hiện"
              min={0}
              max={100}
              className="w-full"
              suffix="%"
            />
          </Form.Item>,
          (item) =>
            item.resultPercent === null || item.resultPercent === undefined
              ? EMPTY_TEXT
              : `${formatNumber(item.resultPercent, 2)}%`,
        ),
    }),
    leaf({
      title: headerTitle("GPLV", 15),
      key: "workPermit",
      width: 90,
      align: "center",
      render: (_, row) =>
        reportCell(
          row,
          <Form.Item name="workPermit" className="mb-0">
            <Select
              aria-label="Giấy phép làm việc"
              allowClear
              options={WORK_PERMIT_OPTIONS}
            />
          </Form.Item>,
          (item) => item.workPermit ?? EMPTY_TEXT,
        ),
    }),
    leaf({
      title: headerTitle("5S", 16),
      key: "fiveS",
      width: 120,
      align: "center",
      render: (_, row) =>
        reportCell(
          row,
          <Form.Item
            name="fiveS"
            className="mb-0"
            rules={[{ max: 255, message: "Tối đa 255 ký tự" }]}
          >
            <AutoComplete aria-label="5S" options={FIVE_S_SUGGESTIONS} />
          </Form.Item>,
          (item) => wrapText(item.fiveS),
        ),
    }),
    leaf({
      title: headerTitle(
        "Diễn giải (Phương án, biện pháp xử lý, lý do chưa hoàn thành)",
        17,
      ),
      key: "explanation",
      width: 220,
      align: "center",
      render: (_, row) =>
        reportCell(
          row,
          <Form.Item
            name="explanation"
            className="mb-0"
            rules={[{ max: 1000, message: "Tối đa 1000 ký tự" }]}
          >
            <Input.TextArea
              aria-label="Diễn giải"
              autoSize={{ minRows: 1, maxRows: 4 }}
            />
          </Form.Item>,
          (item) => wrapText(item.explanation),
        ),
    }),
    ...commonTrailingColumns(ctx),
    ...(canEditAny
      ? [
          leaf({
            title: "Thao tác",
            key: "actions",
            width: 76,
            fixed: "right",
            align: "center",
            render: (_, row) => {
              if (isEditingRow(row))
                return (
                  <EditingActions
                    saving={saveMutation.isPending}
                    onSave={handleSave}
                    onCancel={editor.cancelEdit}
                  />
                );
              if (row.kind === "suggestion") {
                return row.form.canCreate ? (
                  <Tooltip title="Đưa vào báo cáo (giữ mã, giờ KH, người, vật tư)">
                    <Button
                      type="text"
                      size="small"
                      aria-label={`Đưa ${row.item.code} vào báo cáo`}
                      icon={<ImportOutlined className="text-primary" />}
                      disabled={isBusy || acceptMutation.isPending}
                      onClick={() => accept(row.form, [row.item])}
                    />
                  </Tooltip>
                ) : null;
              }
              const item = reportItemOf(row);
              if (!item) return null;
              return (
                <ItemActions
                  code={item.code}
                  canUpdate={row.form.canUpdate}
                  canDelete={row.form.canDelete}
                  disabled={isBusy}
                  onEdit={() => startEdit(row.form, item)}
                  onDelete={() => confirmDelete(item)}
                />
              );
            },
          }),
        ]
      : []),
  ];

  return (
    <Form<RowFormValues> form={rowForm} component={false}>
      <ConfigProvider theme={SHEET_TABLE_THEME}>
        <div
          ref={containerRef}
          onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
            if (event.key === "Escape") editor.cancelEdit();
          }}
          className="min-h-72 flex-1 overflow-hidden"
        >
          <Table<Row>
            rowKey="key"
            size="small"
            bordered
            columns={columns}
            dataSource={rows}
            pagination={false}
            components={COLLAPSIBLE_TABLE_COMPONENTS}
            tableLayout="fixed"
            scroll={{ x: sumColumnWidths(leafColumns), y: scrollY }}
            title={() => (
              <div className="text-center text-sm font-bold uppercase">
                {grid.title}
              </div>
            )}
            className={SHEET_TABLE_CLASS}
            onRow={(row) => ({
              ...collapsibleRowProps(row.collapsed),
              onDoubleClick: () => {
                if (row.kind === "item" && !isBusy)
                  startEdit(row.form, row.item);
              },
            })}
            rowClassName={(row) =>
              isEditingRow(row)
                ? EDITING_ROW_CLASS
                : row.kind === "suggestion"
                  ? SUGGESTION_ROW_CLASS
                  : ""
            }
            locale={{
              emptyText: "Chưa có đầu mục công việc áp dụng cho xưởng.",
            }}
          />
        </div>
      </ConfigProvider>
    </Form>
  );
};
