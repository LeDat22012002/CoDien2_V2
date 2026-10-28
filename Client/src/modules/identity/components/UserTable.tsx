import {
  DeleteOutlined,
  EditOutlined,
  KeyOutlined,
  MoreOutlined,
  UnlockOutlined,
} from '@ant-design/icons';
import {
  Button,
  Dropdown,
  Empty,
  Grid,
  Pagination,
  Table,
  Tag,
  Tooltip,
  Typography,
  type MenuProps,
  type TableColumnsType,
} from 'antd';
import { StatusTag } from '@/shared/components/StatusTag';
import { COLUMN_WIDTH, getTableScrollX } from '@/shared/constants/tableColumns';
import { useTableScrollY } from '@/shared/hooks/useTableScrollY';
import { EMPTY_TEXT, formatDate, formatDateTime } from '@/shared/utils/format';
import { UserAvatar } from '@/modules/identity/components/UserAvatar';
import { USER_PAGE_SIZE_OPTIONS } from '@/modules/identity/constants/userOptions';
import type { User } from '@/modules/identity/types/users';

/** Thao tác trên từng dòng. */
export type UserRowAction = 'edit' | 'reset-password' | 'unlock' | 'delete';

export interface UserRowPermissions {
  canUpdate: boolean;
  canResetPassword: boolean;
  canDelete: boolean;
}

