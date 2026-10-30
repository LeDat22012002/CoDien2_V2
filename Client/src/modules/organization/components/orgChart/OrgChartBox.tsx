import { Avatar, Popover } from 'antd';
import { memo, type ReactNode } from 'react';
import {
  GroupList,
  PeopleSections,
  PersonAvatar,
  PersonProfile,
  type ChartPerson,
} from '@/modules/organization/components/orgChart/OrgChartPeople';
import type { ChartBox, OrgChartBlock, OrgChartNode } from '@/modules/organization/types/orgChart';
import { getCommonJobTitle, getShortName, stripUnitPrefix } from '@/modules/organization/utils/orgChartText';

/*
 * Ô trên sơ đồ là bản vẽ thu nhỏ (phóng to bằng zoom) nên dùng cỡ chữ nhỏ cố định theo bản vẽ gốc,
 * khác quy tắc cỡ chữ tối thiểu của màn hình nhập liệu.
 */

/** Số người nhỏ ở góc ô. */
const Count = ({ value }: { value: number }) => (
  <span className="shrink-0 rounded bg-black/10 px-1 text-[9.5px] leading-[14px] font-semibold">{value}</span>
);

/** Người đứng đầu ô (hoặc "Chưa bổ nhiệm …"), 1 dòng. */
const HeadLine = ({ people, vacantText, avatarSize = 16 }: { people: ChartPerson[]; vacantText: string; avatarSize?: number }) => {
  if (!people.length) return <div className="truncate text-[10px] italic opacity-60">{vacantText}</div>;
  const first = people[0];
  return (
    <div className="flex min-w-0 items-center gap-1">
      <PersonAvatar person={first} size={avatarSize} />
      <span className="truncate text-[10.5px] font-semibold">{getShortName(first.fullName)}</span>
      {first.isActing && (
        <span className="shrink-0 rounded bg-white/70 px-0.5 text-[8.5px] font-semibold text-warning">Q</span>
      )}
      {people.length > 1 && <span className="shrink-0 text-[9.5px] opacity-70">+{people.length - 1}</span>}
    </div>
  );
};

// ===== Nội dung từng loại ô =====

const PersonCard = ({ box }: { box: ChartBox }) => {
  const isDirector = box.row === 1;
  return (
    <div className="flex h-full items-center gap-2 px-2.5">
      <PersonAvatar
        person={box.person}
        size={isDirector ? 46 : 40}
        style={{ border: '2px solid #fff' }}
      />
      <div className="min-w-0 leading-tight">
        <div className={`truncate font-bold ${isDirector ? 'text-[13.5px]' : 'text-[12px]'}`}>
          {box.person?.fullName ?? 'Chưa bổ nhiệm'}
        </div>
        <div className="truncate text-[10.5px] font-medium opacity-75">
          {box.person?.isActing ? 'Quyền ' : ''}
          {box.levelName}
        </div>
      </div>
    </div>
  );
};

const WorkshopCard = ({ unit }: { unit: OrgChartNode }) => (
  <div className="flex h-full flex-col justify-between px-2 py-1.5">
    <div className="flex items-start justify-between gap-1">
      <div className="line-clamp-2 text-[11.5px] leading-[1.15] font-bold">{unit.name}</div>
      <Count value={unit.totalHeadcount} />
    </div>
    <HeadLine people={unit.heads} vacantText={`Chưa bổ nhiệm ${unit.headLevelName}`} />
  </div>
);

const TeamCard = ({ unit }: { unit: OrgChartNode }) => (
  <div className="flex h-full flex-col justify-between px-1.5 py-1">
    <div className="line-clamp-3 text-[10.5px] leading-[1.15] font-bold">{stripUnitPrefix(unit.name)}</div>
    <HeadLine people={unit.heads} vacantText={`Chưa bổ nhiệm ${unit.headLevelName}`} avatarSize={15} />
  </div>
);

/** Ô danh sách người (Kỹ sư theo ca, khối Kỹ sư, Chuyên viên, Nhân viên). */
const PeopleCard = ({ title, people, isNarrow }: { title: string; people: ChartPerson[]; isNarrow: boolean }) => (
  <div className="flex h-full flex-col justify-between px-1.5 py-1">
    <div className={`${isNarrow ? 'line-clamp-3' : 'line-clamp-2'} text-[10px] leading-[1.15] font-bold`}>{title}</div>
    {people.length && isNarrow ? (
      <div className="text-[10px] font-semibold opacity-70">{people.length} người</div>
    ) : people.length ? (
      <div className="flex items-center gap-1">
        <Avatar.Group
          max={{ count: 2, style: { width: 15, height: 15, lineHeight: '13px', fontSize: 8 } }}
          size={15}
        >
          {people.map((person) => (
            <PersonAvatar key={person.assignmentId} person={person} size={15} style={{ borderColor: '#fff' }} />
          ))}
        </Avatar.Group>
        <span className="text-[10px] font-semibold whitespace-nowrap opacity-70">{people.length} người</span>
      </div>
    ) : (
      <div className="text-[10px] italic opacity-50">Chưa có người</div>
    )}
  </div>
);

