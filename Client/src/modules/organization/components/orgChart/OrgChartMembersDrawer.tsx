import { Alert, Drawer, Empty, Skeleton, Tag } from 'antd';
import { getErrorMessage } from '@/shared/api/axiosClient';
import { useUnitMembers } from '@/shared/hooks/useOrgStructure';
import type { UnitMember } from '@/shared/types/organization';
import {
  GroupList,
  PersonRow,
  SectionTitle,
  type ChartPerson,
} from '@/modules/organization/components/orgChart/OrgChartPeople';
import type { MembersDrawerTarget } from '@/modules/organization/types/orgChart';

const ROLE_TITLE = { HEAD: 'Trưởng đơn vị', DEPUTY: 'Cấp phó' } as const;

/** Gom thành viên theo vai trò HEAD → DEPUTY → MEMBER (MEMBER tách theo cấp bậc). */
const toSections = (members: UnitMember[]) => {
  const sections: { title: string; people: UnitMember[] }[] = [];
  const push = (title: string, people: UnitMember[]) => people.length && sections.push({ title, people });
  (['HEAD', 'DEPUTY'] as const).forEach((role) => {
    const people = members.filter((member) => member.unitRole === role);
    push(people[0]?.levelName ?? ROLE_TITLE[role], people);
  });
  const others = members.filter((member) => member.unitRole === 'MEMBER');
  [...new Set(others.map((member) => member.levelName))].forEach((levelName) =>
    push(
      levelName,
      others.filter((member) => member.levelName === levelName),
    ),
  );
  return sections;
};

const Section = ({ title, people }: { title: string; people: ChartPerson[] }) => (
  <div className="mb-3">
    <SectionTitle title={title} count={people.length} />
    {people.map((person) => (
      <PersonRow key={person.assignmentId} person={person} />
    ))}
  </div>
);

interface OrgChartMembersDrawerProps {
  /** null = đóng. Ô đơn vị → tải thành viên; ô khối (Kỹ sư / Tổ…) → hiện danh sách có sẵn. */
  target: MembersDrawerTarget | null;
  onClose: () => void;
}

/** Danh sách người khi bấm vào 1 ô trên sơ đồ. */
export const OrgChartMembersDrawer = ({ target, onClose }: OrgChartMembersDrawerProps) => {
  const unitId = target?.type === 'unit' ? target.unit.orgUnitId : undefined;
  const membersQuery = useUnitMembers(unitId);
  const members = membersQuery.data ?? [];
  const block = target?.type === 'block' ? target.block : null;

  const title = block ? block.label : target?.unit.name;
  const subtitle = block ? target?.unit.name : target?.unit.typeName;
  const count = block
    ? block.kind === 'GROUPS'
      ? `${block.groupCount} tổ`
      : `${block.people.length} người`
    : membersQuery.isSuccess
      ? `${members.length} người`
      : null;

  return (
    <Drawer
      open={Boolean(target)}
      onClose={onClose}
      size={440}
      title={
        <div className="leading-tight">
          <div className="text-xs font-semibold tracking-widest text-text-secondary uppercase">{subtitle}</div>
          <div className="text-base font-semibold">{title}</div>
        </div>
      }
      extra={count && <Tag className="me-0">{count}</Tag>}
    >
      {block?.kind === 'GROUPS' && <GroupList groups={block.groups} isScrollable={false} />}
      {block?.kind === 'LEVEL' && <Section title={block.label} people={block.people} />}

      {!block && (
        <>
          {membersQuery.isPending && <Skeleton active avatar paragraph={{ rows: 3 }} />}
          {membersQuery.isError && <Alert type="error" showIcon title={getErrorMessage(membersQuery.error)} />}
          {membersQuery.isSuccess && !members.length && (
            <Empty description="Chưa có nhân sự trực tiếp trong đơn vị này" />
          )}
          {toSections(members).map((section) => (
            <Section key={section.title} title={section.title} people={section.people} />
          ))}
        </>
      )}
    </Drawer>
  );
};
