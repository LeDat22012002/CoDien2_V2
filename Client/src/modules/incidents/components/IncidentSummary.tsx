import { Descriptions, Tag } from 'antd';
import { EMPTY_TEXT, formatDateTime } from '@/shared/utils/format';
import { INCIDENT_TYPE_COLOR } from '@/modules/incidents/constants/incidentOptions';
import type { Incident } from '@/modules/incidents/types/incidents';

/** Tóm tắt 1 báo cáo ở đầu modal bổ sung / phân tích, để biết đang sửa sự cố nào. */
export const IncidentSummary = ({ incident }: { incident: Incident }) => (
  <Descriptions
    size="small"
    bordered
    column={{ xs: 1, sm: 2 }}
    className="mb-4"
    items={[
      {
        key: 'equipment',
        label: 'Thiết bị',
        span: 'filled',
        children: (
          <span>
            <span className="font-medium">{incident.equipmentCode}</span>
            {incident.equipmentName && <span className="text-text-secondary"> · {incident.equipmentName}</span>}
          </span>
        ),
      },
      { key: 'deviceName', label: 'Tên sự cố', span: 'filled', children: incident.deviceName || EMPTY_TEXT },
      { key: 'workshop', label: 'Xưởng', children: incident.workshopName || EMPTY_TEXT },
      {
        key: 'type',
        label: 'Loại sự cố',
        children: incident.incidentType ? (
          <Tag color={INCIDENT_TYPE_COLOR[incident.incidentType] ?? 'default'}>{incident.incidentType}</Tag>
        ) : (
          EMPTY_TEXT
        ),
      },
      { key: 'receivedAt', label: 'Nhận thông tin', children: formatDateTime(incident.receivedAt) },
      { key: 'handedOverAt', label: 'Bàn giao', children: formatDateTime(incident.handedOverAt) },
    ]}
  />
);
