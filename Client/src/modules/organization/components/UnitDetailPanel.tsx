import {
  ArrowDownOutlined,
  ArrowLeftOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SwapOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import { Button, Descriptions, Dropdown, Empty, List, Skeleton, Tag, Tooltip, type DescriptionsProps } from 'antd';
import { ErrorState } from '@/shared/components/ErrorState';
import { UNIT_TYPE_META } from '@/shared/constants/organization';
import { useUnitMembers } from '@/shared/hooks/useOrgStructure';
import type {
  AssignableEmployee,
  LookupItem,
  OrgUnit,
  OrgUnitType,
  OrgUnitTypeCode,
  PositionLevel,
} from '@/shared/types/organization';
import { getHeadLevel } from '@/shared/utils/assignmentRules';
import { UNIT_ROLE_META } from '@/modules/organization/constants/organization';
import { getAllowedChildTypes } from '@/modules/organization/utils/orgUnitRules';

interface UnitDetailPanelProps {
  unit: OrgUnit;
  parent?: OrgUnit;
  childUnits: OrgUnit[];
  unitTypes: OrgUnitType[];
  levels: PositionLevel[];
  disciplines: LookupItem[];
  isReordering: boolean;
  /** Thêm / sửa / xóa / sắp xếp đơn vị (org-units.manage). */
  canManage: boolean;
  /** Bổ nhiệm / điều chuyển (assignments.manage). */
  canAssign: boolean;
  onEdit: () => void;
  onAddChild: (typeCode: OrgUnitTypeCode) => void;
  /** memberCount: số người đang giữ vị trí (chặn xóa khi > 0). */
  onDelete: (memberCount: number) => void;
  onSelect: (unitId: number) => void;
  onMove: (index: number, delta: -1 | 1) => void;
  /** null = bổ nhiệm người mới vào đơn vị (chọn nhân viên trong modal). */
  onAssign: (employee: AssignableEmployee | null) => void;
}

/** Chi tiết đơn vị đang chọn: thông tin, nhân sự đang giữ vị trí, danh sách đơn vị con (sắp xếp ↑↓). */
export const UnitDetailPanel = ({
  unit,
  parent,
  childUnits,
  unitTypes,
  levels,
  disciplines,
  isReordering,
  canManage,
  canAssign,
  onEdit,
  onAddChild,
  onDelete,
  onSelect,
  onMove,
  onAssign,
}: UnitDetailPanelProps) => {
  const membersQuery = useUnitMembers(unit.id);
  const members = membersQuery.data ?? [];

  const typeMeta = UNIT_TYPE_META[unit.typeCode];
  const typeName = unitTypes.find((type) => type.code === unit.typeCode)?.name ?? unit.typeCode;
  const headLevelCode = getHeadLevel(unit, unitTypes).code;
  const headLevel = levels.find((level) => level.code === headLevelCode);
  const childTypes = getAllowedChildTypes(unit.typeCode, unitTypes);
  const addItems = childTypes.map((code) => ({
    key: code,
    label: unitTypes.find((type) => type.code === code)?.name ?? code,
  }));
  const hasHead = members.some((member) => member.unitRole === 'HEAD');

  const descriptionItems: DescriptionsProps['items'] = [
    { key: 'type', label: 'Loại', children: typeName },
    {
      key: 'head',
      label: 'Cấp trưởng',
      children: (
        <span className="inline-flex flex-wrap items-center gap-2">
          {headLevel ? `${headLevel.name} · hàng ${headLevel.chartRow}` : '—'}
          {unit.headLevelCode && <Tag>ghi đè</Tag>}
        </span>
      ),
    },
    ...(unit.disciplineCode
      ? [
          {
            key: 'discipline',
            label: 'Chuyên môn',
            children: disciplines.find((item) => item.code === unit.disciplineCode)?.name ?? unit.disciplineCode,
          },
        ]
      : []),
    ...(unit.area ? [{ key: 'area', label: 'Khu vực', children: unit.area }] : []),
    ...(unit.shift ? [{ key: 'shift', label: 'Kíp', children: unit.shift }] : []),
    ...(unit.note ? [{ key: 'note', label: 'Ghi chú', children: unit.note, span: 2 }] : []),
  ];

  const renderMembers = () => {
    if (membersQuery.isPending) return <Skeleton active paragraph={{ rows: 3 }} />;
    if (membersQuery.isError) return <ErrorState error={membersQuery.error} onRetry={() => membersQuery.refetch()} />;
    if (members.length === 0) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có nhân sự trực tiếp" />;

    return (
      <List
        size="small"
        bordered
        dataSource={members}
        renderItem={(member) => (
          <List.Item
            actions={
              canAssign
                ? [
                    <Tooltip key="assign" title="Điều chuyển / bổ nhiệm">
                      <Button
                        type="text"
                        aria-label={`Điều chuyển / bổ nhiệm ${member.fullName}`}
                        icon={<SwapOutlined className="text-success" />}
                        onClick={() =>
                          onAssign({ id: member.employeeId, empCode: member.empCode, fullName: member.fullName })
                        }
                      />
                    </Tooltip>,
                  ]
                : undefined
            }
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <Tag color={UNIT_ROLE_META[member.unitRole]?.color}>{member.levelName}</Tag>
                {member.isActing && <Tag color="gold">Quyền</Tag>}
                <span className="font-medium">{member.fullName}</span>
                <span className="text-sm text-text-secondary">{member.empCode}</span>
              </div>
              {member.jobTitle && <div className="truncate text-sm text-text-secondary">{member.jobTitle}</div>}
            </div>
          </List.Item>
        )}
      />
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Tiêu đề + thao tác */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Tag color={typeMeta?.color}>{typeMeta?.label}</Tag>
            <span className="text-sm text-text-secondary">{unit.code}</span>
          </div>
          <div className="mt-1 text-lg font-semibold">{unit.name}</div>
          {parent && (
            <Button type="link" className="h-auto px-0" icon={<ArrowLeftOutlined />} onClick={() => onSelect(parent.id)}>
              {parent.name}
            </Button>
          )}
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            {addItems.length > 0 && (
              <Dropdown menu={{ items: addItems, onClick: ({ key }) => onAddChild(key as OrgUnitTypeCode) }} trigger={['click']}>
                <Button type="primary" icon={<PlusOutlined />}>
                  Thêm đơn vị con
                </Button>
              </Dropdown>
            )}
            <Button icon={<EditOutlined />} onClick={onEdit}>
              Sửa
            </Button>
            {unit.parentId != null && (
              <Button danger icon={<DeleteOutlined />} onClick={() => onDelete(members.length)}>
                Xóa
              </Button>
            )}
          </div>
        )}
      </div>

      <Descriptions size="small" bordered column={{ xs: 1, md: 2 }} items={descriptionItems} />

      {/* Nhân sự */}
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="font-semibold">
            Nhân sự đang giữ vị trí <span className="font-normal text-text-secondary">({members.length})</span>
            {!membersQuery.isPending && headLevel && !hasHead && (
              <Tag color="warning" className="ml-2">
                Chưa bổ nhiệm {headLevel.name}
              </Tag>
            )}
          </div>
          {canAssign && (
            <Button icon={<UserAddOutlined />} onClick={() => onAssign(null)}>
              Bổ nhiệm vào đơn vị
            </Button>
          )}
        </div>
        {renderMembers()}
      </div>

      {/* Đơn vị con */}
      {childTypes.length > 0 && (
        <div>
          <div className="mb-2 font-semibold">
            Đơn vị con{' '}
            <span className="font-normal text-text-secondary">({childUnits.length}) · thứ tự hiển thị trên sơ đồ</span>
          </div>
          {childUnits.length > 0 ? (
            <List
              size="small"
              bordered
              dataSource={childUnits}
              renderItem={(child, index) => (
                <List.Item
                  actions={
                    canManage
                      ? [
                          <Button
                            key="up"
                            type="text"
                            aria-label={`Đưa ${child.name} lên trên`}
                            icon={<ArrowUpOutlined />}
                            disabled={index === 0 || isReordering}
                            onClick={() => onMove(index, -1)}
                          />,
                          <Button
                            key="down"
                            type="text"
                            aria-label={`Đưa ${child.name} xuống dưới`}
                            icon={<ArrowDownOutlined />}
                            disabled={index === childUnits.length - 1 || isReordering}
                            onClick={() => onMove(index, 1)}
                          />,
                        ]
                      : undefined
                  }
                >
                  <button
                    type="button"
                    className="flex min-h-8 min-w-0 cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-left"
                    onClick={() => onSelect(child.id)}
                  >
                    <span className="w-5 shrink-0 text-right text-sm text-text-secondary">{index + 1}</span>
                    <Tag color={UNIT_TYPE_META[child.typeCode]?.color}>{UNIT_TYPE_META[child.typeCode]?.label}</Tag>
                    <span className="truncate hover:text-primary">{child.name}</span>
                    <span className="shrink-0 text-sm text-text-secondary">{child.code}</span>
                  </button>
                </List.Item>
              )}
            />
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có đơn vị con" />
          )}
        </div>
      )}
    </div>
  );
};
