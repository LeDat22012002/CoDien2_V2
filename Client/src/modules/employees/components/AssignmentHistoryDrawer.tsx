import { Drawer, Grid } from 'antd';
import { AssignmentHistoryTimeline } from '@/modules/employees/components/AssignmentHistoryTimeline';
import type { Employee } from '@/modules/employees/types/employees';

interface AssignmentHistoryDrawerProps {
  /** null = đóng. */
  employee: Employee | null;
  onClose: () => void;
}

/** Lịch sử công tác của 1 nhân viên (mới nhất trước), dạng dòng thời gian. */
export const AssignmentHistoryDrawer = ({ employee, onClose }: AssignmentHistoryDrawerProps) => {
  const screens = Grid.useBreakpoint();

  return (
    <Drawer
      open={Boolean(employee)}
      onClose={onClose}
      size={screens.sm ? 460 : '100%'}
      title={
        <div className="leading-tight">
          <div className="text-xs font-semibold uppercase tracking-widest text-text-secondary">Lịch sử công tác</div>
          <div className="text-base font-semibold">
            {employee?.fullName}{' '}
            <span className="text-sm font-normal text-text-secondary">· {employee?.empCode}</span>
          </div>
        </div>
      }
    >
      {employee && <AssignmentHistoryTimeline empCode={employee.empCode} />}
    </Drawer>
  );
};
