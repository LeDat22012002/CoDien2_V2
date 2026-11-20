import {
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
  type HubConnection,
} from "@microsoft/signalr";
import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getAccessToken } from "@/shared/api/axiosClient";
import { WORK_REPORT_QUERY_KEYS } from "@/modules/workReports/hooks/useWorkReportQueries";
import type {
  WorkReportEditor,
  WorkReportPhase,
} from "@/modules/workReports/types/workReports";

/** Hub cùng gốc với API (proxy Vite / IIS đã chuyển /api), vd "/api/hubs/work-reports". */
const HUB_URL = `${(import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "")}/hubs/work-reports`;

/** Gộp nhiều tin liên tiếp (vd "Đưa tất cả kế hoạch vào báo cáo") thành 1 lần tải lại. */
const REFRESH_DELAY_MS = 300;

/** Đang sửa: báo Server còn ở trang (Server bỏ sau 90 giây không thấy). */
const HEARTBEAT_MS = 30_000;

/** Thử kết nối lại: ngay, 2s, 5s, 10s, rồi 30s/lần mãi mãi. */
const retryPolicy = {
  nextRetryDelayInMilliseconds: ({
    previousRetryCount,
  }: {
    previousRetryCount: number;
  }) => [0, 2_000, 5_000, 10_000][previousRetryCount] ?? 30_000,
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
  startEditing: (
    formId: number,
    phase: WorkReportPhase,
    itemId?: number,
  ) => void;
  stopEditing: () => void;
}

const NO_PRESENCE: WorkReportPresence = {
  editors: [],
  startEditing: () => undefined,
  stopEditing: () => undefined,
};

/** Cung cấp ở WorkReportWorkspace; ngoài đó (vd test) dùng giá trị rỗng. */
export const WorkReportPresenceContext =
  createContext<WorkReportPresence>(NO_PRESENCE);

export const useWorkReportPresence = () =>
  useContext(WorkReportPresenceContext);

const groupKey = (workshopId: number, weekId: number) =>
  `${workshopId}:${weekId}`;

/**
 * Cập nhật tức thì (SignalR): vào nhóm của các (xưởng, tuần) đang xem.
 * - FormChanged: tổ/kíp vừa lưu / xóa dòng, vật tư hoặc được mở khóa → làm mới dữ liệu lưới, Tổng hợp, Vật tư,
 *   Hôm nay (query nhóm "data"). Tin không chứa dữ liệu: trang tự tải lại qua API của mình nên đúng quyền.
 * - PresenceChanged: danh sách người đang sửa dòng nào, tổ/kíp nào của từng nhóm. Báo "đang sửa" cần đăng nhập
 *   (gửi access token khi kết nối) và chỉ cho nhóm đầu tiên (trang nhập liệu chỉ xem 1 xưởng + 1 tuần);
 *   trang công khai chỉ nhận.
 * Mất kết nối thì tự nối lại, vào lại các nhóm, báo lại dòng đang sửa và tải lại 1 lần (bù tin bị lỡ).
 *
 * @returns editorsOf(xưởng, tuần): người KHÁC đang sửa / thêm dòng của nhóm (đã bỏ chính trang này); startEditing /
 * stopEditing cho nhóm đầu tiên.
 */
