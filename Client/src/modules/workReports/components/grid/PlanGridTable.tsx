import { PlusOutlined } from "@ant-design/icons";
import {
  App,
  ConfigProvider,
  Form,
  Input,
  Table,
  Tooltip,
  Typography,
  type TableColumnsType,
} from "antd";
import { useState, type KeyboardEvent } from "react";
import { toApiError } from "@/shared/api/axiosClient";
import { useTableScrollY } from "@/shared/hooks/useTableScrollY";
import { applyServerErrors } from "@/shared/utils/formErrors";
import { formatNumber } from "@/shared/utils/format";
import { notify } from "@/shared/utils/notify";
import {
  COLLAPSIBLE_TABLE_COMPONENTS,
  collapsibleRowProps,
} from "@/modules/workReports/components/collapsible/CollapsibleTable";
import { ConflictResolveModal } from "@/modules/workReports/components/ConflictResolveModal";
import {
  diffConflictFields,
  type ConflictField,
} from "@/modules/workReports/utils/conflictFields";
import {
  EditingActions,
  ItemActions,
  LockedByIcon,
} from "@/modules/workReports/components/grid/GridRowActions";
import {
  SheetGroupHeader,
  SheetUnitHeader,
} from "@/modules/workReports/components/grid/SheetGridHeaders";
import {
  commonConflictFields,
  commonLeadingColumns,
  commonTrailingColumns,
  createGridLeafColumns,
  groupKey,
  headerTitle,
  lastEditText,
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
import {
  countWorkerValues,
  parseMinutesInput,
} from "@/modules/workReports/utils/workReportUtils";
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
  const editor = useSheetEditor<WorkPlanItem, WeeklyPlanForm>(
    forms,
    week,
    "PLAN",
  );
  /** Lưu bị 409: bản mới nhất + các ô khác nhau (chờ chọn dùng bản mới / ghi đè). */
  const [conflict, setConflict] = useState<{
    latest: WorkPlanItem;
    fields: ConflictField[];
  }>();
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
      ...toCommonFormValues(item, form),
      plannedMinutes: item.plannedMinutes?.toString() ?? undefined,
    });
  };

  /** Ô để so khi xung đột: phần chung + giờ công KH. */
  const conflictFields = (
    values: RowFormValues,
    latest: WorkPlanItem,
  ): ConflictField[] => [
    ...commonConflictFields(
      values,
      latest,
      editingItem?.workers ?? [],
      editor.engineerOptions,
    ),
    {
      label: "Giờ công KH (phút)",
      mine: formatNumber(
        parseMinutesInput(
          values.plannedMinutes,
          countWorkerValues(values.workers),
        ) ?? null,
        2,
      ),
      latest: formatNumber(latest.plannedMinutes, 2),
    },
  ];

  /** rowVersionOverride: ghi đè sau xung đột (lưu với rowVersion của bản mới nhất). */
  const save = async (rowVersionOverride?: string) => {
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
      countWorkerValues(values.workers),
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
            rowVersion:
              rowVersionOverride ??
              editing?.rowVersion ??
              editingItem.rowVersion,
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
      setConflict(undefined);
    } catch (error) {
      const apiError = toApiError(error);
      const latest = apiError.data as WorkPlanItem | undefined;
      if (apiError.status === 409 && latest && editingItem) {
        // Người khác vừa sửa: giữ bản đang gõ, cho xem khác nhau ở ô nào rồi chọn
        setConflict({
          latest,
          fields: diffConflictFields(conflictFields(values, latest)),
        });
        return;
      }
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

  const handleSave = () => {
    void save();
  };

  const conflictModal = conflict && (
    <ConflictResolveModal
      open
      subject={`Dòng kế hoạch ${conflict.latest.code}`}
      updatedByName={conflict.latest.updatedByName ?? conflict.latest.updatedBy}
      updatedAt={conflict.latest.updatedAt}
      fields={conflict.fields}
      saving={saveMutation.isPending}
      onUseLatest={() => {
        setConflict(undefined);
        editor.cancelEdit();
      }}
      onOverwrite={() => {
        editor.setRowVersion(conflict.latest.rowVersion);
        void save(conflict.latest.rowVersion);
      }}
      onClose={() => setConflict(undefined)}
    />
  );

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
          editorNames={editor.editorNamesOf(row.form.formId)}
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
    renderTt: (row: Row) => {
      if (row.kind !== "item")
        return <PlusOutlined className="text-primary" aria-label="Dòng mới" />;
      const lock = editor.lockOf(row.form.formId, row.item.id);
      return (
        <span className="inline-flex items-center gap-1">
          {row.item.tt}
          {lock && <LockedByIcon name={lock.fullName} />}
        </span>
      );
    },
    renderCode: (row: Row) => {
      if (row.kind === "draft")
        return <Typography.Text type="secondary">Tự sinh</Typography.Text>;
      const item = itemOf(row);
      return (
        <Tooltip title={item ? lastEditText(item) : undefined}>
          <span className="font-mono">{item?.code}</span>
        </Tooltip>
      );
    },
    categoryIdOf: (row: Row) =>
      row.kind === "item"
        ? row.item.workCategoryId
        : row.kind === "draft"
          ? row.categoryId
          : undefined,
    unitNameOf: (row: Row) => row.form.unitName,
    unitIdOf: (row: Row) => row.form.unitId,
    engineerNamesOf: (row: Row) => row.form.engineerNames,
    engineerOptions: editor.engineerOptions,
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
                  lockedBy={editor.lockOf(row.form.formId, item.id)?.fullName}
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
                if (row.kind !== "item" || isBusy) return;
                const lock = editor.lockOf(row.form.formId, row.item.id);
                if (lock && row.form.canUpdate) {
                  notify.info(`${lock.fullName} đang sửa dòng này.`, {
                    toastId: `lock-${row.item.id}`,
                  });
                  return;
                }
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
      {conflictModal}
    </Form>
  );
};
