import { Alert, Col, Form, Modal, Row, Select, Switch } from 'antd';
import { applyServerErrors } from '@/shared/utils/formErrors';
import { notify } from '@/shared/utils/notify';
import { useAuthStore } from '@/stores/authStore';
import { EmployeeSummary } from '@/modules/identity/components/EmployeeSummary';
import { useUpdateUser } from '@/modules/identity/hooks/useUserQueries';
import type { Role } from '@/modules/identity/types/roles';
import type { User } from '@/modules/identity/types/users';

interface UserEditFormValues {
  roleIds: number[];
  isActive: boolean;
}

interface UserEditModalProps {
  /** null = đóng. */
  user: User | null;
  roles: Role[];
  onClose: () => void;
}

/**
 * Sửa tài khoản: vai trò và trạng thái. Thông tin cá nhân, ảnh đại diện sửa ở trang Nhân viên.
 * Không tự sửa được tài khoản của mình (Server chặn tự đổi vai trò / trạng thái).
 */
export const UserEditModal = ({ user, roles, onClose }: UserEditModalProps) => {
  const [form] = Form.useForm<UserEditFormValues>();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const updateMutation = useUpdateUser();

  const isSelf = user?.id === currentUserId;
  // Vai trò đã ngừng nhưng tài khoản đang có vẫn phải hiện để không mất khi lưu
  const roleOptions = roles
    .filter((role) => role.isActive || user?.roles.some((item) => item.id === role.id))
    .map((role) => ({ value: role.id, label: role.isActive ? role.name : `${role.name} (ngừng)` }));

  const handleSubmit = async () => {
    if (!user) return;
    let values: UserEditFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: user.id,
        request: { isActive: values.isActive, roleIds: values.roleIds ?? [] },
      });
      notify.success('Cập nhật tài khoản thành công.');
      onClose();
    } catch (error) {
      if (!applyServerErrors(form, error)) notify.apiError(error);
    }
  };

  return (
    <Modal
      open={Boolean(user)}
      title="Cập nhật tài khoản"
      okText="Lưu thay đổi"
      cancelText="Hủy"
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={updateMutation.isPending}
      okButtonProps={{ disabled: isSelf }}
      mask={{ closable: false }}
      width={{ xs: '94%', md: 600 }}
      centered
      destroyOnHidden
    >
      {user && (
        <>
          <div className="mb-4">
            <EmployeeSummary
              fullName={user.fullName}
              empCode={user.empCode}
              avatarUrl={user.avatarUrl}
              jobTitle={user.jobTitle}
              orgUnitName={user.orgUnitName}
              isActing={user.isActing}
              email={user.email}
              phone={user.phone}
              avatarSize={72}
            />
          </div>

          {isSelf && (
            <Alert
              type="info"
              showIcon
              title="Không thể tự đổi vai trò hoặc trạng thái tài khoản của chính mình."
              className="mb-3"
            />
          )}

          <Form<UserEditFormValues>
            form={form}
            layout="vertical"
            preserve={false}
            initialValues={{ roleIds: user.roles.map((role) => role.id), isActive: user.isActive }}
            disabled={isSelf}
          >
            <Row gutter={12}>
              <Col xs={24} md={16}>
                <Form.Item name="roleIds" label="Vai trò">
                  <Select
                    mode="multiple"
                    allowClear
                    showSearch={{ optionFilterProp: 'label' }}
                    options={roleOptions}
                    placeholder="Chưa gán vai trò"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  name="isActive"
                  label="Hoạt động"
                  valuePropName="checked"
                  extra="Tắt = khóa tài khoản, đăng xuất mọi phiên."
                >
                  <Switch aria-label="Tài khoản hoạt động" />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </>
      )}
    </Modal>
  );
};
