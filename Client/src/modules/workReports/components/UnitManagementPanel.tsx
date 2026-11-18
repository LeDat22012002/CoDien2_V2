import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  RollbackOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Collapse,
  Empty,
  Popconfirm,
  Table,
  Tag,
  Tooltip,
  Typography,
  type TableColumnsType,
} from "antd";
import { useState } from "react";
import { ErrorState } from "@/shared/components/ErrorState";
import { COLUMN_WIDTH } from "@/shared/constants/tableColumns";
import { useTableScrollY } from "@/shared/hooks/useTableScrollY";
import { EMPTY_TEXT, formatDate } from "@/shared/utils/format";
import { notify } from "@/shared/utils/notify";
import { UnitEngineersModal } from "@/modules/workReports/components/UnitEngineersModal";
import { UnitFormModal } from "@/modules/workReports/components/UnitFormModal";
import {
  useDeletedWorkReportUnits,
  useDeleteWorkReportUnit,
  useReorderWorkReportUnits,
  useRestoreWorkReportUnit,
  useWorkReportUnits,
} from "@/modules/workReports/hooks/useWorkReportQueries";
import type { WorkReportUnit } from "@/modules/workReports/types/workReports";

interface UnitManagementPanelProps {
  workshopId: number;
  /** Quản đốc/phó của xưởng hoặc admin: thêm / sửa / xóa / khôi phục / sắp xếp đơn vị. */
  isManager: boolean;
  /** Tuần đang chọn: tuần đã khóa → danh sách tổ/kíp + kỹ sư đúng như tuần đó, chỉ xem. */
  weekId?: number;
}

type DialogState =
  | { type: "create" }
  | { type: "edit"; unit: WorkReportUnit }
  | { type: "engineers"; unit: WorkReportUnit };

/** Dòng phụ dưới tên: tổ / kíp theo sơ đồ hoặc đơn vị tự đặt, kèm đội. */
const describeUnit = (unit: WorkReportUnit) => {
  if (unit.isCustom) {
    const base = `Tự đặt · ${unit.teamName ?? unit.workshopName ?? ""}`;
    return unit.memberOrgUnits.length > 0
      ? `${base} · tổ gợi ý: ${unit.memberOrgUnits.map((group) => group.name).join(", ")}`
      : base;
  }
  // Tổ theo kíp (dưới nhóm Kỹ sư theo ca) có ký hiệu kíp A/B/C trên sơ đồ
  const kind = unit.shift
    ? `Tổ kíp ${unit.shift}`
    : unit.orgUnitTypeCode === "SHIFT"
      ? "Kíp"
      : "Tổ";
  return unit.teamName ? `${kind} · ${unit.teamName}` : kind;
};

const text = (value?: string | null) =>
  value ? (
    <Typography.Text ellipsis={{ tooltip: value }} className="block">
      {value}
    </Typography.Text>
  ) : (
    <span className="text-text-secondary">{EMPTY_TEXT}</span>
  );

/**
 * Đơn vị báo cáo của xưởng (có form tuần) và kỹ sư phụ trách. Mặc định = tổ/kíp trên sơ đồ (Server tự tạo).
 * Quản đốc/phó: thêm đơn vị tự đặt, sửa tên / tiền tố / loại giờ công / ngừng dùng, xóa (chưa có dữ liệu),
 * khôi phục, sắp thứ tự I, II…, phân công kỹ sư. Đội trưởng/phó: phân công kỹ sư cho tổ trong đội.
 * Cao hết nội dung tab: thân bảng tự cuộn (useTableScrollY), mục "Đã xóa" luôn ở đáy.
 * Theo tuần đang chọn: tuần đã khóa → Server trả bản chụp của tuần (tổ/kíp + kỹ sư phụ trách trong tuần), chỉ xem;
 * thêm / sửa / xóa / phân công chỉ áp từ tuần còn mở trở đi.
 */
