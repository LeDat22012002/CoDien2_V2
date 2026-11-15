import { createContext, useContext } from 'react';

/**
 * true = đang ở trang công khai /work-reports: các hook đọc dữ liệu gọi API /work-reports/public/* (không cần đăng nhập,
 * chỉ xem mọi xưởng) thay cho API theo quyền.
 */
export const WorkReportPublicContext = createContext(false);

export const useIsPublicWorkReport = () => useContext(WorkReportPublicContext);
