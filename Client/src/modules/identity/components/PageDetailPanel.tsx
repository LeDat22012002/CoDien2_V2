import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  EditOutlined,
  ExportOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { Alert, Button, Descriptions, Empty, Table, Tag, Tooltip, Typography, type TableColumnsType } from 'antd';
import { StatusTag } from '@/shared/components/StatusTag';
import { getMenuIcon } from '@/shared/constants/menuIcons';
import { APP_ROUTE_PATHS } from '@/shared/constants/routes';
import { COLUMN_WIDTH } from '@/shared/constants/tableColumns';
import { EMPTY_TEXT } from '@/shared/utils/format';
import type { Page } from '@/modules/identity/types/pages';
import type { Permission } from '@/modules/identity/types/roles';
import { getPageLinkType } from '@/modules/identity/utils/pageTree';

const LINK_TYPE_LABELS = {
  path: 'Trang trong hệ thống',
  external: 'Liên kết ngoài',
  group: 'Nhóm menu',
} as const;

interface PageDetailPanelProps {
  page: Page;
  parent?: Page;
  /** Các trang cùng cấp (gồm cả trang này), đã sắp xếp. */
  siblings: Page[];
  permissionsById: Map<number, Permission>;
  isReordering: boolean;
  onEdit: () => void;
  onAddChild: () => void;
  onDelete: () => void;
  /** Đổi chỗ trang này với trang liền trên / dưới. */
  onMove: (delta: -1 | 1) => void;
  onSelect: (pageId: number) => void;
}

const renderStatus = (page: Pick<Page, 'isActive' | 'isMenu'>) =>
  !page.isActive ? (
    <StatusTag status="stopped" label="Ngừng" />
  ) : page.isMenu ? (
    <StatusTag status="running" label="Hiện trên menu" />
  ) : (
    <StatusTag status="warning" label="Ẩn khỏi menu" />
  );

