import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import {
  App,
  Button,
  ConfigProvider,
  Empty,
  Skeleton,
  Table,
  Tooltip,
  Typography,
  type TableColumnsType,
} from "antd";
import { useMemo, useState } from "react";
import { ErrorState } from "@/shared/components/ErrorState";
import { COLUMN_WIDTH } from "@/shared/constants/tableColumns";
import { useTableScrollY } from "@/shared/hooks/useTableScrollY";
import { EMPTY_TEXT, formatDate, formatNumber } from "@/shared/utils/format";
import { notify } from "@/shared/utils/notify";
import { CollapseToggle } from "@/modules/workReports/components/collapsible/CollapseToggle";

import { FormStatusTag } from "@/modules/workReports/components/FormStatusTag";
import { MaterialFormModal } from "@/modules/workReports/components/MaterialFormModal";
import {
  SHEET_TABLE_CLASS,
  SHEET_TABLE_THEME,
  UNIT_ROW_BG,
} from "@/modules/workReports/constants/sheetTable";
import { PHASE_LABELS } from "@/modules/workReports/constants/workReportOptions";
import { useCollapsedKeys } from "@/modules/workReports/hooks/useCollapsedKeys";
import {
  useDeleteWorkMaterial,
  useWorkGrid,
  useWorkshopMaterials,
} from "@/modules/workReports/hooks/useWorkReportQueries";
import type {
  WeeklyForm,
  WorkMaterial,
  WorkReportFilter,
} from "@/modules/workReports/types/workReports";
import {
  createSheetLeafColumns,
  sumColumnWidths,
} from "@/modules/workReports/utils/sheetTableColumns";
import {
  COLLAPSIBLE_TABLE_COMPONENTS,
  collapsibleRowProps,
} from "./collapsible/CollapsibleTable";

interface WorkshopMaterialTableProps {
  filter: WorkReportFilter;
  /** Tổ/kíp đang lọc (ô lọc cạnh thanh tab); trống = tất cả. */
  unitFilter: number[];
}

/** Dòng của bảng: tiêu đề tổ/kíp (I, II…) hoặc 1 vật tư; collapsed = thuộc tổ/kíp đang thu gọn. */
type MaterialRow =
  | {
      kind: "unit";
      key: string;
      form: WeeklyForm;
      count: number;
      collapsed: boolean;
    }
  | {
      kind: "material";
      key: string;
      form: WeeklyForm;
      material: WorkMaterial;
      tt: number;
      collapsed: boolean;
    };

/** Modal đang mở: thêm vật tư cho tổ/kíp (material trống) hoặc sửa vật tư. */
interface ModalState {
  form: WeeklyForm;
  material?: WorkMaterial;
}

const dash = <span className="text-text-secondary">{EMPTY_TEXT}</span>;

/** Chữ dài xuống dòng như ô Excel (Wrap text). */
const wrapText = (value?: string | null, className = "") =>
  value ? (
    <span className={`whitespace-pre-line wrap-break-word ${className}`}>
      {value}
    </span>
  ) : (
    dash
  );

const unitKey = (formId: number) => `u-${formId}`;

/** Quyền trên vật tư = quyền sửa / xóa dòng của giai đoạn (Server kiểm tra lại). */
const materialActions = (form: WeeklyForm) => ({
  canModify: form.canUpdate,
  canDelete: form.canDelete,
});

/**
 * Vật tư cả xưởng trong tuần (sheet "Vật tư sử dụng"), cùng giao diện Bảng công việc: mỗi tổ/kíp 1 nhóm (dòng I, II…
 * tô vàng, thu gọn được), nút "Thêm vật tư" trên dòng tổ/kíp đang nhập; cột thao tác sửa / xóa ở cuối (ghim phải)
 * khi có tổ/kíp sửa được. Ghim trái tới cột Mã vật tư; chữ các cột căn giữa. Thêm / sửa ở modal giữa màn hình.
 */
