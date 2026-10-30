import { DeleteOutlined, EditOutlined, SafetyOutlined } from '@ant-design/icons';
import { Button, Empty, Grid, Table, Tag, Tooltip, Typography, type TableColumnsType } from 'antd';
import { StatusTag } from '@/shared/components/StatusTag';
import { COLUMN_WIDTH, getTableScrollX } from '@/shared/constants/tableColumns';
import { useTableScrollY } from '@/shared/hooks/useTableScrollY';
import { EMPTY_TEXT, formatNumber } from '@/shared/utils/format';
import type { Role } from '@/modules/identity/types/roles';

export type RoleRowAction = 'edit' | 'permissions' | 'delete';

interface RoleTableProps {
  roles: Role[];
  isLoading: boolean;
  canManage: boolean;
  onAction: (action: RoleRowAction, role: Role) => void;
}

const renderTruncated = (value: string | null | undefined, className = '') =>
  value ? (
    <Typography.Text ellipsis={{ tooltip: { title: value, placement: 'topLeft' } }} className={`block ${className}`}>
      {value}
    </Typography.Text>
  ) : (
    EMPTY_TEXT
  );

/** Lý do không xóa được (null = xóa được). */
const getRoleDeleteBlockedReason = (role: Role) =>
  role.isSystem
    ? 'Không xóa được vai trò hệ thống'
    : role.userCount > 0
      ? `Đang gán cho ${role.userCount} tài khoản, gỡ vai trò khỏi các tài khoản trước`
      : null;

/** Danh sách vai trò (ít dòng, không phân trang). Khung cha phải cao cố định: thân bảng cuộn bên trong. */
export const RoleTable = ({ roles, isLoading, canManage, onAction }: RoleTableProps) => {
  const { containerRef, scrollY } = useTableScrollY();
  const screens = Grid.useBreakpoint();

  const columns: TableColumnsType<Role> = [
    {
      title: 'STT',
      key: 'index',
      width: COLUMN_WIDTH.index,
      align: 'center',
      render: (_, __, index) => index + 1,
    },
    {
      title: 'Tên vai trò',
      dataIndex: 'name',
      key: 'name',
      width: COLUMN_WIDTH.name,
      render: (name: string, role) => (
        <div className="flex items-center gap-1">
          <div className="min-w-0 flex-1">{renderTruncated(name, 'font-medium')}</div>
          {role.isSystem && (
            <Tag color="red" className="me-0">
              Hệ thống
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Mã',
      dataIndex: 'code',
      key: 'code',
      width: COLUMN_WIDTH.select,
      render: (code: string) => renderTruncated(code, 'font-mono'),
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      width: COLUMN_WIDTH.longText,
      responsive: ['lg'],
      render: (description?: string | null) => renderTruncated(description),
    },
    {
      title: 'Số tài khoản',
      dataIndex: 'userCount',
      key: 'userCount',
      width: COLUMN_WIDTH.number,
      align: 'right',
      render: (value: number) => formatNumber(value),
    },
    {
      title: 'Số quyền',
      dataIndex: 'permissionCount',
      key: 'permissionCount',
      width: COLUMN_WIDTH.number,
      align: 'right',
      responsive: ['md'],
      render: (value: number, role) => (role.isSystem ? 'Toàn quyền' : formatNumber(value)),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      width: COLUMN_WIDTH.status,
      align: 'center',
      render: (isActive: boolean) =>
        isActive ? <StatusTag status="running" label="Hoạt động" /> : <StatusTag status="stopped" label="Ngừng" />,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: COLUMN_WIDTH.actions,
      align: 'center',
      fixed: 'right',
      render: (_, role) => {
        const deleteBlockedReason = getRoleDeleteBlockedReason(role);
        return (
          <div className="flex items-center justify-center gap-1">
            <Tooltip title="Phân quyền">
              <Button
                type="text"
                aria-label={`Phân quyền cho ${role.name}`}
                icon={<SafetyOutlined className="text-success" />}
                onClick={() => onAction('permissions', role)}
              />
            </Tooltip>
            {canManage && (
              <>
                <Tooltip title={role.isSystem ? 'Không sửa được vai trò hệ thống' : 'Sửa'}>
                  <Button
                    type="text"
                    aria-label={`Sửa vai trò ${role.name}`}
                    disabled={role.isSystem}
                    icon={<EditOutlined className={role.isSystem ? undefined : 'text-primary'} />}
                    onClick={() => onAction('edit', role)}
                  />
                </Tooltip>
                <Tooltip title={deleteBlockedReason ?? 'Xóa'}>
                  <Button
                    type="text"
                    danger
                    aria-label={`Xóa vai trò ${role.name}`}
                    disabled={Boolean(deleteBlockedReason)}
                    icon={<DeleteOutlined />}
                    onClick={() => onAction('delete', role)}
                  />
                </Tooltip>
              </>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div ref={containerRef} className="min-h-72 flex-1 overflow-hidden">
      <Table<Role>
        rowKey="id"
        size="middle"
        bordered
        loading={isLoading}
        columns={columns}
        dataSource={roles}
        pagination={false}
        tableLayout="fixed"
        scroll={{ x: getTableScrollX(columns, screens), y: scrollY }}
        className="[&_.ant-table-cell]:whitespace-nowrap"
        locale={{
          emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có vai trò nào phù hợp" />,
        }}
      />
    </div>
  );
};
