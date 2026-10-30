import { EditOutlined, SaveOutlined, UndoOutlined } from '@ant-design/icons';
import { Alert, Button, Tag } from 'antd';
import { useState } from 'react';
import { Link } from 'react-router';
import { notify } from '@/shared/utils/notify';
import { PermissionTable } from '@/modules/identity/components/PermissionTable';
import { useUpdateRole } from '@/modules/identity/hooks/useRoleQueries';
import type { PermissionGroup, RoleDetail } from '@/modules/identity/types/roles';

interface RolePermissionPanelProps {
  /** Đổi vai trò thì component được dựng lại (key = id) để bỏ thay đổi chưa lưu. */
  role: RoleDetail;
  permissionGroups: PermissionGroup[];
  canManage: boolean;
  onSaved: (role: RoleDetail) => void;
  /** Báo trang cha có thay đổi chưa lưu (để hỏi trước khi chuyển vai trò). */
  onDirtyChange: (isDirty: boolean) => void;
}

const isSameSet = (a: ReadonlySet<number>, b: ReadonlySet<number>) =>
  a.size === b.size && [...a].every((id) => b.has(id));

/** Gán quyền cho 1 vai trò: bảng quyền chiếm hết khung, Lưu / Hoàn tác chỉ bật khi có thay đổi. */
export const RolePermissionPanel = ({
  role,
  permissionGroups,
  canManage,
  onSaved,
  onDirtyChange,
}: RolePermissionPanelProps) => {
  const [savedIds, setSavedIds] = useState(() => new Set(role.permissionIds));
  const [selectedIds, setSelectedIds] = useState(() => new Set(role.permissionIds));
  const updateMutation = useUpdateRole();

  const isReadOnly = !canManage || role.isSystem;
  const isDirty = !isSameSet(selectedIds, savedIds);
  const addedCount = [...selectedIds].filter((id) => !savedIds.has(id)).length;
  const removedCount = [...savedIds].filter((id) => !selectedIds.has(id)).length;

  const changeSelection = (next: Set<number>) => {
    setSelectedIds(next);
    onDirtyChange(!isSameSet(next, savedIds));
  };

  const handleSave = async () => {
    try {
      const saved = await updateMutation.mutateAsync({
        id: role.id,
        request: {
          name: role.name,
          description: role.description ?? undefined,
          isActive: role.isActive,
          permissionIds: [...selectedIds],
        },
      });
      setSavedIds(new Set(saved.permissionIds));
      setSelectedIds(new Set(saved.permissionIds));
      onDirtyChange(false);
      notify.success(`Đã lưu phân quyền cho "${role.name}".`);
      onSaved(saved);
    } catch (error) {
      notify.apiError(error);
    }
  };

  const allIds = role.isSystem
    ? new Set(permissionGroups.flatMap((group) => group.permissions.map((permission) => permission.id)))
    : selectedIds;

  return (
    <div className="flex flex-col gap-3 lg:h-full lg:min-h-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="m-0 text-lg font-semibold">{role.name}</h2>
            <span className="font-mono text-sm text-text-secondary">{role.code}</span>
            {role.isSystem && <Tag color="red">Hệ thống</Tag>}
            {!role.isActive && <Tag>Ngừng hoạt động</Tag>}
          </div>
          <div className="text-sm text-text-secondary">
            {role.userCount} tài khoản đang giữ vai trò này
            {role.description ? ` · ${role.description}` : ''}
          </div>
        </div>

        {!isReadOnly && (
          <div className="flex flex-wrap items-center gap-2">
            {isDirty && (
              <span className="text-sm text-warning">
                Chưa lưu: +{addedCount} / −{removedCount} quyền
              </span>
            )}
            <Button
              icon={<UndoOutlined />}
              disabled={!isDirty || updateMutation.isPending}
              onClick={() => changeSelection(new Set(savedIds))}
            >
              Hoàn tác
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              disabled={!isDirty}
              loading={updateMutation.isPending}
              onClick={handleSave}
            >
              Lưu phân quyền
            </Button>
          </div>
        )}
      </div>

      {role.isSystem && (
        <Alert
          type="info"
          showIcon
          title="Vai trò hệ thống có toàn quyền, không cần và không thể phân quyền."
        />
      )}
      {!canManage && !role.isSystem && (
        <Alert type="info" showIcon title="Bạn chỉ có quyền xem. Cần quyền quản lý vai trò để phân quyền." />
      )}
      {!role.isActive && !role.isSystem && (
        <Alert
          type="warning"
          showIcon
          title="Vai trò đang ngừng hoạt động: các quyền dưới đây tạm chưa có hiệu lực."
          action={
            <Link to="/admin/roles">
              <Button size="small" icon={<EditOutlined />}>
                Đến trang Vai trò
              </Button>
            </Link>
          }
        />
      )}

      <div className="flex h-[70dvh] flex-col lg:h-auto lg:min-h-0 lg:flex-1">
        <PermissionTable
          groups={permissionGroups}
          selectedIds={allIds}
          isReadOnly={isReadOnly}
          onChange={changeSelection}
        />
      </div>
    </div>
  );
};