export const UnitManagementPanel = ({
  workshopId,
  isManager,
  weekId,
}: UnitManagementPanelProps) => {
  const { containerRef, scrollY } = useTableScrollY();
  const [dialog, setDialog] = useState<DialogState>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const unitsQuery = useWorkReportUnits(workshopId, true, weekId);
  // Tuần đã khóa: chỉ xem (không thêm / sắp xếp / xóa / khôi phục; nút sửa, phân công tự ẩn vì Server trả quyền false)
  const isSnapshot = (unitsQuery.data ?? []).some(
    (unit) => unit.isWeekSnapshot,
  );
  const canEditStructure = isManager && !isSnapshot;
  const deletedQuery = useDeletedWorkReportUnits(workshopId, canEditStructure);
  const reorderMutation = useReorderWorkReportUnits();
  const deleteMutation = useDeleteWorkReportUnit();
  const restoreMutation = useRestoreWorkReportUnit();
  const units = unitsQuery.data ?? [];
  const deletedUnits = deletedQuery.data ?? [];

  const handleDelete = async (unit: WorkReportUnit) => {
    try {
      await deleteMutation.mutateAsync(unit.id);
      notify.success(
        `Đã xóa "${unit.displayName}". Khôi phục được ở mục "Đã xóa".`,
      );
    } catch (error) {
      notify.apiError(error);
    }
  };

  const handleRestore = async (unit: WorkReportUnit) => {
    try {
      const restored = await restoreMutation.mutateAsync(unit.id);
      notify.success(
        `Đã khôi phục "${restored.displayName}" (tiền tố ${restored.codePrefix}).`,
      );
    } catch (error) {
      notify.apiError(error);
    }
  };

  const openDialog = (next: DialogState) => {
    setDialog(next);
    setIsDialogOpen(true);
  };

  const move = async (index: number, offset: -1 | 1) => {
    const orderedIds = units.map((unit) => unit.id);
    const target = index + offset;
    [orderedIds[index], orderedIds[target]] = [
      orderedIds[target],
      orderedIds[index],
    ];
    try {
      await reorderMutation.mutateAsync({ workshopId, orderedIds });
    } catch (error) {
      notify.apiError(error);
    }
  };

  if (unitsQuery.isError && !unitsQuery.data) {
    return (
      <ErrorState
        error={unitsQuery.error}
        onRetry={() => unitsQuery.refetch()}
      />
    );
  }

  const columns: TableColumnsType<WorkReportUnit> = [
    {
      title: "Thứ tự",
      key: "order",
      width: 110,
      align: "center",
      render: (_, unit, index) => (
        <div className="flex items-center justify-center gap-1">
          <span className="w-6 text-right">{index + 1}</span>
          {canEditStructure && (
            <>
              <Button
                type="text"
                size="small"
                aria-label={`Đưa ${unit.displayName} lên`}
                icon={<ArrowUpOutlined />}
                disabled={index === 0 || reorderMutation.isPending}
                onClick={() => move(index, -1)}
              />
              <Button
                type="text"
                size="small"
                aria-label={`Đưa ${unit.displayName} xuống`}
                icon={<ArrowDownOutlined />}
                disabled={
                  index === units.length - 1 || reorderMutation.isPending
                }
                onClick={() => move(index, 1)}
              />
            </>
          )}
        </div>
      ),
    },
    {
      title: "Đơn vị báo cáo",
      key: "name",
      width: COLUMN_WIDTH.longText,
      render: (_, unit) => (
        <div className="min-w-0">
          {text(unit.displayName)}
          {/* <Typography.Text type="secondary" className="block truncate text-sm">
            {describeUnit(unit)}
          </Typography.Text> */}
        </div>
      ),
    },
    {
      title: "Tiền tố",
      dataIndex: "codePrefix",
      key: "codePrefix",
      width: COLUMN_WIDTH.code,
      render: (value: string) => <span className="font-mono">{value}</span>,
    },
    {
      title: "Giờ công",
      dataIndex: "laborType",
      key: "laborType",
      width: COLUMN_WIDTH.short,
    },
    {
      title: "Kỹ sư phụ trách",
      key: "engineers",
      width: COLUMN_WIDTH.longText,
      render: (_, unit) =>
        unit.engineers.length > 0 ? (
          text(
            unit.engineers
              // Tuần đã khóa: người đã thôi phụ trách ghi kèm ngày kết thúc
              .map((engineer) =>
                engineer.endDate
                  ? `${engineer.fullName} (đến ${formatDate(engineer.endDate)})`
                  : engineer.fullName,
              )
              .join(", "),
          )
        ) : (
          <Tag color="warning">Chưa phân công</Tag>
        ),
    },
    {
      title: "Trạng thái",
      key: "status",
      width: COLUMN_WIDTH.tag,
      render: (_, unit) =>
        unit.isActive ? (
          <Tag color="success">Đang dùng</Tag>
        ) : (
          <Tag>Ngừng dùng</Tag>
        ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: COLUMN_WIDTH.actions,
      align: "center",
      fixed: "right",
      render: (_, unit) => (
        <div className="flex justify-center gap-1">
          {unit.canManageEngineers && (
            <Tooltip title="Phân công kỹ sư">
              <Button
                type="text"
                aria-label={`Phân công kỹ sư cho ${unit.displayName}`}
                icon={<TeamOutlined className="text-primary" />}
                onClick={() => openDialog({ type: "engineers", unit })}
              />
            </Tooltip>
          )}
          {unit.canConfigure && (
            <Tooltip title="Sửa đơn vị">
              <Button
                type="text"
                aria-label={`Sửa ${unit.displayName}`}
                icon={<EditOutlined className="text-primary" />}
                onClick={() => openDialog({ type: "edit", unit })}
              />
            </Tooltip>
          )}
          {unit.canConfigure && (
            <Popconfirm
              title={`Xóa "${unit.displayName}"?`}
              description={
                <span className="block max-w-72">
                  Chỉ xóa được đơn vị chưa có kế hoạch/báo cáo (đã có thì dùng
                  “Ngừng dùng”). Tổ/kíp trên sơ đồ sẽ không tự thêm lại; khôi
                  phục ở mục “Đã xóa”.
                </span>
              }
              okText="Xóa"
              okButtonProps={{ danger: true }}
              cancelText="Hủy"
              onConfirm={() => handleDelete(unit)}
            >
              <Tooltip title="Xóa đơn vị">
                <Button
                  type="text"
                  danger
                  aria-label={`Xóa ${unit.displayName}`}
                  icon={<DeleteOutlined />}
                  loading={
                    deleteMutation.isPending &&
                    deleteMutation.variables === unit.id
                  }
                />
              </Tooltip>
            </Popconfirm>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {isSnapshot && (
        <Alert type="info" showIcon className="shrink-0" title="Tuần đã khóa" />
      )}
      {canEditStructure && (
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {/* <Typography.Text type="secondary">
            Tổ/kíp trên sơ đồ tổ chức tự có trong danh sách. Xóa đơn vị không
            báo cáo, thêm đơn vị không có trên sơ đồ.
          </Typography.Text> */}
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openDialog({ type: "create" })}
          >
            Thêm đơn vị
          </Button>
        </div>
      )}

      <div ref={containerRef} className="min-h-72 flex-1 overflow-hidden">
        <Table<WorkReportUnit>
          rowKey="id"
          size="middle"
          bordered
          loading={unitsQuery.isFetching}
          columns={columns}
          dataSource={units}
          pagination={false}
          tableLayout="fixed"
          scroll={{ x: "max-content", y: scrollY }}
          className="[&_.ant-table-cell]:whitespace-nowrap"
          rowClassName={(unit) => (unit.isActive ? "" : "opacity-60")}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  canEditStructure
                    ? "Xưởng chưa có tổ/kíp trên sơ đồ tổ chức. Bấm “Thêm đơn vị” để tạo đơn vị báo cáo."
                    : "Xưởng chưa có đơn vị báo cáo."
                }
              />
            ),
          }}
        />
      </div>

      {canEditStructure && deletedUnits.length > 0 && (
        <Collapse
          size="small"
          className="shrink-0"
          items={[
            {
              key: "deleted",
              label: `Đã xóa (${deletedUnits.length})`,
              children: (
                // Danh sách dài thì cuộn trong mục, không đẩy bảng mất chỗ
                <ul className="m-0 max-h-48 list-none divide-y divide-border overflow-auto p-0">
                  {deletedUnits.map((unit) => (
                    <li
                      key={unit.id}
                      className="flex items-center justify-between gap-3 py-2"
                    >
                      <div className="min-w-0">
                        {text(unit.displayName)}
                        <Typography.Text
                          type="secondary"
                          className="block truncate text-sm"
                        >
                          {describeUnit(unit)} ·{" "}
                          <span className="font-mono">{unit.codePrefix}</span>
                          {unit.isOrgUnitActive ? "" : " · đã ngừng trên sơ đồ"}
                        </Typography.Text>
                      </div>
                      <Button
                        size="small"
                        icon={<RollbackOutlined />}
                        loading={
                          restoreMutation.isPending &&
                          restoreMutation.variables === unit.id
                        }
                        disabled={!unit.isOrgUnitActive}
                        onClick={() => handleRestore(unit)}
                      >
                        Khôi phục
                      </Button>
                    </li>
                  ))}
                </ul>
              ),
            },
          ]}
        />
      )}

      <UnitFormModal
        open={
          isDialogOpen && (dialog?.type === "create" || dialog?.type === "edit")
        }
        unit={dialog?.type === "edit" ? dialog.unit : undefined}
        workshopId={workshopId}
        onClose={() => setIsDialogOpen(false)}
      />
      <UnitEngineersModal
        open={isDialogOpen && dialog?.type === "engineers"}
        unit={dialog?.type === "engineers" ? dialog.unit : undefined}
        onClose={() => setIsDialogOpen(false)}
      />
    </div>
  );
};
