import {
  DisconnectOutlined,
  EditOutlined,
  HistoryOutlined,
  MoreOutlined,
  SwapOutlined,
  UserDeleteOutlined,
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
import { EMPTY_TEXT } from '@/shared/utils/format';
import { LEVEL_TAG_COLOR } from '@/shared/constants/organization';
import { getPrimaryAssignment } from '@/shared/utils/assignmentRules';
import { EMPLOYEE_PAGE_SIZE_OPTIONS } from '@/modules/employees/constants/employeeOptions';
import type { Employee } from '@/modules/employees/types/employees';

/** Thao tác trên từng dòng. */
export type EmployeeRowAction = 'edit' | 'change' | 'history' | 'end' | 'deactivate';

export interface EmployeeRowPermissions {
  canUpdate: boolean;
  canManageAssignments: boolean;
  canViewHistory: boolean;
}

interface EmployeeTableProps {
  employees: Employee[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  isLoading: boolean;
  permissions: EmployeeRowPermissions;
  onPageChange: (pageIndex: number, pageSize: number) => void;
  onAction: (action: EmployeeRowAction, employee: Employee) => void;
}

/**
 * Mọi ô chỉ 1 dòng để các dòng cao bằng nhau: chữ dài cắt "…" theo độ rộng cố định của cột,
 * hover hiện đầy đủ (tooltip chỉ hiện khi bị cắt).
 */
const renderTruncated = (value: string | null | undefined, className = '') =>
  value ? (
    <Typography.Text ellipsis={{ tooltip: { title: value, placement: 'topLeft' } }} className={`block ${className}`}>
      {value}
    </Typography.Text>
  ) : (
    EMPTY_TEXT
  );

const buildMoreItems = (employee: Employee, permissions: EmployeeRowPermissions): MenuProps['items'] => {
  const isActive = employee.status === 'ACTIVE';
  const hasPosition = Boolean(getPrimaryAssignment(employee.currentAssignments));
  const items: NonNullable<MenuProps['items']> = [];

  if (permissions.canViewHistory) {
    items.push({ key: 'history', icon: <HistoryOutlined />, label: 'Lịch sử công tác' });
  }
  if (permissions.canManageAssignments) {
    items.push({
      key: 'end',
      icon: <DisconnectOutlined />,
      label: 'Thôi giữ vị trí',
      disabled: !isActive || !hasPosition,
    });
  }
  if (permissions.canUpdate) {
    if (items.length > 0) items.push({ type: 'divider' });
    items.push({
      key: 'deactivate',
      icon: <UserDeleteOutlined />,
      label: 'Cho nghỉ việc',
      danger: true,
      disabled: !isActive,
    });
  }
  return items;
};

/**
 * Danh sách nhân viên, phân trang phía Server. Bảng chiếm hết chiều cao khung cha (khung cha phải cao cố định,
 * vd flex-1 trong trang cao bằng màn hình): thân bảng cuộn bên trong, tiêu đề cột và phân trang luôn nhìn thấy.
 */
export const EmployeeTable = ({
  employees,
  totalCount,
  pageIndex,
  pageSize,
  isLoading,
  permissions,
  onPageChange,
  onAction,
}: EmployeeTableProps) => {
  const { containerRef, scrollY } = useTableScrollY();
  const screens = Grid.useBreakpoint();
  const hasActions = permissions.canUpdate || permissions.canManageAssignments || permissions.canViewHistory;

  const columns: TableColumnsType<Employee> = [
    {
      title: 'STT',
      key: 'index',
      width: COLUMN_WIDTH.index,
      align: 'center',
      render: (_, __, index) => (pageIndex - 1) * pageSize + index + 1,
    },
    {
      title: 'Mã NV',
      dataIndex: 'empCode',
      key: 'empCode',
      width: COLUMN_WIDTH.code,
      render: (empCode: string) => renderTruncated(empCode, 'font-medium'),
    },
    {
      title: 'Họ và tên',
      dataIndex: 'fullName',
      key: 'fullName',
      width: COLUMN_WIDTH.name,
      // Luôn 2 dòng (họ tên + email, thiếu email hiện "—") để mọi dòng cao bằng nhau
      render: (fullName: string, employee) => (
        <div className="leading-tight">
          {renderTruncated(fullName, 'font-medium')}
          <div className="text-sm text-text-secondary">
            {renderTruncated(employee.email, 'text-sm text-text-secondary')}
          </div>
        </div>
      ),
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'phone',
      key: 'phone',
      width: COLUMN_WIDTH.phone,
      responsive: ['md'],
      render: (phone?: string | null) => renderTruncated(phone),
    },
    {
      title: 'Đơn vị',
      key: 'orgUnit',
      width: COLUMN_WIDTH.text,
      render: (_, employee) => {
        const position = getPrimaryAssignment(employee.currentAssignments);
        return position ? (
          renderTruncated(position.orgUnitName)
        ) : (
          <span className="italic text-text-secondary">Chưa xếp vị trí</span>
        );
      },
    },
    {
      title: 'Cấp bậc',
      key: 'level',
      width: COLUMN_WIDTH.tag,
      render: (_, employee) => {
        const position = getPrimaryAssignment(employee.currentAssignments);
        return position ? <Tag color={LEVEL_TAG_COLOR[position.levelCode]}>{position.levelName}</Tag> : EMPTY_TEXT;
      },
    },
    {
      title: 'Chức danh',
      key: 'jobTitle',
      width: COLUMN_WIDTH.longText,
      responsive: ['lg'],
      render: (_, employee) => renderTruncated(getPrimaryAssignment(employee.currentAssignments)?.jobTitle),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: COLUMN_WIDTH.status,
      align: 'center',
      render: (status: Employee['status']) =>
        status === 'ACTIVE' ? (
          <StatusTag status="running" label="Đang làm việc" />
        ) : (
          <StatusTag status="stopped" label="Đã nghỉ" />
        ),
    },
    ...(hasActions
      ? [
          {
            title: 'Thao tác',
            key: 'actions',
            width: COLUMN_WIDTH.actions,
            align: 'center' as const,
            fixed: 'right' as const,
            render: (_: unknown, employee: Employee) => {
              const isActive = employee.status === 'ACTIVE';
              const moreItems = buildMoreItems(employee, permissions);
              return (
                <div className="flex items-center justify-center gap-1">
                  {permissions.canUpdate && (
                    <Tooltip title="Sửa thông tin">
                      <Button
                        type="text"
                        aria-label={`Sửa thông tin ${employee.fullName}`}
                        icon={<EditOutlined className="text-primary" />}
                        onClick={() => onAction('edit', employee)}
                      />
                    </Tooltip>
                  )}
                  {permissions.canManageAssignments && (
                    <Tooltip title={isActive ? 'Điều chuyển / bổ nhiệm' : 'Nhân viên đã nghỉ'}>
                      <Button
                        type="text"
                        aria-label={`Điều chuyển / bổ nhiệm ${employee.fullName}`}
                        disabled={!isActive}
                        icon={<SwapOutlined className={isActive ? 'text-success' : undefined} />}
                        onClick={() => onAction('change', employee)}
                      />
                    </Tooltip>
                  )}
                  {moreItems && moreItems.length > 0 && (
                    <Dropdown
                      trigger={['click']}
                      placement="bottomRight"
                      menu={{
                        items: moreItems,
                        onClick: ({ key }) => onAction(key as EmployeeRowAction, employee),
                      }}
                    >
                      <Button type="text" aria-label={`Thao tác khác với ${employee.fullName}`} icon={<MoreOutlined />} />
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
      {/* Khung cao cố định: thân bảng cuộn bên trong; min-h giữ bảng đủ dùng trên màn hình thấp */}
      <div ref={containerRef} className="min-h-72 flex-1 overflow-hidden">
        <Table<Employee>
          rowKey="id"
          size="middle"
          bordered
          loading={isLoading}
          columns={columns}
          dataSource={employees}
          pagination={false}
          tableLayout="fixed"
          scroll={{ x: getTableScrollX(columns, screens), y: scrollY }}
          // Mọi ô 1 dòng → các dòng cao bằng nhau
          className="[&_.ant-table-cell]:whitespace-nowrap"
          locale={{
            emptyText: (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không tìm thấy nhân viên nào phù hợp" />
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
        pageSizeOptions={EMPLOYEE_PAGE_SIZE_OPTIONS}
        showTotal={(total, [from, to]) => `${from}–${to} / ${total} nhân viên`}
        onChange={onPageChange}
      />
    </div>
  );
};
