import { Tabs } from 'antd';
import { useSearchParams } from 'react-router';
import { PageHeader } from '@/shared/components/PageHeader';
import { CategoryPanel } from '@/modules/workReports/components/settings/CategoryPanel';
import { GeneralSettingForm } from '@/modules/workReports/components/settings/GeneralSettingForm';
import { MaterialPurposePanel } from '@/modules/workReports/components/settings/MaterialPurposePanel';
import { WeekDeadlinePanel } from '@/modules/workReports/components/settings/WeekDeadlinePanel';
import { useMyWorkReportScope } from '@/modules/workReports/hooks/useWorkReportQueries';

const TAB_PARAM = 'tab';
const TAB_KEYS = ['general', 'categories', 'purposes', 'deadlines'] as const;
type TabKey = (typeof TAB_KEYS)[number];

/**
 * Cấu hình báo cáo công việc tuần (route /admin/work-report-settings, quyền work-reports.configure):
 * cấu hình chung, đầu mục công việc, mục đích vật tư, hạn nộp theo tuần.
 * Đơn vị báo cáo và kỹ sư phụ trách cấu hình theo xưởng ở trang Báo cáo công việc tuần (tab Đơn vị & kỹ sư).
 */
const WorkReportSettingsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get(TAB_PARAM) as TabKey | null;
  const tab: TabKey = tabParam && TAB_KEYS.includes(tabParam) ? tabParam : 'general';
  // Admin (configure) thấy mọi xưởng trong phạm vi
  const scopeQuery = useMyWorkReportScope();
  const workshops = (scopeQuery.data?.workshops ?? []).map((workshop) => ({
    value: workshop.workshopId,
    label: workshop.workshopName,
  }));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Cấu hình báo cáo công việc tuần"
        description="Giờ công hiệu dụng, hạn nộp, đầu mục công việc và mục đích vật tư dùng chung toàn nhà máy."
      />
      <div className="rounded-md bg-bg-container p-3 md:p-4">
        <Tabs
          activeKey={tab}
          onChange={(key) =>
            setSearchParams(
              (previous) => {
                const next = new URLSearchParams(previous);
                if (key === 'general') next.delete(TAB_PARAM);
                else next.set(TAB_PARAM, key);
                return next;
              },
              { replace: true },
            )
          }
          destroyOnHidden
          items={[
            { key: 'general', label: 'Cấu hình chung', children: <GeneralSettingForm /> },
            { key: 'categories', label: 'Đầu mục công việc', children: <CategoryPanel workshops={workshops} /> },
            { key: 'purposes', label: 'Mục đích vật tư', children: <MaterialPurposePanel /> },
            { key: 'deadlines', label: 'Hạn nộp theo tuần', children: <WeekDeadlinePanel workshops={workshops} /> },
          ]}
        />
      </div>
    </div>
  );
};

export default WorkReportSettingsPage;