const GroupsCard = ({ block }: { block: OrgChartBlock }) => (
  <div className="flex h-full flex-col justify-between px-1.5 py-1">
    <div className="text-[11px] leading-tight font-bold">{(block.groups ?? []).length} Tổ</div>
    <div className="text-[10px] leading-tight font-semibold opacity-75">{block.peopleCount} Tổ trưởng</div>
  </div>
);

const renderContent = (box: ChartBox) => {
  if (box.kind === 'PERSON') return <PersonCard box={box} />;
  if (box.kind === 'BLOCK' && box.block) {
    return box.block.kind === 'GROUPS' ? (
      <GroupsCard block={box.block} />
    ) : (
      <PeopleCard title={box.block.label} people={box.block.people} isNarrow={box.w < 90} />
    );
  }
  const { unit } = box;
  if (unit.typeCode === 'WORKSHOP') return <WorkshopCard unit={unit} />;
  if (unit.row <= 4) return <TeamCard unit={unit} />;
  // Kỹ sư theo ca (hàng 5), Hành chính - ISO (hàng 6)…: hiện người đứng đầu dạng khối
  return (
    <PeopleCard
      title={unit.row === 5 ? unit.name : getCommonJobTitle(unit.heads) || unit.name}
      people={unit.heads}
      isNarrow={false}
    />
  );
};

// ===== Hover =====

const getPopover = (box: ChartBox): { title: string; content: ReactNode } | null => {
  // Ban Giám đốc: mỗi ô là 1 người → hover hiện thẻ thông tin riêng của người đó
  if (box.kind === 'PERSON') {
    return box.person
      ? { title: box.unit.name, content: <PersonProfile person={box.person} levelName={box.levelName} /> }
      : null;
  }
  if (box.kind === 'BLOCK' && box.block) {
    const { block } = box;
    return {
      title: `${block.label} · ${box.unit.name}`,
      content:
        block.kind === 'GROUPS' ? (
          <GroupList groups={block.groups} />
        ) : (
          <PeopleSections sections={[{ title: block.label, people: block.people }]} />
        ),
    };
  }
  const { unit } = box;
  const sections = [{ title: unit.headLevelName, people: unit.heads }];
  if (unit.deputyLevelName) sections.push({ title: unit.deputyLevelName, people: unit.deputies });
  return { title: unit.name, content: <PeopleSections sections={sections} /> };
};

interface OrgChartBoxProps {
  box: ChartBox;
  /** Đang tìm kiếm và ô khớp. */
  isMatched: boolean;
  /** Đang tìm kiếm và ô không khớp: làm mờ. */
  isDimmed: boolean;
  /** Kết quả tìm kiếm đang chọn. */
  isActive: boolean;
  onClick: (box: ChartBox) => void;
}

/** 1 ô trên sơ đồ (đặt tuyệt đối theo box.x / box.y). Rê chuột xem nhanh, bấm mở danh sách. */
export const OrgChartBox = memo(({ box, isMatched, isDimmed, isActive, onClick }: OrgChartBoxProps) => {
  const { style } = box;
  const isVacant = box.kind === 'UNIT' && !box.unit.heads.length && box.unit.row <= 4;
  const popover = getPopover(box);

  const node = (
    <div
      role="button"
      tabIndex={0}
      aria-label={box.person?.fullName ?? box.block?.label ?? box.unit.name}
      onClick={() => onClick(box)}
      onKeyDown={(event) => event.key === 'Enter' && onClick(box)}
      className={[
        'absolute cursor-pointer overflow-hidden rounded-[2px] shadow-sm transition-[box-shadow,opacity,transform] duration-150',
        'hover:z-10 hover:-translate-y-px hover:shadow-lg focus-visible:outline-2 focus-visible:outline-primary',
        isDimmed ? 'opacity-30' : '',
        isActive ? 'z-10 ring-[3px] ring-primary' : isMatched ? 'ring-2 ring-primary/60 ring-offset-1' : '',
      ].join(' ')}
      style={{
        left: box.x,
        top: box.y,
        width: box.w,
        height: box.h,
        background: style.bg,
        color: style.text,
        border: `1px ${isVacant ? 'dashed' : 'solid'} ${style.border}`,
      }}
    >
      {renderContent(box)}
    </div>
  );

  if (!popover) return node;
  return (
    <Popover
      // Tiêu đề rộng bằng nội dung, dài thì xuống dòng (không kéo giãn popover)
      title={<div className="w-80 max-w-[80vw] leading-snug whitespace-normal">{popover.title}</div>}
      content={popover.content}
      mouseEnterDelay={0.25}
      placement="right"
      destroyOnHidden
    >
      {node}
    </Popover>
  );
});
OrgChartBox.displayName = 'OrgChartBox';
