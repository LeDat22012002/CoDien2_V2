import { HubConnectionBuilder, HubConnectionState, LogLevel, type HubConnection } from '@microsoft/signalr';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getAccessToken } from '@/shared/api/axiosClient';
import { WORK_REPORT_QUERY_KEYS } from '@/modules/workReports/hooks/useWorkReportQueries';
import type { WorkReportEditor, WorkReportPhase } from '@/modules/workReports/types/workReports';

/** Hub cùng gốc với API (proxy Vite / IIS đã chuyển /api), vd "/api/hubs/work-reports". */
const HUB_URL = `${(import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')}/hubs/work-reports`;

/** Gộp nhiều tin liên tiếp (vd "Đưa tất cả kế hoạch vào báo cáo") thành 1 lần tải lại. */
const REFRESH_DELAY_MS = 300;

/** Đang sửa: báo Server còn ở trang (Server bỏ sau 90 giây không thấy). */
const HEARTBEAT_MS = 30_000;

/** Thử kết nối lại: ngay, 2s, 5s, 10s, rồi 30s/lần mãi mãi. */
const retryPolicy = {
  nextRetryDelayInMilliseconds: ({ previousRetryCount }: { previousRetryCount: number }) =>
    [0, 2_000, 5_000, 10_000][previousRetryCount] ?? 30_000,
};

interface WeekTarget {
  workshopId: number;
  weekId: number;
}

interface EditingTarget {
  formId: number;
  phase: WorkReportPhase;
  itemId?: number;
}

interface PresencePayload extends WeekTarget {
  editors: WorkReportEditor[];
}

/** Ai đang sửa dòng nào (khóa mềm) + báo mình đang sửa. */
export interface WorkReportPresence {
  /** Người KHÁC đang sửa / thêm dòng trong xưởng + tuần đang xem (đã bỏ chính trang này). */
  editors: WorkReportEditor[];
  /** Bắt đầu sửa dòng itemId (không có = đang thêm dòng mới) của form; gọi lại khi đổi dòng. */
  startEditing: (formId: number, phase: WorkReportPhase, itemId?: number) => void;
  stopEditing: () => void;
}

const NO_PRESENCE: WorkReportPresence = {
  editors: [],
  startEditing: () => undefined,
  stopEditing: () => undefined,
};

/** Cung cấp ở WorkReportWorkspace; ngoài đó (vd test) dùng giá trị rỗng. */
export const WorkReportPresenceContext = createContext<WorkReportPresence>(NO_PRESENCE);

export const useWorkReportPresence = () => useContext(WorkReportPresenceContext);

/**
 * Cập nhật tức thì (SignalR): vào nhóm (xưởng, tuần) đang xem.
 * - FormChanged: tổ/kíp vừa lưu / xóa dòng, vật tư hoặc được mở khóa → làm mới dữ liệu lưới, Tổng hợp, Vật tư (query
 *   nhóm "data"). Tin không chứa dữ liệu: trang tự tải lại qua API của mình nên đúng quyền.
 * - PresenceChanged: danh sách người đang sửa dòng nào (hiện khóa mềm trên bảng). Báo "đang sửa" cần đăng nhập
 *   (gửi access token khi kết nối); trang công khai chỉ nhận.
 * Mất kết nối thì tự nối lại, vào lại nhóm, báo lại dòng đang sửa và tải lại 1 lần (bù tin bị lỡ).
 */
export const useWorkReportLiveUpdates = (workshopId?: number, weekId?: number): WorkReportPresence => {
  const queryClient = useQueryClient();
  const connectionRef = useRef<HubConnection>(undefined);
  const targetRef = useRef<WeekTarget>(undefined);
  const editingRef = useRef<EditingTarget>(undefined);
  const [presence, setPresence] = useState<PresencePayload>();

  const sendEditing = useCallback((connection: HubConnection | undefined) => {
    const target = targetRef.current;
    const editing = editingRef.current;
    if (!connection || connection.state !== HubConnectionState.Connected || !target || !editing) return;
    connection
      .invoke('StartEditing', target.workshopId, target.weekId, editing.formId, editing.phase, editing.itemId ?? null)
      // Chưa đăng nhập / token hết hạn: chỉ không hiện cho người khác, vẫn sửa bình thường
      .catch(() => undefined);
  }, []);

  // 1 kết nối cho cả trang
  useEffect(() => {
    const connection = new HubConnectionBuilder()
      .withUrl(HUB_URL, { accessTokenFactory: () => getAccessToken() ?? '' })
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
        sendEditing(connection);
      }
    };

    connection.on('FormChanged', refreshData);
    connection.on('PresenceChanged', (payload: PresencePayload) =>
      setPresence({
        ...payload,
        editors: payload.editors.filter((editor) => editor.connectionId !== connection.connectionId),
      }),
    );
    // Kết nối mới (Id mới) không còn trong nhóm: vào lại và tải lại phần đã lỡ
    connection.onreconnected(() => {
      joinCurrent().catch(() => undefined);
      refreshData();
    });

    const heartbeat = setInterval(() => {
      if (editingRef.current && connection.state === HubConnectionState.Connected) {
        connection.invoke('Heartbeat').catch(() => undefined);
      }
    }, HEARTBEAT_MS);

    let isDisposed = false;
    // Hoãn sang tick sau: StrictMode (dev) mount → unmount ngay → mount lại; không hoãn thì kết nối đầu bị dừng giữa
    // lúc negotiate và SignalR ghi lỗi "The connection was stopped during negotiation" ra console.
    const startTimer = setTimeout(() => {
      connection
        .start()
        .then(() => (isDisposed ? undefined : joinCurrent()))
        // Không kết nối được (Server cũ / mạng): trang vẫn dùng bình thường, chỉ không tự cập nhật
        .catch(() => undefined);
    }, 0);

    return () => {
      isDisposed = true;
      clearTimeout(startTimer);
      clearTimeout(refreshTimer);
      clearInterval(heartbeat);
      connectionRef.current = undefined;
      connection.stop().catch(() => undefined);
    };
  }, [queryClient, sendEditing]);

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

  const startEditing = useCallback(
    (formId: number, phase: WorkReportPhase, itemId?: number) => {
      editingRef.current = { formId, phase, itemId };
      sendEditing(connectionRef.current);
    },
    [sendEditing],
  );

  const stopEditing = useCallback(() => {
    if (!editingRef.current) return;
    editingRef.current = undefined;
    const connection = connectionRef.current;
    if (connection?.state === HubConnectionState.Connected) {
      connection.invoke('StopEditing').catch(() => undefined);
    }
  }, []);

  // Danh sách của đúng xưởng + tuần đang xem (tin cũ của tuần trước bỏ qua)
  const editors = useMemo(
    () => (presence && presence.workshopId === workshopId && presence.weekId === weekId ? presence.editors : []),
    [presence, workshopId, weekId],
  );

  return useMemo(() => ({ editors, startEditing, stopEditing }), [editors, startEditing, stopEditing]);
};
