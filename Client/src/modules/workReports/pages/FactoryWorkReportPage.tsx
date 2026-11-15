import { WorkReportWorkspace } from '@/modules/workReports/components/WorkReportWorkspace';
import { WorkReportPublicContext } from '@/modules/workReports/hooks/workReportViewContext';

/**
 * Trang công khai /work-reports (Ban Giám đốc, ai cũng xem được, không cần đăng nhập): kế hoạch, báo cáo, tổng hợp,
 * vật tư của mọi xưởng; chỉ xem (API /work-reports/public/*). Route toàn màn hình nên tự thêm lề.
 */
const FactoryWorkReportPage = () => (
  <WorkReportPublicContext value>
    <div className="w-full flex-1 bg-bg-layout px-3 py-4 md:px-6 md:py-6">
      <WorkReportWorkspace mode="factory" />
    </div>
  </WorkReportPublicContext>
);

export default FactoryWorkReportPage;
