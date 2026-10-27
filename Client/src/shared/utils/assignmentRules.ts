import { ALLOWED_LEVELS_BY_TYPE } from '@/shared/constants/organization';
import type {
  ChangeAssignmentRequest,
  CurrentAssignment,
  OrgUnit,
  OrgUnitType,
  PositionLevel,
} from '@/shared/types/organization';

/**
 * Quy tắc dùng chung cho các thao tác nhân sự (giống hệ thống cũ):
 *  - Nhập lúc nào có hiệu lực lúc đó → ngày hiệu lực / ngày kết thúc luôn là hôm nay.
 *  - Không kiêm nhiệm → mỗi người chỉ có 1 vị trí chính.
 */

/** Vị trí chính đang giữ (Server trả vị trí chính đứng đầu). Thiếu danh sách vị trí thì coi như chưa xếp vị trí. */
export const getPrimaryAssignment = (assignments: CurrentAssignment[] | null | undefined) => {
  const list = assignments ?? [];
  return list.find((assignment) => assignment.isPrimary) ?? list[0];
};

/** Cấp bậc được phép cho đơn vị; null = chưa chọn đơn vị (chưa lọc). */
export const getAllowedLevelCodes = (unit: OrgUnit | undefined) => {
  if (!unit) return null;
  const levels = ALLOWED_LEVELS_BY_TYPE[unit.typeCode] ?? [];
  return unit.headLevelCode && !levels.includes(unit.headLevelCode) ? [unit.headLevelCode, ...levels] : levels;
};

/** Cấp trưởng thực tế của đơn vị: ghi đè trên đơn vị, không có thì theo loại đơn vị. */
export const getHeadLevel = (unit: OrgUnit | undefined, unitTypes: OrgUnitType[]) => {
  const type = unitTypes.find((item) => item.code === unit?.typeCode);
  return {
    code: unit?.headLevelCode || type?.headLevelCode || null,
    isSingleHead: type?.singleHead ?? true,
  };
};

/** Gợi ý loại thay đổi từ vị trí cũ → mới (Rank nhỏ = cấp cao). */
export const suggestChangeType = (
  current: CurrentAssignment | undefined,
  newLevelCode: string,
  isActing: boolean,
  levels: PositionLevel[],
): ChangeAssignmentRequest['changeType'] => {
  if (isActing) return 'ACTING';
  if (!current) return 'APPOINT';
  const rankOf = (code: string) => levels.find((level) => level.code === code)?.rank ?? 0;
  const oldRank = rankOf(current.levelCode);
  const newRank = rankOf(newLevelCode);
  if (newRank < oldRank) return 'PROMOTE';
  if (newRank > oldRank) return 'DEMOTE';
  return 'TRANSFER';
};

const stripTeamPrefix = (name: string) => name.replace(/^(Đội|Tổ)\s+/i, '');

/**
 * Gợi ý chức danh theo mẫu đang dùng trong dữ liệu, vd:
 *  Đội trưởng Điện - Tuabin, máy phát - Xưởng Cơ điện Nhiệt điện 2
 *  Kỹ sư Điện - Lò cao 5 - Xưởng Cơ điện Luyện gang 2
 *  Tổ trưởng - Tổ Điện - Lò cao 4 - Xưởng Cơ điện Luyện gang 1
 *  Quản đốc - Xưởng Cơ điện Luyện gang 1
 */
export const suggestJobTitle = (
  unit: OrgUnit | undefined,
  level: PositionLevel | undefined,
  unitsById: Map<number, OrgUnit>,
  isActing: boolean,
) => {
  if (!unit || !level) return '';

  let workshop: OrgUnit | undefined;
  for (let current: OrgUnit | undefined = unit; current; current = unitsById.get(current.parentId ?? -1)) {
    if (current.typeCode === 'WORKSHOP') {
      workshop = current;
      break;
    }
  }
  const workshopSuffix = workshop && workshop.id !== unit.id ? ` - ${workshop.name}` : '';
  const levelName = level.name;

  let title: string;
  switch (unit.typeCode) {
    case 'FACTORY':
      title = levelName;
      break;
    case 'WORKSHOP':
      title = `${levelName} - ${unit.name}`;
      break;
    case 'GROUP':
      title = `${levelName} - ${unit.name}${workshopSuffix}`;
      break;
    case 'SHIFT':
      title = unit.name.toLowerCase().startsWith(levelName.toLowerCase())
        ? `${unit.name}${workshopSuffix}`
        : `${levelName} - ${unit.name}${workshopSuffix}`;
      break;
    case 'SECTION':
      title = level.code === unit.headLevelCode ? levelName : `${levelName} ${unit.name}`;
      break;
    default: // TEAM
      title = `${levelName} ${stripTeamPrefix(unit.name)}${workshopSuffix}`;
  }

  return isActing ? `Quyền ${title.charAt(0).toLowerCase()}${title.slice(1)}` : title;
};
