import { DeleteOutlined, SaveOutlined, UndoOutlined } from '@ant-design/icons';
import { Alert, Button, Col, Form, Input, Row, Switch, Tag, Tooltip } from 'antd';
import { useState } from 'react';
import { applyServerErrors } from '@/shared/utils/formErrors';
import { notify } from '@/shared/utils/notify';
import { PermissionTable } from '@/modules/identity/components/PermissionTable';
import { useUpdateRole } from '@/modules/identity/hooks/useRoleQueries';
import type { PermissionGroup, RoleDetail } from '@/modules/identity/types/roles';

interface RoleFormValues {
  name: string;
  description?: string;
  isActive: boolean;
}

interface RoleDetailPanelProps {
  /** Đổi vai trò thì component được dựng lại (key = id) để bỏ thay đổi chưa lưu. */
  role: RoleDetail;
  permissionGroups: PermissionGroup[];
  canManage: boolean;
  isDeleting: boolean;
  onSaved: (role: RoleDetail) => void;
  onDelete: () => void;
}

const toFormValues = (role: RoleDetail): RoleFormValues => ({
  name: role.name,
  description: role.description ?? undefined,
  isActive: role.isActive,
});

const isSameSet = (a: ReadonlySet<number>, b: ReadonlySet<number>) =>
  a.size === b.size && [...a].every((id) => b.has(id));

/** Chi tiết vai trò bên phải: thông tin chung + phân quyền; Lưu / Hoàn tác chỉ bật khi có thay đổi. */
export const RoleDetailPanel = ({
  role,
  permissionGroups,
  canManage,
  isDeleting,
  onSaved,
  onDelete,
}: RoleDetailPanelProps) => {
  const [form] = Form.useForm<RoleFormValues>();
  const [savedPermissionIds, setSavedPermissionIds] = useState(() => new Set(role.permissionIds));
  const [selectedIds, setSelectedIds] = useState(() => new Set(role.permissionIds));
  const [savedValues, setSavedValues] = useState(() => toFormValues(role));
  const watched = Form.useWatch([], form) as RoleFormValues | undefined;
  const updateMutation = useUpdateRole();

  const isReadOnly = !canManage || role.isSystem;
  const isDirty =
    !isSameSet(selectedIds, savedPermissionIds) ||
    (watched !== undefined &&
      ((watched.name ?? '') !== savedValues.name ||
        (watched.description || undefined) !== savedValues.description ||
        watched.isActive !== savedValues.isActive));

  const handleReset = () => {
    form.setFieldsValue(savedValues);
    setSelectedIds(new Set(savedPermissionIds));
  };

  const handleSave = async () => {
    let values: RoleFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    try {
      const saved = await updateMutation.mutateAsync({
        id: role.id,
        request: {
          name: values.name,
          description: values.description,
          isActive: values.isActive,
          permissionIds: [...selectedIds],
        },
      });
      setSavedValues(toFormValues(saved));
      setSavedPermissionIds(new Set(saved.permissionIds));
      setSelectedIds(new Set(saved.permissionIds));
      form.setFieldsValue(toFormValues(saved));
      notify.success('Đã lưu vai trò và phân quyền.');
      onSaved(saved);
    } catch (error) {
      if (!applyServerErrors(form, error)) notify.apiError(error);
    }
  };

  const deleteBlockedReason = role.isSystem
    ? 'Không xóa được vai trò hệ thống'
    : role.userCount > 0
      ? `Đang gán cho ${role.userCount} tài khoản, gỡ vai trò khỏi các tài khoản trước`
      : undefined;

  return (
    // Desktop: chiếm hết chiều cao khung, bảng quyền giãn theo phần còn lại và cuộn bên trong
    <div className="flex flex-col gap-3 lg:h-full lg:min-h-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="m-0 text-lg font-semibold">{role.name}</h2>
            {role.isSystem && <Tag color="red">Hệ thống</Tag>}
            {!role.isActive && <Tag>Ngừng hoạt động</Tag>}
          </div>
          <div className="text-sm text-text-secondary">
            Mã <span className="font-mono text-text">{role.code}</span> · {role.userCount} tài khoản ·{' '}
            {selectedIds.size} quyền
          </div>
        </div>

        {canManage && !role.isSystem && (
          <div className="flex flex-wrap gap-2">
            <Tooltip title={deleteBlockedReason}>
              <Button
                danger
                icon={<DeleteOutlined />}
                disabled={Boolean(deleteBlockedReason)}
                loading={isDeleting}
                onClick={onDelete}
              >
                Xóa
              </Button>
            </Tooltip>
            <Button icon={<UndoOutlined />} disabled={!isDirty || updateMutation.isPending} onClick={handleReset}>
              Hoàn tác
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              disabled={!isDirty}
              loading={updateMutation.isPending}
              onClick={handleSave}
            >
              Lưu
            </Button>
          </div>
        )}
      </div>

      {role.isSystem && (
        <Alert
          type="info"
          showIcon
          title="Vai trò hệ thống có toàn quyền, không cần và không thể chỉnh sửa."
          description="Tài khoản giữ vai trò này luôn thấy mọi trang và làm được mọi thao tác."
        />
      )}
      {!canManage && !role.isSystem && (
        <Alert type="info" showIcon title="Bạn chỉ có quyền xem. Cần quyền quản lý vai trò để chỉnh sửa." />
      )}

      <Form<RoleFormValues>
        form={form}
        layout="vertical"
        initialValues={savedValues}
        disabled={isReadOnly}
        className="[&_.ant-form-item]:mb-0"
      >
        <Row gutter={[12, 12]}>
          <Col xs={24} md={10}>
            <Form.Item
              name="name"
              label="Tên vai trò"
              rules={[
                { required: true, whitespace: true, message: 'Nhập tên vai trò' },
                { max: 100, message: 'Tối đa 100 ký tự' },
              ]}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={10}>
            <Form.Item name="description" label="Mô tả" rules={[{ max: 500, message: 'Tối đa 500 ký tự' }]}>
              <Input placeholder="Vai trò dành cho ai, dùng làm gì…" />
            </Form.Item>
          </Col>
          <Col xs={24} md={4}>
            <Form.Item name="isActive" label="Hoạt động" valuePropName="checked">
              <Switch aria-label="Vai trò hoạt động" />
            </Form.Item>
          </Col>
        </Row>
      </Form>

      <div className="flex h-[70dvh] flex-col lg:h-auto lg:min-h-0 lg:flex-1">
        <div className="mb-2 font-semibold">Phân quyền</div>
        <PermissionTable
          groups={permissionGroups}
          selectedIds={
            role.isSystem ? new Set(permissionGroups.flatMap((g) => g.permissions.map((p) => p.id))) : selectedIds
          }
          isReadOnly={isReadOnly}
          canRename={canManage}
          onChange={setSelectedIds}
        />
      </div>
    </div>
  );
};
