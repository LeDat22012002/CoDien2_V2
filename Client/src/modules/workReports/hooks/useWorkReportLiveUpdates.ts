import { HubConnectionBuilder, HubConnectionState, LogLevel, type HubConnection } from '@microsoft/signalr';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { WORK_REPORT_QUERY_KEYS } from '@/modules/workReports/hooks/useWorkReportQueries';

/** Hub cùng gốc với API (proxy Vite / IIS đã chuyển /api), vd "/api/hubs/work-reports". */
const HUB_URL = `${(import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')}/hubs/work-reports`;

/** Gộp nhiều tin liên tiếp (vd "Đưa tất cả kế hoạch vào báo cáo") thành 1 lần tải lại. */
const REFRESH_DELAY_MS = 300;

/** Thử kết nối lại: ngay, 2s, 5s, 10s, rồi 30s/lần mãi mãi. */
const retryPolicy = {
  nextRetryDelayInMilliseconds: ({ previousRetryCount }: { previousRetryCount: number }) =>
    [0, 2_000, 5_000, 10_000][previousRetryCount] ?? 30_000,
};

interface WeekTarget {
  workshopId: number;
  weekId: number;
}

/**
 * Cập nhật tức thì (SignalR): vào nhóm (xưởng, tuần) đang xem; có tổ/kíp vừa lưu / xóa dòng, vật tư hoặc được mở khóa
 * thì làm mới dữ liệu lưới, Tổng hợp, Vật tư (query nhóm "data"). Tin không chứa dữ liệu: trang tự tải lại qua API của mình
 * nên đúng quyền (trang xem không thấy gợi ý). Dùng được cả trang công khai (hub không cần đăng nhập).
 * Mất kết nối thì tự nối lại, vào lại nhóm và tải lại 1 lần (bù tin bị lỡ).
 */
export const useWorkReportLiveUpdates = (workshopId?: number, weekId?: number) => {
  const queryClient = useQueryClient();
  const connectionRef = useRef<HubConnection>(undefined);
  const targetRef = useRef<WeekTarget>(undefined);

  // 1 kết nối cho cả trang
  useEffect(() => {
    const connection = new HubConnectionBuilder()
      .withUrl(HUB_URL)
      .withAutomaticReconnect(retryPolicy)
      .configureLogging(LogLevel.Warning)
      .build();
    connectionRef.current = connection;

    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const refreshData = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(
        () => queryClient.invalidateQueries({ queryKey: WORK_REPORT_QUERY_KEYS.data }),
        REFRESH_DELAY_MS,
      );
    };

    const joinCurrent = async () => {
      const target = targetRef.current;
      if (target && connection.state === HubConnectionState.Connected) {
        await connection.invoke('JoinWeek', target.workshopId, target.weekId);
      }
    };

    connection.on('FormChanged', refreshData);
    // Kết nối mới (Id mới) không còn trong nhóm: vào lại và tải lại phần đã lỡ
    connection.onreconnected(() => {
      joinCurrent().catch(() => undefined);
      refreshData();
    });

    let isDisposed = false;
    connection
      .start()
      .then(() => (isDisposed ? undefined : joinCurrent()))
      // Không kết nối được (Server cũ / mạng): trang vẫn dùng bình thường, chỉ không tự cập nhật
      .catch(() => undefined);

    return () => {
      isDisposed = true;
      clearTimeout(refreshTimer);
      connectionRef.current = undefined;
      connection.stop().catch(() => undefined);
    };
  }, [queryClient]);

  // Đổi xưởng / tuần: rời nhóm cũ, vào nhóm mới
  useEffect(() => {
    if (!workshopId || !weekId) return;
    const target = { workshopId, weekId };
    targetRef.current = target;
    const connection = connectionRef.current;
    if (connection?.state === HubConnectionState.Connected) {
      connection.invoke('JoinWeek', workshopId, weekId).catch(() => undefined);
    }

    return () => {
      if (targetRef.current === target) targetRef.current = undefined;
      const current = connectionRef.current;
      if (current?.state === HubConnectionState.Connected) {
        current.invoke('LeaveWeek', workshopId, weekId).catch(() => undefined);
      }
    };
  }, [workshopId, weekId]);
};
