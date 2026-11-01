import { Empty, Skeleton, Tag, Timeline } from 'antd';
import { ErrorState } from '@/shared/components/ErrorState';
import { formatDate } from '@/shared/utils/format';
import { CHANGE_TYPES } from '@/shared/constants/organization';
import { useAssignmentHistory } from '@/shared/hooks/useOrgStructure';

interface AssignmentHistoryTimelineProps {
  /** Bỏ trống = chưa tải. */
  empCode?: string;
}

/** Lịch sử công tác của 1 nhân viên (mới nhất trước), dạng dòng thời gian. */
export const AssignmentHistoryTimeline = ({ empCode }: AssignmentHistoryTimelineProps) => {
  const historyQuery = useAssignmentHistory(empCode);
  const items = historyQuery.data ?? [];

  if (historyQuery.isPending) return <Skeleton active paragraph={{ rows: 5 }} />;
  if (historyQuery.isError) {
    return <ErrorState error={historyQuery.error} onRetry={() => historyQuery.refetch()} />;
  }
  if (items.length === 0) return <Empty description="Chưa có lịch sử" />;

  return (
    <Timeline
      className="mt-2"
      items={items.map((history) => {
        const isCurrent = !history.endDate;
        const changeType = CHANGE_TYPES[history.changeType] ?? { label: history.changeType, color: 'default' };
        return {
          key: history.assignmentId,
          color: isCurrent ? 'green' : 'gray',
          content: (
            <div className="pb-1">
              <div className="flex flex-wrap items-center gap-1.5 text-sm text-text-secondary">
                <span className="font-medium text-text">
                  {formatDate(history.startDate)} → {isCurrent ? 'nay' : formatDate(history.endDate)}
                </span>
                <Tag color={changeType.color}>{changeType.label}</Tag>
                {isCurrent && <Tag color="green">Đang giữ</Tag>}
              </div>
              <div className="mt-1 text-sm font-semibold">
                {history.isActing && <Tag color="gold">Quyền</Tag>}
                {history.levelName} · {history.orgUnitName}
              </div>
              {history.jobTitle && <div className="text-sm text-text-secondary">{history.jobTitle}</div>}
              {history.decisionNo && (
                <div className="text-sm text-text-secondary">Quyết định: {history.decisionNo}</div>
              )}
            </div>
          ),
        };
      })}
    />
  );
};
