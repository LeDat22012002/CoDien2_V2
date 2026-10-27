import { Alert, Input, Modal } from 'antd';
import { useState } from 'react';
import { getErrorMessage } from '@/shared/api/axiosClient';
import dayjs from '@/shared/utils/dayjs';
import { DATE_FORMAT, toIsoDate } from '@/shared/utils/format';
import { notify } from '@/shared/utils/notify';
import { PositionCard } from '@/shared/components/PositionCard';
import { useEndAssignment } from '@/shared/hooks/useOrgStructure';
import { getPrimaryAssignment } from '@/shared/utils/assignmentRules';
import type { Employee } from '@/modules/employees/types/employees';

interface EndAssignmentModalProps {
  /** null = đóng. */
  employee: Employee | null;
  onClose: () => void;
}

/**
 * Thôi giữ vị trí hiện tại (không chuyển đi đâu), có hiệu lực hôm nay.
 * Nhân viên vẫn đang làm việc nhưng thành "Chưa xếp vị trí" và biến mất khỏi sơ đồ.
 */
export const EndAssignmentModal = ({ employee, onClose }: EndAssignmentModalProps) => {
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const endMutation = useEndAssignment();
  const current = getPrimaryAssignment(employee?.currentAssignments);

  const handleClose = () => {
    setNote('');
    setError('');
    onClose();
  };

  const handleOk = async () => {
    if (!current) return;
    setError('');
    try {
      await endMutation.mutateAsync({
        assignmentId: current.assignmentId,
        request: { endDate: toIsoDate(dayjs()) ?? '', note: note.trim() || undefined },
      });
      notify.success('Đã thôi giữ vị trí.');
      handleClose();
    } catch (endError) {
      setError(getErrorMessage(endError));
    }
  };

  return (
    <Modal
      open={Boolean(employee)}
      title="Thôi giữ vị trí"
      okText="Xác nhận"
      okButtonProps={{ danger: true, disabled: !current }}
      cancelText="Hủy"
      onOk={handleOk}
      onCancel={handleClose}
      confirmLoading={endMutation.isPending}
      width={{ xs: '94%', sm: 480 }}
      centered
      destroyOnHidden
    >
      {error && <Alert type="error" showIcon title={error} className="mb-3" />}
      {!current ? (
        <div className="text-sm italic text-text-secondary">
          {employee?.fullName} hiện không giữ vị trí nào trên sơ đồ tổ chức.
        </div>
      ) : (
        <>
          <p className="mb-2 text-sm text-text-secondary">
            <b className="text-text">{employee?.fullName}</b> ({employee?.empCode}) sẽ thôi giữ vị trí dưới đây từ hôm
            nay ({dayjs().format(DATE_FORMAT)}). Nhân viên vẫn đang làm việc, sẽ hiện là <i>Chưa xếp vị trí</i>.
          </p>
          <div className="mb-3 flex">
            <PositionCard
              levelCode={current.levelCode}
              levelName={current.levelName}
              unitName={current.orgUnitName}
              jobTitle={current.jobTitle}
              isActing={current.isActing}
              startDate={current.startDate}
            />
          </div>
          <label htmlFor="end-assignment-note" className="mb-1 block text-sm font-medium">
            Ghi chú
          </label>
          <Input.TextArea
            id="end-assignment-note"
            rows={2}
            maxLength={500}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Lý do…"
          />
        </>
      )}
    </Modal>
  );
};