export const useWorkReportLiveGroups = (targets: WeekTarget[]) => {
  const queryClient = useQueryClient();
  const connectionRef = useRef<HubConnection>(undefined);
  const targetsRef = useRef<WeekTarget[]>([]);
  const editingRef = useRef<EditingTarget>(undefined);
  /** Người đang sửa theo nhóm "xưởng:tuần". */
  const [presence, setPresence] = useState<
    ReadonlyMap<string, WorkReportEditor[]>
  >(() => new Map());

  const sendEditing = useCallback((connection: HubConnection | undefined) => {
    const target = targetsRef.current[0];
    const editing = editingRef.current;
    if (
      !connection ||
      connection.state !== HubConnectionState.Connected ||
      !target ||
      !editing
    )
      return;
    connection
      .invoke(
        "StartEditing",
        target.workshopId,
        target.weekId,
        editing.formId,
        editing.phase,
        editing.itemId ?? null,
      )
      // Chưa đăng nhập / token hết hạn: chỉ không hiện cho người khác, vẫn sửa bình thường
      .catch(() => undefined);
  }, []);

  // 1 kết nối cho cả trang
  useEffect(() => {
    const connection = new HubConnectionBuilder()
      .withUrl(HUB_URL, { accessTokenFactory: () => getAccessToken() ?? "" })
      .withAutomaticReconnect(retryPolicy)
      .configureLogging(LogLevel.Warning)
      .build();
    connectionRef.current = connection;

    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const refreshData = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(
        () =>
          queryClient.invalidateQueries({
            queryKey: WORK_REPORT_QUERY_KEYS.data,
          }),
        REFRESH_DELAY_MS,
      );
    };

    const joinCurrent = async () => {
      if (connection.state !== HubConnectionState.Connected) return;
      await Promise.all(
        targetsRef.current.map((target) =>
          connection
            .invoke("JoinWeek", target.workshopId, target.weekId)
            .catch(() => undefined),
        ),
      );
      sendEditing(connection);
    };

    connection.on("FormChanged", refreshData);
    connection.on("PresenceChanged", (payload: PresencePayload) =>
      setPresence((previous) => {
        const next = new Map(previous);
        next.set(
          groupKey(payload.workshopId, payload.weekId),
          payload.editors.filter(
            (editor) => editor.connectionId !== connection.connectionId,
          ),
        );
        return next;
      }),
    );
    // Kết nối mới (Id mới) không còn trong nhóm: vào lại và tải lại phần đã lỡ
    connection.onreconnected(() => {
      joinCurrent().catch(() => undefined);
      refreshData();
    });

    const heartbeat = setInterval(() => {
      if (
        editingRef.current &&
        connection.state === HubConnectionState.Connected
      ) {
        connection.invoke("Heartbeat").catch(() => undefined);
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

  // Đổi xưởng / tuần: rời nhóm cũ, vào nhóm mới (so theo khóa để mảng mới cùng nội dung không vào lại)
  const targetsKey = targets
    .map((target) => groupKey(target.workshopId, target.weekId))
    .join(",");
  useEffect(() => {
    const current = targetsKey
      ? targetsKey.split(",").map((key) => {
          const [workshopId, weekId] = key.split(":").map(Number);
          return { workshopId, weekId };
        })
      : [];
    targetsRef.current = current;
    const connection = connectionRef.current;
    if (connection?.state === HubConnectionState.Connected) {
      current.forEach((target) =>
        connection
          .invoke("JoinWeek", target.workshopId, target.weekId)
          .catch(() => undefined),
      );
    }

    return () => {
      if (targetsRef.current === current) targetsRef.current = [];
      const active = connectionRef.current;
      if (active?.state === HubConnectionState.Connected) {
        current.forEach((target) =>
          active
            .invoke("LeaveWeek", target.workshopId, target.weekId)
            .catch(() => undefined),
        );
      }
    };
  }, [targetsKey]);

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
      connection.invoke("StopEditing").catch(() => undefined);
    }
  }, []);

  /** Người đang sửa của đúng 1 nhóm đang theo dõi (tin cũ của nhóm đã rời bỏ qua). */
  const editorsOf = useCallback(
    (workshopId?: number, weekId?: number): WorkReportEditor[] => {
      if (!workshopId || !weekId) return NO_EDITORS;
      const key = groupKey(workshopId, weekId);
      return targetsKey.split(",").includes(key)
        ? (presence.get(key) ?? NO_EDITORS)
        : NO_EDITORS;
    },
    [presence, targetsKey],
  );

  return { editorsOf, startEditing, stopEditing };
};

const NO_EDITORS: WorkReportEditor[] = [];

/** Trang nhập liệu / Chi tiết tuần: 1 xưởng + 1 tuần (nhận cập nhật, báo mình đang sửa dòng nào). */
export const useWorkReportLiveUpdates = (
  workshopId?: number,
  weekId?: number,
): WorkReportPresence => {
  const targets = useMemo(
    () => (workshopId && weekId ? [{ workshopId, weekId }] : []),
    [workshopId, weekId],
  );
  const { editorsOf, startEditing, stopEditing } =
    useWorkReportLiveGroups(targets);
  const editors = editorsOf(workshopId, weekId);
  return useMemo(
    () => ({ editors, startEditing, stopEditing }),
    [editors, startEditing, stopEditing],
  );
};

/** Trang chỉ xem: danh sách người đang sửa, không báo gì lên Server. */
export const readOnlyPresence = (
  editors: WorkReportEditor[],
): WorkReportPresence => ({
  ...NO_PRESENCE,
  editors,
});