export const WorkshopMaterialTable = ({
  filter,
  unitFilter,
}: WorkshopMaterialTableProps) => {
  const { modal } = App.useApp();
  // Tổ/kíp (canEditNow, dòng công việc cho ô chọn mã CV) lấy từ lưới: cùng cache với tab Bảng công việc
  const gridQuery = useWorkGrid(filter);
  const materialsQuery = useWorkshopMaterials(filter);
  const deleteMutation = useDeleteWorkMaterial();
  const {
    collapsed,
    toggle: toggleCollapse,
    expand: expandKeys,
  } = useCollapsedKeys();
  // Thân bảng cao hết phần còn lại của tab (khung bọc bảng flex-1 trong nội dung tab)
  const { containerRef, scrollY } = useTableScrollY();
  const [modalState, setModalState] = useState<ModalState>();

  const isReport = filter.phase === "REPORT";
  const grid = gridQuery.data;

  const forms = useMemo(() => {
    const all: WeeklyForm[] = grid?.forms ?? [];
    return unitFilter.length === 0
      ? all
      : all.filter((form) => unitFilter.includes(form.unitId));
  }, [grid?.forms, unitFilter]);

  const rows = useMemo<MaterialRow[]>(() => {
    const byForm = new Map<number, WorkMaterial[]>();
    (materialsQuery.data ?? []).forEach((material) => {
      const list = byForm.get(material.weeklyFormId) ?? [];
      list.push(material);
      byForm.set(material.weeklyFormId, list);
    });

    const result: MaterialRow[] = [];
    forms.forEach((form) => {
      const materials = byForm.get(form.formId) ?? [];
      const isCollapsed = collapsed.has(unitKey(form.formId));
      result.push({
        kind: "unit",
        key: `unit-${form.formId}`,
        form,
        count: materials.length,
        collapsed: false,
      });
      materials.forEach((material, index) =>
        result.push({
          kind: "material",
          key: `material-${material.id}`,
          form,
          material,
          tt: index + 1,
          collapsed: isCollapsed,
        }),
      );
    });
    return result;
  }, [forms, materialsQuery.data, collapsed]);

  if (
    (gridQuery.isError && !grid) ||
    (materialsQuery.isError && !materialsQuery.data)
  ) {
    const failed = gridQuery.isError ? gridQuery : materialsQuery;
    return <ErrorState error={failed.error} onRetry={() => failed.refetch()} />;
  }
  if (!grid || !materialsQuery.data)
    return <Skeleton active paragraph={{ rows: 8 }} />;

  if (grid.forms.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="Xưởng chưa có tổ/kíp nào bạn được xem trong tuần này."
      />
    );
  }

  // Chỉ xem (không tổ/kíp nào đang nhập) → ẩn cột thao tác
  const canEditAny = forms.some((form) => form.canEditNow);

  const openCreate = (form: WeeklyForm) => {
    expandKeys(unitKey(form.formId));
    setModalState({ form });
  };

  const confirmDelete = (material: WorkMaterial) =>
    modal.confirm({
      title: "Xóa vật tư?",
      content: `"${material.materialName}" của ${material.workItemCode} sẽ bị xóa.`,
      okText: "Xóa",
      okButtonProps: { danger: true },
      cancelText: "Hủy",
      onOk: async () => {
        try {
          await deleteMutation.mutateAsync({
            id: material.id,
            phase: filter.phase,
          });
          notify.success("Đã xóa vật tư.");
        } catch (error) {
          notify.apiError(error);
        }
      },
    });

  /** Dòng tiêu đề tổ/kíp: thứ tự La Mã, tên, số vật tư, trạng thái, nút Thêm vật tư. */
  const renderUnitRow = (row: Extract<MaterialRow, { kind: "unit" }>) => {
    const { form } = row;
    const expanded = !collapsed.has(unitKey(form.formId));
    return (
      // sticky: nội dung luôn thấy khi cuộn ngang bảng
      <div className="sticky inset-s-2 inline-flex items-center gap-x-3 whitespace-nowrap">
        <CollapseToggle
          expanded={expanded}
          onToggle={() => toggleCollapse(unitKey(form.formId))}
        >
          <Typography.Text strong>
            {form.orderLabel}. {form.unitName}
          </Typography.Text>
          <Typography.Text type="secondary">
            · {row.count} vật tư
          </Typography.Text>
        </CollapseToggle>
        <FormStatusTag status={form.status} />
        {form.canCreate && (
          <Button
            size="small"
            type="link"
            icon={<PlusOutlined />}
            onClick={() => openCreate(form)}
          >
            Thêm vật tư
          </Button>
        )}
      </div>
    );
  };

  const isHeaderRow = (row: MaterialRow) => row.kind === "unit";
  const materialOf = (row: MaterialRow) =>
    row.kind === "material" ? row.material : undefined;

  // Cột lá: dòng tiêu đề tổ/kíp tự gộp ô (xem createSheetLeafColumns)
  const { leaf, leafColumns } = createSheetLeafColumns<MaterialRow>(
    isHeaderRow,
    () => UNIT_ROW_BG,
  );

  const columns: TableColumnsType<MaterialRow> = [
    // Không đặt align ở cột TT: ô gộp của dòng tiêu đề phải căn trái; số TT căn giữa bên trong
    leaf({
      title: "TT",
      key: "tt",
      width: 52,
      fixed: "left",
      render: (_, row) =>
        row.kind === "unit" ? (
          renderUnitRow(row)
        ) : (
          <div className="text-center">{row.tt}</div>
        ),
    }),
    leaf({
      title: "Mã công việc",
      key: "workItemCode",
      width: 150,
      fixed: "left",
      align: "center",
      render: (_, row) => {
        const material = materialOf(row);
        if (!material) return null;
        return (
          <span className="inline-flex items-center gap-1">
            <Tooltip title={material.workItemDescription}>
              <span className="font-mono">{material.workItemCode}</span>
            </Tooltip>
            {isReport && material.isUnplanned && (
              <Tooltip title="Vật tư phát sinh ">
                {/* <span className="rounded bg-warning/15 px-1 text-xs text-warning">
                  PS
                </span> */}
              </Tooltip>
            )}
          </span>
        );
      },
    }),
    leaf({
      title: "Mã vật tư",
      key: "materialCode",
      width: COLUMN_WIDTH.code,
      fixed: "left",
      align: "center",
      render: (_, row) =>
        isHeaderRow(row)
          ? null
          : wrapText(materialOf(row)?.materialCode, "break-all font-mono"),
    }),
    leaf({
      title: "Tên vật tư",
      key: "materialName",
      fixed: "left",
      width: COLUMN_WIDTH.longText,
      align: "center",
      render: (_, row) =>
        isHeaderRow(row) ? null : wrapText(materialOf(row)?.materialName),
    }),
    leaf({
      title: "ĐVT",
      key: "uom",
      width: COLUMN_WIDTH.short,
      align: "center",
      render: (_, row) =>
        isHeaderRow(row) ? null : (materialOf(row)?.uom ?? dash),
    }),
    leaf({
      title: "Số lượng KH",
      key: "plannedQuantity",
      width: COLUMN_WIDTH.short,
      align: "center",
      render: (_, row) =>
        isHeaderRow(row)
          ? null
          : formatNumber(materialOf(row)?.plannedQuantity, 3),
    }),
    ...(isReport
      ? [
          leaf({
            title: "Số lượng thực tế",
            key: "actualQuantity",
            width: COLUMN_WIDTH.short,
            align: "center",
            render: (_, row) => {
              const material = materialOf(row);
              if (!material) return null;
              return material.actualQuantity === null ||
                material.actualQuantity === undefined ? (
                <Tooltip title="Chưa nhập: tính bằng số lượng kế hoạch">
                  <span className="text-text-secondary">
                    {formatNumber(material.effectiveActualQuantity, 3)}
                  </span>
                </Tooltip>
              ) : (
                formatNumber(material.actualQuantity, 3)
              );
            },
          }),
        ]
      : []),
    leaf({
      title: "KTV phụ trách",
      key: "engineerNames",
      width: COLUMN_WIDTH.name,
      align: "center",
      render: (_, row) =>
        isHeaderRow(row)
          ? null
          : wrapText(
              (materialOf(row)?.engineerNames ?? row.form.engineerNames)
                ?.split(", ")
                .join("\n"),
            ),
    }),
    leaf({
      title: "Ngày sử dụng",
      key: "usageDate",
      width: COLUMN_WIDTH.date,
      align: "center",
      render: (_, row) =>
        isHeaderRow(row) ? null : formatDate(materialOf(row)?.usageDate),
    }),
    leaf({
      title: "Mục đích",
      key: "purpose",
      width: COLUMN_WIDTH.short,
      align: "center",
      render: (_, row) =>
        isHeaderRow(row)
          ? null
          : (materialOf(row)?.materialPurposeCode ?? dash),
    }),
    leaf({
      title: "Ghi chú",
      key: "note",
      width: COLUMN_WIDTH.text,
      align: "center",
      render: (_, row) =>
        isHeaderRow(row) ? null : wrapText(materialOf(row)?.note),
    }),
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
              if (row.kind !== "material") return null;
              const { canModify, canDelete } = materialActions(row.form);
              return (
                <div className="flex justify-center">
                  {canModify && (
                    <Tooltip title="Sửa (double-click dòng)">
                      <Button
                        type="text"
                        size="small"
                        aria-label={`Sửa vật tư ${row.material.materialName}`}
                        icon={<EditOutlined className="text-primary" />}
                        onClick={() =>
                          setModalState({
                            form: row.form,
                            material: row.material,
                          })
                        }
                      />
                    </Tooltip>
                  )}
                  {canDelete && (
                    <Tooltip title="Xóa">
                      <Button
                        type="text"
                        size="small"
                        danger
                        aria-label={`Xóa vật tư ${row.material.materialName}`}
                        icon={<DeleteOutlined />}
                        onClick={() => confirmDelete(row.material)}
                      />
                    </Tooltip>
                  )}
                </div>
              );
            },
          }),
        ]
      : []),
  ];

  const title = `Vật tư sử dụng (${PHASE_LABELS[filter.phase].toLowerCase()}) – ${grid.workshopName} · Tuần ${String(
    grid.week.isoWeek,
  ).padStart(
    2,
    "0",
  )} tháng ${String(grid.week.labelMonth).padStart(2, "0")}/${grid.week.labelYear}`;

  return (
    <div ref={containerRef} className="min-h-72 flex-1 overflow-hidden">
      <ConfigProvider theme={SHEET_TABLE_THEME}>
        <Table<MaterialRow>
          rowKey="key"
          size="small"
          bordered
          loading={materialsQuery.isFetching || gridQuery.isFetching}
          columns={columns}
          dataSource={rows}
          pagination={false}
          components={COLLAPSIBLE_TABLE_COMPONENTS}
          tableLayout="fixed"
          scroll={{ x: sumColumnWidths(leafColumns), y: scrollY }}
          title={() => (
            <div className="text-center text-sm font-bold uppercase">
              {title}
            </div>
          )}
          className={SHEET_TABLE_CLASS}
          onRow={(row) => ({
            ...collapsibleRowProps(row.collapsed),
            onDoubleClick: () => {
              if (row.kind !== "material") return;
              if (materialActions(row.form).canModify) {
                setModalState({ form: row.form, material: row.material });
              }
            },
          })}
          locale={{ emptyText: "Không có tổ/kíp phù hợp bộ lọc." }}
        />
      </ConfigProvider>

      {modalState && (
        <MaterialFormModal
          open
          form={modalState.form}
          phase={filter.phase}
          week={grid.week}
          material={modalState.material}
          onClose={() => setModalState(undefined)}
        />
      )}
    </div>
  );
};
