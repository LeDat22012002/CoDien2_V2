import { WorkReportWorkspace } from '@/modules/workReports/components/WorkReportWorkspace';

/**
 * Trang quản trị /admin/work-reports (quyền work-reports.manage): đội trưởng/phó, quản đốc/phó xem và sửa báo cáo
 * đội/xưởng mình, xác nhận tổ/kíp, phân công kỹ sư phụ trách.
 */
const WorkReportManagementPage = () => <WorkReportWorkspace mode="manage" />;

export default WorkReportManagementPage;
