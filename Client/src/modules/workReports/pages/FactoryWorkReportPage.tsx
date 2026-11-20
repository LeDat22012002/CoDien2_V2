import { Segmented } from "antd";
import { useSearchParams } from "react-router";
import { PublicDailyView } from "@/modules/workReports/components/public/PublicDailyView";
import { PublicDashboardView } from "@/modules/workReports/components/public/PublicDashboardView";
import { WorkReportWorkspace } from "@/modules/workReports/components/WorkReportWorkspace";
import { WorkReportPublicContext } from "@/modules/workReports/hooks/workReportViewContext";

type PublicPage = "analysis" | "today" | "week";

const PAGE_PARAM = "page";
/** Phần mở mặc định (không có ?page=). */
const DEFAULT_PAGE: PublicPage = "analysis";

const PAGE_OPTIONS: { value: PublicPage; label: string }[] = [
  { value: "analysis", label: "Dashboard" },
  { value: "today", label: "Công việc hôm nay" },
  { value: "week", label: "Chi tiết tuần" },
];

/**
 * Trang công khai /work-reports (Ban Giám đốc, ai cũng xem được, không cần đăng nhập), chỉ xem, chỉ các xưởng bật
 * trong Cài đặt (API /work-reports/public/*). 3 phần (?page=…, F5 / gửi link giữ nguyên):
 * - Phân tích (mặc định): kế hoạch – thực hiện tuần theo xưởng (biểu đồ giờ công, đầu mục, vật tư, tỉ trọng xưởng + bảng tổng hợp).
 * - Hôm nay: bảng công việc báo cáo hôm nay / kế hoạch ngày mai của các xưởng (cùng bảng với Chi tiết tuần).
 * - Chi tiết tuần: bảng kế hoạch / báo cáo / tổng hợp / vật tư của xưởng được chọn (màn hình xem tuần).
 * Route toàn màn hình nên tự thêm lề.
 */
const FactoryWorkReportPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const pageParam = searchParams.get(PAGE_PARAM) as PublicPage | null;
  const page: PublicPage = PAGE_OPTIONS.some(
    (option) => option.value === pageParam,
  )
    ? (pageParam as PublicPage)
    : DEFAULT_PAGE;

  const changePage = (value: PublicPage) =>
    // Đổi phần: bỏ tham số của phần cũ (xưởng, tuần…) để phần mới mở mặc định
    setSearchParams(value === DEFAULT_PAGE ? {} : { [PAGE_PARAM]: value }, {
      replace: true,
    });

  return (
    <WorkReportPublicContext value>
      <div className="w-full flex-1 bg-bg-layout px-3 py-4 md:px-6 md:py-6">
        <Segmented<PublicPage>
          aria-label="Phần xem"
          options={PAGE_OPTIONS}
          value={page}
          onChange={changePage}
          className="mb-2 md:mb-3"
        />
        {page === "analysis" && <PublicDashboardView />}
        {page === "today" && <PublicDailyView />}
        {page === "week" && <WorkReportWorkspace mode="factory" />}
      </div>
    </WorkReportPublicContext>
  );
};

export default FactoryWorkReportPage;
