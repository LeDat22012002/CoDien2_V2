import { MailOutlined, PhoneOutlined } from '@ant-design/icons';
import { Avatar, Empty, Tag } from 'antd';
import type { CSSProperties } from 'react';
import { getLevelColor } from '@/modules/organization/constants/orgChart';
import type { OrgChartGroup } from '@/modules/organization/types/orgChart';
import { getInitials, getShortJobTitle, stripUnitPrefix } from '@/modules/organization/utils/orgChartText';

/** Người trên sơ đồ hoặc trong danh sách thành viên đơn vị. */
export interface ChartPerson {
  assignmentId: number;
  empCode: string;
  fullName: string;
  levelCode: string;
  isActing: boolean;
  jobTitle?: string | null;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
}

interface PersonAvatarProps {
  person?: ChartPerson | null;
  size?: number;
  style?: CSSProperties;
}

/** Ảnh nếu có, không thì chữ cái đầu tô màu theo cấp bậc. */
export const PersonAvatar = ({ person, size = 32, style }: PersonAvatarProps) => (
  <Avatar
    size={size}
    src={person?.avatarUrl || undefined}
    alt={person?.fullName}
    className="shrink-0 font-semibold"
    style={{
      backgroundColor: person ? getLevelColor(person.levelCode) : '#cbd5e1',
      fontSize: size * 0.4,
      ...style,
    }}
  >
    {person ? getInitials(person.fullName) : '—'}
  </Avatar>
);

const ActingTag = () => (
  <Tag color="gold" className="me-0">
    Quyền
  </Tag>
);

/** 1 dòng người: avatar + tên + mã + SĐT + email + chức danh. */
export const PersonRow = ({ person }: { person: ChartPerson }) => (
  <div className="flex items-start gap-2.5 py-2">
    <PersonAvatar person={person} size={44} />
    <div className="min-w-0 flex-1 leading-snug">
      <div className="flex flex-wrap items-center gap-1">
        <span className="font-semibold text-text">{person.fullName}</span>
        {person.isActing && <ActingTag />}
      </div>
      <div className="text-sm text-text-secondary">
        <span className="font-mono">{person.empCode}</span>
        {person.phone && (
          <a href={`tel:${person.phone}`} className="ml-2 text-text-secondary hover:text-primary">
            <PhoneOutlined aria-hidden /> {person.phone}
          </a>
        )}
      </div>
      {person.email && <div className="break-all text-sm text-text-secondary">{person.email}</div>}
      {person.jobTitle && <div className="text-sm text-text-secondary">{getShortJobTitle(person.jobTitle)}</div>}
    </div>
  </div>
);

interface PersonProfileProps {
  person: ChartPerson;
  /** Cấp bậc / chức vụ hiển thị dưới tên (vd "Phó Giám đốc"). */
  levelName?: string | null;
}

/** Thẻ thông tin 1 người, avatar lớn (hover ô Ban Giám đốc). */
export const PersonProfile = ({ person, levelName }: PersonProfileProps) => (
  <div className="flex w-80 max-w-[80vw] items-start gap-3">
    <PersonAvatar person={person} size={80} />
    <div className="min-w-0 flex-1 leading-snug">
      <div className="text-base font-semibold text-text">{person.fullName}</div>
      <div className="flex flex-wrap items-center gap-1 text-sm text-text-secondary">
        {person.isActing && <ActingTag />}
        <span>{levelName}</span>
      </div>
      {person.jobTitle && <div className="text-sm text-text-secondary">{getShortJobTitle(person.jobTitle)}</div>}
      <div className="mt-1 font-mono text-sm text-text-secondary">{person.empCode}</div>
      {person.phone && (
        <a href={`tel:${person.phone}`} className="block text-sm text-text-secondary hover:text-primary">
          <PhoneOutlined aria-hidden /> {person.phone}
        </a>
      )}
      {person.email && (
        <a href={`mailto:${person.email}`} className="block break-all text-sm text-text-secondary hover:text-primary">
          <MailOutlined aria-hidden /> {person.email}
        </a>
      )}
    </div>
  </div>
);

/** Tiêu đề nhóm + số người. */
export const SectionTitle = ({ title, count }: { title: string; count: number }) => (
  <div className="flex items-center justify-between border-b border-border pb-1 text-xs font-semibold tracking-wide text-text-secondary uppercase">
    <span>{title}</span>
    <span>{count}</span>
  </div>
);

/** Danh sách theo nhóm; nhóm rỗng hiện "Chưa có". */
export const PeopleSections = ({ sections }: { sections: { title: string; people: ChartPerson[] }[] }) => (
  <div className="max-h-[420px] w-80 max-w-[80vw] overflow-y-auto pr-2">
    {sections.map((section) => (
      <div key={section.title} className="mb-2 last:mb-0">
        <SectionTitle title={section.title} count={section.people.length} />
        {section.people.length ? (
          section.people.map((person) => <PersonRow key={person.assignmentId} person={person} />)
        ) : (
          <div className="py-1.5 text-sm text-text-secondary italic">Chưa có</div>
        )}
      </div>
    ))}
  </div>
);

/** Danh sách Tổ + Tổ trưởng. */
export const GroupList = ({ groups = [], isScrollable = true }: { groups?: OrgChartGroup[]; isScrollable?: boolean }) => (
  <div className={isScrollable ? 'max-h-[420px] w-80 max-w-[80vw] overflow-y-auto pr-2' : ''}>
    {!groups.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có Tổ" />}
    {groups.map((group) => (
      <div key={group.orgUnitId} className="border-b border-border py-2 last:border-0">
        <div className="flex items-center gap-1.5">
          <span className="size-2 shrink-0 rounded-sm" style={{ background: '#f6bcbc', outline: '1px solid #e79a9a' }} />
          <span className="font-semibold text-text">{stripUnitPrefix(group.name)}</span>
          {group.shift && <Tag className="me-0">Kíp {group.shift}</Tag>}
        </div>
        {group.leaders.length ? (
          group.leaders.map((leader) => (
            <div key={leader.assignmentId} className="mt-1 ml-3.5 flex items-start gap-2">
              <PersonAvatar person={leader} size={32} />
              <div className="min-w-0 leading-snug">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-text">{leader.fullName}</span>
                  {leader.isActing && <ActingTag />}
                  <span className="font-mono text-sm text-text-secondary">{leader.empCode}</span>
                </div>
                {(leader.phone || leader.email) && (
                  <div className="flex flex-wrap gap-x-2 text-sm text-text-secondary">
                    {leader.phone && (
                      <a href={`tel:${leader.phone}`} className="text-text-secondary hover:text-primary">
                        <PhoneOutlined aria-hidden /> {leader.phone}
                      </a>
                    )}
                    {leader.email && <span className="break-all">{leader.email}</span>}
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="mt-0.5 ml-3.5 text-sm text-text-secondary italic">Chưa có Tổ trưởng</div>
        )}
      </div>
    ))}
  </div>
);
