import { Alert, Modal } from 'antd';
import { useState } from 'react';
import { getErrorMessage } from '@/shared/api/axiosClient';
import dayjs from '@/shared/utils/dayjs';
import { DATE_FORMAT } from '@/shared/utils/format';
import { notify } from '@/shared/utils/notify';
import { useUpdateEmployee } from '@/modules/employees/hooks/useEmployeeQueries';
import type { Employee } from '@/modules/employees/types/employees';
import { buildStatusChangeRequest } from '@/modules/employees/utils/employeeRequest';

interface DeactivateEmployeeModalProps {
  /** null = đóng. */
  employee: Employee | null;
  onClose: () => void;
}

/**
 * Cho nhân viên nghỉ việc từ hôm nay: Status = INACTIVE, Server tự đóng mọi vị trí đang giữ.
 * Lịch sử vẫn được giữ lại; nhân viên biến mất khỏi sơ đồ tổ chức.
 */
export const DeactivateEmployeeModal = ({ employee, onClose }: DeactivateEmployeeModalProps) => {
  const [error, setError] = useState('');
  const updateMutation = useUpdateEmployee();

  const handleClose = () => {
    setError('');
    onClose();
  };

  const handleOk = async () => {
    if (!employee) return;
    setError('');
    try {
      await updateMutation.mutateAsync({ id: employee.id, request: buildStatusChangeRequest(employee, 'INACTIVE') });
      notify.success('Đã cho nghỉ việc.');
      handleClose();
    } catch (updateError) {
      setError(getErrorMessage(updateError));
    }
  };

  return (
    <Modal
      open={Boolean(employee)}
      title="Cho nhân viên nghỉ việc"
      okText="Xác nhận nghỉ việc"
      okButtonProps={{ danger: true }}
      cancelText="Hủy"
      onOk={handleOk}
      onCancel={handleClose}
      confirmLoading={updateMutation.isPending}
      width={{ xs: '94%', sm: 440 }}
      centered
      destroyOnHidden
    >
      {error && <Alert type="error" showIcon title={error} className="mb-3" />}
      <p className="mb-3 text-sm text-text-secondary">
        <b className="text-text">{employee?.fullName}</b> ({employee?.empCode}) sẽ thôi giữ mọi vị trí và không còn
        hiển thị trên sơ đồ tổ chức. Lịch sử công tác vẫn được lưu.
      </p>
      <div className="text-sm text-text-secondary">
        Ngày nghỉ việc: <b className="text-text">{dayjs().format(DATE_FORMAT)}</b> (có hiệu lực ngay khi xác nhận)
      </div>
    </Modal>
  );
};
