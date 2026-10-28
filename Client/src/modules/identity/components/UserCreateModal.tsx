import { Col, Form, Input, Modal, Row, Select, Spin } from 'antd';
import { useMemo, useState } from 'react';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { applyServerErrors } from '@/shared/utils/formErrors';
import { notify } from '@/shared/utils/notify';
import { EmployeeSummary } from '@/modules/identity/components/EmployeeSummary';
import { PASSWORD_RULES, getConfirmPasswordRules } from '@/modules/identity/constants/userOptions';
import { useAvailableEmployees, useCreateUser } from '@/modules/identity/hooks/useUserQueries';
import type { Role } from '@/modules/identity/types/roles';
import type { AvailableEmployee } from '@/modules/identity/types/users';

const EMPLOYEE_SEARCH_DEBOUNCE_MS = 400;

interface UserCreateFormValues {
  employeeId: number;
  password: string;
  confirmPassword: string;
  roleIds: number[];
}

interface UserCreateModalProps {
  open: boolean;
  roles: Role[];
  onClose: () => void;
}

/**
 * Tạo tài khoản cho nhân viên có sẵn (giống hệ thống cũ): chỉ chọn nhân viên đang làm việc chưa có tài khoản,
 * tên đăng nhập = mã nhân viên. Thông tin cá nhân sửa ở trang Nhân viên.
 */
export const UserCreateModal = ({ open, roles, onClose }: UserCreateModalProps) => {
  const [form] = Form.useForm<UserCreateFormValues>();
  const [keyword, setKeyword] = useState('');
  const [picked, setPicked] = useState<AvailableEmployee | null>(null);
  const debouncedKeyword = useDebouncedValue(keyword.trim(), EMPLOYEE_SEARCH_DEBOUNCE_MS);
  const employeesQuery = useAvailableEmployees(debouncedKeyword, open);
  const createMutation = useCreateUser();

  const employees = useMemo(() => employeesQuery.data ?? [], [employeesQuery.data]);
  // Giữ người đã chọn trong danh sách lựa chọn khi đổi từ khóa
  const employeeOptions = useMemo(() => {
    const list = picked && !employees.some((item) => item.id === picked.id) ? [picked, ...employees] : employees;
    return list.map((employee) => ({
      value: employee.id,
      label: `${employee.empCode} - ${employee.fullName}`,
      description: [employee.jobTitle, employee.orgUnitName].filter(Boolean).join(' · '),
    }));
  }, [employees, picked]);
  const roleOptions = roles
    .filter((role) => role.isActive)
    .map((role) => ({ value: role.id, label: role.name, description: role.code }));

  const handleClose = () => {
    setKeyword('');
    setPicked(null);
    onClose();
  };

  const handleEmployeeChange = (employeeId?: number) =>
    setPicked(employees.find((item) => item.id === employeeId) ?? (picked?.id === employeeId ? picked : null));

  const handleSubmit = async () => {
    let values: UserCreateFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    try {
      await createMutation.mutateAsync({
        employeeId: values.employeeId,
        password: values.password,
        roleIds: values.roleIds ?? [],
      });
      notify.success('Tạo tài khoản thành công.');
      handleClose();
    } catch (error) {
      if (!applyServerErrors(form, error)) notify.apiError(error);
    }
  };

  return (
    <Modal
      open={open}
      title="Tạo tài khoản"
      okText="Tạo tài khoản"
      cancelText="Hủy"
      onOk={handleSubmit}
      onCancel={handleClose}
      confirmLoading={createMutation.isPending}
      mask={{ closable: false }}
      width={{ xs: '94%', md: 640 }}
      centered
      destroyOnHidden
    >
      <Form<UserCreateFormValues>
        form={form}
        layout="vertical"
        className="pt-1"
        preserve={false}
        initialValues={{ roleIds: [] }}
      >
        <Form.Item name="employeeId" label="Nhân viên" rules={[{ required: true, message: 'Chọn nhân viên' }]}>
          <Select<number>
            showSearch={{ filterOption: false, onSearch: setKeyword }}
            placeholder="Gõ mã NV hoặc họ tên…"
            notFoundContent={
              employeesQuery.isFetching ? <Spin size="small" /> : 'Không có nhân viên nào chưa có tài khoản'
            }
            options={employeeOptions}
            optionRender={(option) => (
              <div className="leading-tight">
                <div>{option.data.label}</div>
                {option.data.description && <div className="text-sm text-text-secondary">{option.data.description}</div>}
              </div>
            )}
            onChange={handleEmployeeChange}
            autoFocus
          />
        </Form.Item>

        {picked && (
          <div className="mb-4">
            <EmployeeSummary
              fullName={picked.fullName}
              empCode={picked.empCode}
              avatarUrl={picked.avatarUrl}
              jobTitle={picked.jobTitle}
              orgUnitName={picked.orgUnitName}
              email={picked.email}
              phone={picked.phone}
            />
          </div>
        )}

        <Row gutter={12}>
          <Col span={24}>
            <Form.Item label="Tên đăng nhập" extra="Tên đăng nhập là mã nhân viên, không đổi được.">
              <Input value={picked?.empCode} placeholder="Chọn nhân viên" disabled className="font-mono" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="password" label="Mật khẩu" rules={PASSWORD_RULES} hasFeedback>
              <Input.Password autoComplete="new-password" placeholder="Tối thiểu 8 ký tự, có chữ và số" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="confirmPassword"
              label="Nhập lại mật khẩu"
              dependencies={['password']}
              rules={getConfirmPasswordRules('password')}
              hasFeedback
            >
              <Input.Password autoComplete="new-password" />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item
              name="roleIds"
              label="Vai trò"
              rules={[{ required: true, message: 'Chọn vai trò' }]}
              extra="Có thể chọn nhiều vai trò; quyền được cộng dồn."
            >
              <Select
                mode="multiple"
                allowClear
                showSearch={{ optionFilterProp: 'label' }}
                options={roleOptions}
                placeholder="Chọn vai trò"
              />
            </Form.Item>
          </Col>
        </Row>

        <div className="text-sm text-text-secondary">
          Họ tên, email, số điện thoại, chức danh và đơn vị lấy từ hồ sơ nhân viên, sửa ở trang Nhân viên.
        </div>
      </Form>
    </Modal>
  );
};
