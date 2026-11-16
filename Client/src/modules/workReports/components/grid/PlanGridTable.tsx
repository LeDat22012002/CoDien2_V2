import { PlusOutlined } from "@ant-design/icons";
import {
  App,
  ConfigProvider,
  Form,
  Input,
  Table,
  Typography,
  type TableColumnsType,
} from "antd";
import type { KeyboardEvent } from "react";
import { toApiError } from "@/shared/api/axiosClient";
import { useTableScrollY } from "@/shared/hooks/useTableScrollY";
import { applyServerErrors } from "@/shared/utils/formErrors";
import { formatNumber } from "@/shared/utils/format";
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
  type RowFormValues,
  type SheetRow,
} from "@/modules/workReports/components/grid/sheetGridShared";
import {
  EDITING_ROW_CLASS,
  SHEET_TABLE_CLASS,
  SHEET_TABLE_THEME,
} from "@/modules/workReports/constants/sheetTable";
import {
  useDeletePlanItem,
  useSavePlanItem,
} from "@/modules/workReports/hooks/useWorkReportQueries";
import type {
  PlanItemRequest,
  WeeklyPlanForm,
  WorkPlanGrid,
  WorkPlanItem,
} from "@/modules/workReports/types/workReports";
import { parseMinutesInput } from "@/modules/workReports/utils/workReportUtils";
import { sumColumnWidths } from "@/modules/workReports/utils/sheetTableColumns";

type Row = SheetRow<WorkPlanItem, WeeklyPlanForm>;

interface PlanGridTableProps {
  grid: WorkPlanGrid;
  /** Tổ/kíp hiển thị (đã lọc), theo thứ tự I, II… */
  forms: WeeklyPlanForm[];
}

/**
 * Bảng KẾ HOẠCH tuần (AntD Table, giống sheet Excel): mọi tổ/kíp trong 1 bảng (dòng I, II… tô vàng), mỗi tổ nhóm theo
 * đầu mục (dòng A, B… tô xanh). Thêm / sửa / xóa tự do trong hạn kế hoạch theo quyền (canCreate/canUpdate/canDelete);
 * quá hạn thì khóa, chỉ admin mở khóa. Sửa tại chỗ: double-click hoặc bút; Enter lưu, Esc hủy.
 */
export const PlanGridTable = ({ grid, forms }: PlanGridTableProps) => {
  const { modal } = App.useApp();
  const { containerRef, scrollY } = useTableScrollY();
  const { week, categories } = grid;
  const editor = useSheetEditor<WorkPlanItem, WeeklyPlanForm>(forms, week);
  const { rowForm, editing, editingForm, editingItem, isBusy, collapse } =
    editor;
  const saveMutation = useSavePlanItem();
  const deleteMutation = useDeletePlanItem();

  const rows = useSheetRows<WorkPlanItem, WeeklyPlanForm>({
    forms,
    categories,
    editing,
    collapsed: collapse.collapsed,
  });

  const canEditAny = forms.some((form) => form.canEditNow);

  const startEdit = (form: WeeklyPlanForm, item: WorkPlanItem) => {
    if (!form.canUpdate) return;
    editor.startEdit(form, item, {
      ...toCommonFormValues(item),
      plannedMinutes: item.plannedMinutes?.toString() ?? undefined,
    });
  };

  const handleSave = async () => {
    if (!editingForm) return;
    // Đầu mục cố định theo nhóm: dòng đang sửa giữ đầu mục của nó, dòng mới lấy nhóm đã bấm "Thêm dòng"
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
    if (planned === undefined) {
      rowForm.setFields([
        { name: "plannedMinutes", errors: ["Nhập số phút hoặc dạng 8h"] },
      ]);
      return;
    }

    const request: PlanItemRequest = {
      ...toCommonRequest(values, workCategoryId),
      plannedMinutes: planned,
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
        // Người khác vừa sửa: bỏ bản đang sửa, lưới tải lại dữ liệu mới nhất
        notify.warning(apiError.message, {
          toastId: `conflict-${editingItem?.id ?? "draft"}`,
        });
        editor.cancelEdit();
        return;
      }
      if (!applyServerErrors(rowForm, error)) notify.apiError(error);
    }
  };

  const confirmDelete = (item: WorkPlanItem) =>
    modal.confirm({
      title: `Xóa dòng kế hoạch ${item.code}?`,
      content:
        "Vật tư kế hoạch gắn với dòng này cũng bị xóa. Mã công việc đã cấp không dùng lại.",
      okText: "Xóa",
      okButtonProps: { danger: true },
      cancelText: "Hủy",
      onOk: async () => {
        try {
          await deleteMutation.mutateAsync(item.id);
          notify.success("Đã xóa dòng kế hoạch.");
        } catch (error) {
          notify.apiError(error);
        }
      },
    });

  const isHeaderRow = (row: Row) => row.kind === "unit" || row.kind === "group";
  const isEditingRow = (row: Row) =>
    (row.kind === "item" && editing?.itemId === row.item.id) ||
    row.kind === "draft";
  const itemOf = (row: Row) => (row.kind === "item" ? row.item : undefined);

  const renderHeader = (row: Row) => {
    if (row.kind === "unit") {
      return (
        <SheetUnitHeader
          form={row.form}
          phase="PLAN"
          expanded={!collapse.collapsed.has(unitKey(row.form.formId))}
          onToggle={() => collapse.toggle(unitKey(row.form.formId))}
          collapsedLabel={`${row.form.itemCount} dòng`}
        />
      );
    }
    if (row.kind !== "group") return null;
    const key = groupKey(row.form.formId, row.category.id);
    return (
      <SheetGroupHeader
        category={row.category}
        count={row.count}
        expanded={!collapse.collapsed.has(key)}
        onToggle={() => collapse.toggle(key)}
        canAdd={row.form.canCreate && row.category.isActive && !isBusy}
        onAdd={() => editor.startDraft(row.form, row.category.id)}
      />
    );
  };

  const { leaf, leafColumns } = createGridLeafColumns<
    WorkPlanItem,
    WeeklyPlanForm
  >();
  const ctx = {
    leaf,
    categories,
    week,
    renderHeader,
    isHeaderRow,
    isEditingRow,
    itemOf,
    renderTt: (row: Row) =>
      row.kind === "item" ? (
        row.item.tt
      ) : (
        <PlusOutlined className="text-primary" aria-label="Dòng mới" />
      ),
    renderCode: (row: Row) =>
      row.kind === "draft" ? (
        <Typography.Text type="secondary">Tự sinh</Typography.Text>
      ) : (
        <span className="font-mono">{itemOf(row)?.code}</span>
      ),
    categoryIdOf: (row: Row) =>
      row.kind === "item"
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
            if (isHeaderRow(row)) return null;
            if (isEditingRow(row)) {
              return (
                <Form.Item name="plannedMinutes" className="mb-0">
                  <Input
                    aria-label="Giờ công kế hoạch"
                    placeholder="phút / 8h"
                    onPressEnter={handleSave}
                    className="text-right"
                  />
                </Form.Item>
              );
            }
            return formatNumber(itemOf(row)?.plannedMinutes, 2);
          },
        }),
      ],
    },
    ...commonTrailingColumns(ctx),
    // Thao tác ở cuối, ghim phải; chỉ có khi có tổ/kíp đang nhập
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
              const item = itemOf(row);
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
            rowClassName={(row) => (isEditingRow(row) ? EDITING_ROW_CLASS : "")}
            locale={{
              emptyText: "Chưa có đầu mục công việc áp dụng cho xưởng.",
            }}
          />
        </div>
      </ConfigProvider>
    </Form>
  );
};