/** Chi tiết trang đang chọn (phải): thông tin, đổi thứ tự, danh sách trang con. */
export const PageDetailPanel = ({
  page,
  parent,
  siblings,
  permissionsById,
  isReordering,
  onEdit,
  onAddChild,
  onDelete,
  onMove,
  onSelect,
}: PageDetailPanelProps) => {
  const linkType = getPageLinkType(page);
  const icon = page.icon ? getMenuIcon(page.icon) : null;
  const index = siblings.findIndex((item) => item.id === page.id);
  const permission = page.permissionId ? permissionsById.get(page.permissionId) : undefined;
  const isUnknownRoute = Boolean(page.path) && !(APP_ROUTE_PATHS as readonly string[]).includes(page.path ?? '');

  const childColumns: TableColumnsType<Page> = [
    {
      title: 'Tiêu đề',
      key: 'title',
      width: COLUMN_WIDTH.name,
      render: (_, child) => {
        return (
          <span className="inline-flex items-center gap-1.5">
            {child.icon && getMenuIcon(child.icon)}
            <Typography.Text ellipsis={{ tooltip: child.title }}>{child.title}</Typography.Text>
          </span>
        );
      },
    },
    {
      title: 'Đường dẫn',
      key: 'path',
      width: COLUMN_WIDTH.text,
      render: (_, child) => (
        <Typography.Text ellipsis={{ tooltip: child.path ?? child.externalUrl }} className="font-mono text-sm">
          {child.path ?? child.externalUrl ?? EMPTY_TEXT}
        </Typography.Text>
      ),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: COLUMN_WIDTH.status,
      align: 'center',
      render: (_, child) => renderStatus(child),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="m-0 flex items-center gap-2 text-lg font-semibold">
            {icon}
            <span className="truncate">{page.title}</span>
          </h2>
          <div className="text-sm text-text-secondary">
            {parent ? `Thuộc nhóm "${parent.title}"` : 'Cấp gốc của menu'} · vị trí {index + 1}/{siblings.length}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Tooltip title="Lên trên">
            <Button
              aria-label="Chuyển lên trên"
              icon={<ArrowUpOutlined />}
              disabled={index <= 0 || isReordering}
              onClick={() => onMove(-1)}
            />
          </Tooltip>
          <Tooltip title="Xuống dưới">
            <Button
              aria-label="Chuyển xuống dưới"
              icon={<ArrowDownOutlined />}
              disabled={index < 0 || index >= siblings.length - 1 || isReordering}
              onClick={() => onMove(1)}
            />
          </Tooltip>
          <Button icon={<EditOutlined />} onClick={onEdit}>
            Sửa
          </Button>
          {linkType === 'group' && (
            <Button icon={<PlusOutlined />} onClick={onAddChild}>
              Thêm trang con
            </Button>
          )}
          <Tooltip title={page.children.length > 0 ? 'Xóa hoặc chuyển các trang con trước' : undefined}>
            <Button danger icon={<DeleteOutlined />} disabled={page.children.length > 0} onClick={onDelete}>
              Xóa
            </Button>
          </Tooltip>
        </div>
      </div>

      {isUnknownRoute && (
        <Alert
          type="warning"
          showIcon
          title="Đường dẫn chưa có màn hình tương ứng ở Client"
          description="Bấm vào mục menu này sẽ ra trang 404. Kiểm tra lại đường dẫn hoặc chờ chức năng được phát triển."
        />
      )}

      <Descriptions
        bordered
        size="small"
        column={{ xs: 1, md: 2 }}
        items={[
          { key: 'title', label: 'Tiêu đề', children: page.title },
          { key: 'code', label: 'Mã', children: <span className="font-mono">{page.code}</span> },
          {
            key: 'type',
            label: 'Loại',
            children: (
              <Tag color={linkType === 'group' ? 'default' : linkType === 'external' ? 'purple' : 'blue'}>
                {LINK_TYPE_LABELS[linkType]}
              </Tag>
            ),
          },
          {
            key: 'link',
            label: linkType === 'external' ? 'Liên kết' : 'Đường dẫn',
            children: page.externalUrl ? (
              <a href={page.externalUrl} target="_blank" rel="noreferrer" className="break-all">
                {page.externalUrl} <ExportOutlined aria-hidden />
              </a>
            ) : (
              <span className="font-mono">{page.path ?? EMPTY_TEXT}</span>
            ),
          },
          {
            key: 'icon',
            label: 'Icon',
            children: page.icon ? (
              <span className="inline-flex items-center gap-1.5">
                {icon}
                <span className="font-mono text-sm">{page.icon}</span>
              </span>
            ) : (
              EMPTY_TEXT
            ),
          },
          ...(page.area === 'ADMIN'
            ? [
                {
                  key: 'permission',
                  label: 'Quyền cần có',
                  children: permission ? (
                    <span>
                      {permission.name} <span className="font-mono text-sm text-text-secondary">({permission.code})</span>
                    </span>
                  ) : linkType === 'group' ? (
                    <span className="text-text-secondary">Hiện khi có ít nhất 1 trang con được phép xem</span>
                  ) : (
                    <span className="text-text-secondary">Ai đăng nhập cũng thấy</span>
                  ),
                },
              ]
            : []),
          { key: 'status', label: 'Trạng thái', children: renderStatus(page) },
        ]}
      />

      {linkType === 'group' && (
        <div>
          <div className="mb-2 font-semibold">Trang con ({page.children.length})</div>
          <Table<Page>
            rowKey="id"
            size="small"
            bordered
            columns={childColumns}
            dataSource={page.children}
            pagination={false}
            tableLayout="fixed"
            scroll={{ x: COLUMN_WIDTH.name + COLUMN_WIDTH.text + COLUMN_WIDTH.status }}
            className="[&_.ant-table-cell]:whitespace-nowrap [&_.ant-table-row]:cursor-pointer"
            onRow={(child) => ({ onClick: () => onSelect(child.id) })}
            locale={{
              emptyText: (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có trang con. Bấm “Thêm trang con”." />
              ),
            }}
          />
        </div>
      )}
    </div>
  );
};
