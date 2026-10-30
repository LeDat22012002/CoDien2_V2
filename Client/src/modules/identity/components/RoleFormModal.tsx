import { Alert, Form, Input, Modal, Spin, Switch } from 'antd';
import { getErrorMessage } from '@/shared/api/axiosClient';
import { applyServerErrors } from '@/shared/utils/formErrors';
import { notify } from '@/shared/utils/notify';
import { ROLE_CODE_PATTERN } from '@/modules/identity/constants/roleOptions';
import { useCreateRole, useRoleDetail, useUpdateRole } from '@/modules/identity/hooks/useRoleQueries';
import type { RoleDetail } from '@/modules/identity/types/roles';

interface RoleFormValues {
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
}

interface RoleFormModalProps {
  open: boolean;
  /** Có = sửa vai trò này; không = thêm mới. */
  roleId?: number;
  onClose: () => void;
  /** Thêm mới xong: gợi ý chuyển sang trang phân quyền. */
  onCreated: (role: RoleDetail) => void;
}

/**
 * Thêm / sửa thông tin vai trò (mã, tên, mô tả, trạng thái). Quyền của vai trò gán ở trang Phân quyền;
 * khi sửa vẫn gửi kèm danh sách quyền hiện có để không bị mất.
 */
export const RoleFormModal = ({ open, roleId, onClose, onCreated }: RoleFormModalProps) => {
  const [form] = Form.useForm<RoleFormValues>();
  const isCreate = roleId === undefined;
  const detailQuery = useRoleDetail(open ? roleId : undefined);
  const detail = detailQuery.data?.id === roleId ? detailQuery.data : undefined;
  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole();
  const isLoadingDetail = !isCreate && !detail && !detailQuery.isError;

  const handleSubmit = async () => {
    let values: RoleFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    try {
      if (isCreate) {
        const created = await createMutation.mutateAsync({
          code: values.code,
          name: values.name,
          description: values.description,
          isActive: values.isActive,
          permissionIds: [],
        });
        notify.success('Đã thêm vai trò.');
        onCreated(created);
      } else {
        if (!detail) return;
        await updateMutation.mutateAsync({
          id: detail.id,
          request: {
            name: values.name,
            description: values.description,
            isActive: values.isActive,
            permissionIds: detail.permissionIds,
          },
        });
        notify.success('Cập nhật vai trò thành công.');
      }
      onClose();
    } catch (error) {
      if (!applyServerErrors(form, error)) notify.apiError(error);
    }
  };

  return (
    <Modal
      open={open}
      title={isCreate ? 'Thêm vai trò' : 'Sửa vai trò'}
      okText={isCreate ? 'Thêm vai trò' : 'Lưu thay đổi'}
      cancelText="Hủy"
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={createMutation.isPending || updateMutation.isPending}
      okButtonProps={{ disabled: isLoadingDetail || (!isCreate && !detail) }}
      mask={{ closable: false }}
      width={{ xs: '94%', sm: 480 }}
      centered
      destroyOnHidden
    >
      {!isCreate && detailQuery.isError && (
        <Alert type="error" showIcon title={getErrorMessage(detailQuery.error)} className="mb-3" />
      )}
      {isLoadingDetail ? (
        <div className="flex justify-center py-10">
          <Spin description="Đang tải…" />
        </div>
      ) : (
        <Form<RoleFormValues>
          form={form}
          layout="vertical"
          preserve={false}
          className="pt-1"
          initialValues={
            detail
              ? {
                  code: detail.code,
                  name: detail.name,
                  description: detail.description ?? undefined,
                  isActive: detail.isActive,
                }
              : { isActive: true }
          }
        >
          <Form.Item
            name="code"
            label="Mã vai trò"
            normalize={(value?: string) => value?.toUpperCase().replace(/\s+/g, '_')}
            rules={[
              { required: true, message: 'Nhập mã vai trò' },
              { pattern: ROLE_CODE_PATTERN, message: '2–50 ký tự: chữ in hoa không dấu, số, "_", bắt đầu bằng chữ' },
            ]}
            extra={isCreate ? 'Không đổi được sau khi tạo. VD: VAN_THU, KY_THUAT' : 'Không đổi được mã vai trò'}
          >
            <Input placeholder="VD: VAN_THU" className="font-mono" disabled={!isCreate} autoFocus={isCreate} />
          </Form.Item>
          <Form.Item
            name="name"
            label="Tên vai trò"
            rules={[
              { required: true, whitespace: true, message: 'Nhập tên vai trò' },
              { max: 100, message: 'Tối đa 100 ký tự' },
            ]}
          >
            <Input placeholder="VD: Văn thư" autoFocus={!isCreate} />
          </Form.Item>
          <Form.Item name="description" label="Mô tả" rules={[{ max: 500, message: 'Tối đa 500 ký tự' }]}>
            <Input.TextArea rows={2} maxLength={500} placeholder="Vai trò dành cho ai, dùng làm gì…" />
          </Form.Item>
          <Form.Item
            name="isActive"
            label="Hoạt động"
            valuePropName="checked"
            extra="Tắt = tài khoản giữ vai trò này tạm mất các quyền của vai trò."
          >
            <Switch aria-label="Vai trò hoạt động" />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
};