interface UserTableProps {
  users: User[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  isLoading: boolean;
  /** Id tài khoản đang đăng nhập: không tự xóa được. */
  currentUserId?: number;
  permissions: UserRowPermissions;
  onPageChange: (pageIndex: number, pageSize: number) => void;
  onAction: (action: UserRowAction, user: User) => void;
}

/** Ô 1 dòng: chữ dài cắt "…", hover hiện đầy đủ. */
const renderTruncated = (value: string | null | undefined, className = '') =>
  value ? (
    <Typography.Text ellipsis={{ tooltip: { title: value, placement: 'topLeft' } }} className={`block ${className}`}>
      {value}
    </Typography.Text>
  ) : (
    EMPTY_TEXT
  );

/** Ưu tiên: ngừng hoạt động → đang khóa tạm → nhân viên đã nghỉ → hoạt động. */
const renderStatus = (user: User) => {
  if (!user.isActive) return <StatusTag status="stopped" label="Ngừng hoạt động" />;
  if (user.isLocked) return <StatusTag status="error" label="Đang khóa tạm" />;
  if (user.employeeStatus !== 'ACTIVE') return <StatusTag status="warning" label="NV đã nghỉ" />;
  return <StatusTag status="running" label="Hoạt động" />;
};

const buildMoreItems = (
  user: User,
  permissions: UserRowPermissions,
  currentUserId?: number,
): NonNullable<MenuProps['items']> => {
  const items: NonNullable<MenuProps['items']> = [];

  if (permissions.canResetPassword) {
    items.push({ key: 'reset-password', icon: <KeyOutlined />, label: 'Đặt lại mật khẩu' });
  }
  if (permissions.canUpdate && user.isLocked) {
    items.push({ key: 'unlock', icon: <UnlockOutlined />, label: 'Mở khóa đăng nhập' });
  }
  if (permissions.canDelete) {
    if (items.length > 0) items.push({ type: 'divider' });
    items.push({
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Xóa tài khoản',
      danger: true,
      disabled: user.id === currentUserId,
    });
  }
  return items;
};

/**
 * Danh sách tài khoản, phân trang phía Server. Khung cha phải cao cố định: thân bảng cuộn bên trong,
 * tiêu đề cột và phân trang luôn nhìn thấy.
 */
export const UserTable = ({
  users,
  totalCount,
  pageIndex,
  pageSize,
  isLoading,
  currentUserId,
  permissions,
  onPageChange,
  onAction,
}: UserTableProps) => {
  const { containerRef, scrollY } = useTableScrollY();
  const screens = Grid.useBreakpoint();
  const hasActions = permissions.canUpdate || permissions.canResetPassword || permissions.canDelete;

  const columns: TableColumnsType<User> = [
    {
      title: 'STT',
      key: 'index',
      width: COLUMN_WIDTH.index,
      align: 'center',
      render: (_, __, index) => (pageIndex - 1) * pageSize + index + 1,
    },
    {
      title: 'Họ và tên',
      dataIndex: 'fullName',
      key: 'fullName',
      width: COLUMN_WIDTH.longText,
      // Luôn 2 dòng (họ tên + email, thiếu email hiện "—") để mọi dòng cao bằng nhau
      render: (fullName: string, user) => (
        <div className="flex items-center gap-2">
          <UserAvatar fullName={fullName} avatarUrl={user.avatarUrl} />
          <div className="min-w-0 flex-1 leading-tight">
            {renderTruncated(fullName, 'font-medium')}
            {renderTruncated(user.email, 'text-sm text-text-secondary')}
          </div>
        </div>
      ),
    },
    {
      title: 'Tên đăng nhập',
      dataIndex: 'empCode',
      key: 'empCode',
      width: COLUMN_WIDTH.code,
      render: (empCode: string) => renderTruncated(empCode, 'font-mono'),
    },
    {
      title: 'Chức danh',
      key: 'jobTitle',
      width: COLUMN_WIDTH.text,
      responsive: ['lg'],
      render: (_, user) =>
        user.jobTitle ? (
          <div className="flex items-center gap-1">
            {user.isActing && (
              <Tag color="gold" className="me-0">
                Quyền
              </Tag>
            )}
            <div className="min-w-0 flex-1">{renderTruncated(user.jobTitle)}</div>
          </div>
        ) : (
          EMPTY_TEXT
        ),
    },
    {
      title: 'Đơn vị',
      dataIndex: 'orgUnitName',
      key: 'orgUnitName',
      width: COLUMN_WIDTH.text,
      responsive: ['md'],
      render: (orgUnitName?: string | null) => renderTruncated(orgUnitName),
    },
    {
      title: 'Vai trò',
      key: 'roles',
      width: COLUMN_WIDTH.select,
      render: (_, user) => {
        if (user.roles.length === 0) return <span className="italic text-text-secondary">Chưa gán</span>;
        const names = user.roles.map((role) => role.name).join(', ');
        return (
          <Tooltip title={user.roles.length > 1 ? names : undefined} placement="topLeft">
            <div className="flex items-center gap-1 overflow-hidden">
              <Tag color={user.roles.some((role) => role.code === 'SUPER_ADMIN') ? 'red' : 'blue'} className="me-0 truncate">
                {user.roles[0].name}
              </Tag>
              {user.roles.length > 1 && <Tag className="me-0">+{user.roles.length - 1}</Tag>}
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: 'Đăng nhập gần nhất',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      width: COLUMN_WIDTH.dateTime,
      responsive: ['xl'],
      render: (value?: string | null) => formatDateTime(value),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: COLUMN_WIDTH.date,
      responsive: ['xl'],
      render: (value: string) => formatDate(value),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: COLUMN_WIDTH.status,
      align: 'center',
      render: (_, user) => renderStatus(user),
    },
    ...(hasActions
      ? [
          {
            title: 'Thao tác',
            key: 'actions',
            width: COLUMN_WIDTH.actions,
            align: 'center' as const,
            fixed: 'right' as const,
            render: (_: unknown, user: User) => {
              const moreItems = buildMoreItems(user, permissions, currentUserId);
              return (
                <div className="flex items-center justify-center gap-1">
                  {permissions.canUpdate && (
                    <Tooltip title="Sửa tài khoản">
                      <Button
                        type="text"
                        aria-label={`Sửa tài khoản ${user.fullName}`}
                        icon={<EditOutlined className="text-primary" />}
                        onClick={() => onAction('edit', user)}
                      />
                    </Tooltip>
                  )}
                  {moreItems.length > 0 && (
                    <Dropdown
                      trigger={['click']}
                      placement="bottomRight"
                      menu={{ items: moreItems, onClick: ({ key }) => onAction(key as UserRowAction, user) }}
                    >
                      <Button type="text" aria-label={`Thao tác khác với ${user.fullName}`} icon={<MoreOutlined />} />
                    </Dropdown>
                  )}
                </div>
              );
            },
          },
        ]
      : []),
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div ref={containerRef} className="min-h-72 flex-1 overflow-hidden">
        <Table<User>
          rowKey="id"
          size="middle"
          bordered
          loading={isLoading}
          columns={columns}
          dataSource={users}
          pagination={false}
          tableLayout="fixed"
          scroll={{ x: getTableScrollX(columns, screens), y: scrollY }}
          className="[&_.ant-table-cell]:whitespace-nowrap"
          locale={{
            emptyText: (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không tìm thấy tài khoản nào phù hợp" />
            ),
          }}
        />
      </div>

      <Pagination
        align="end"
        current={pageIndex}
        pageSize={pageSize}
        total={totalCount}
        showSizeChanger
        pageSizeOptions={USER_PAGE_SIZE_OPTIONS}
        showTotal={(total, [from, to]) => `${from}–${to} / ${total} tài khoản`}
        onChange={onPageChange}
      />
    </div>
  );
};
