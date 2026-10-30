/**
 * Tính vị trí các ô + đường nối của sơ đồ theo bố cục bản vẽ BM.01-QT.04:
 *  Hàng 1 Giám đốc · Hàng 2 các Phó Giám đốc · Hàng 3 Xưởng (Quản đốc)
 *  Hàng 4 Đội (Đội trưởng), KHTH, An toàn, Kho
 *  Hàng 5 Kỹ sư (treo lệch bên cạnh trục dọc của Đội; Kỹ sư theo ca nằm thẳng dưới Xưởng)
 *  Hàng 6 Tổ (gộp 1 khối), Nhân viên
 *
 * Mỗi Đội là 1 "cột": ô Đội ở trên, trục dọc đi xuống ô Tổ ở hàng 6, ô Kỹ sư treo lệch ở hàng 5.
 * Xưởng nằm giữa các cột con, nối bằng 1 thanh ngang (bus). Nhà máy có thể xuống dòng thành nhiều dải.
 * Kết quả: { width, height, boxes, edges }, tọa độ tuyệt đối (px).
 */
import {
  BLOCK_SPLIT_RULES,
  BOX_STYLE,
  DISCIPLINE_NAME,
  LAST_CHART_ROW,
  LAYOUT,
} from '@/modules/organization/constants/orgChart';
import type {
  ChartBox,
  ChartBoxStyle,
  ChartEdge,
  ChartLayout,
  OrgChartBlock,
  OrgChartNode,
} from '@/modules/organization/types/orgChart';
import { getCommonJobTitle, getPeopleText, normalizeChartText } from '@/modules/organization/utils/orgChartText';

const { WIDTH, ROW_HEIGHT, ROW_GAP } = LAYOUT;

/** Ô chưa đặt tọa độ. */
type BoxSpec = Omit<ChartBox, 'x' | 'y' | 'h'> & { side?: 'L' | 'R' };

interface LeafSpec {
  type: 'leaf';
  top: BoxSpec;
  sides: BoxSpec[];
  below: BoxSpec[];
  /** Vị trí trục dọc so với mép trái cột. */
  spine: number;
  width: number;
  topRow: number;
  typeCode: string;
}

interface TreeSpec {
  type: 'tree';
  top: BoxSpec;
  children: Spec[];
  childrenW: number;
  width: number;
  topRow: number;
  typeCode: string;
}

type Spec = LeafSpec | TreeSpec;
type RowTop = (row: number) => number;

// ===== Nội dung ô =====

const getDiscipline = (unit: OrgChartNode) =>
  (unit.disciplineCode && DISCIPLINE_NAME[unit.disciplineCode]) || unit.name.match(/^Đội\s+(.+?)\s*-/)?.[1] || null;

/** Nhãn khối: KS trong Đội → "Kỹ sư Cơ khí"; khối cùng chức danh → chức danh đó. */
const getBlockLabel = (block: OrgChartBlock, unit: OrgChartNode) => {
  if (block.kind === 'GROUPS') return 'Các Tổ';
  if (block.levelCode === 'KS' && unit.typeCode === 'TEAM') {
    const discipline = getDiscipline(unit);
    if (discipline) return `Kỹ sư ${discipline}`;
  }
  return getCommonJobTitle(block.people) || block.label;
};

/** Áp quy tắc chia khối (vd KHTH: KS Kế hoạch tổng hợp / KS Kỹ thuật - Chuyên môn). */
const expandBlocks = (unit: OrgChartNode): OrgChartBlock[] =>
  (unit.blocks ?? []).flatMap((block) => {
    const rule =
      block.kind === 'LEVEL' &&
      BLOCK_SPLIT_RULES.find((item) => item.unitCode === unit.code && item.levelCode === block.levelCode);
    if (!rule) return [{ ...block, label: getBlockLabel(block, unit) }];

    const fallback = rule.parts.find((part) => !part.keywords?.length) ?? rule.parts[rule.parts.length - 1];
    const buckets = new Map(rule.parts.map((part) => [part.key, [] as OrgChartBlock['people']]));
    block.people.forEach((person) => {
      const title = normalizeChartText(person.jobTitle);
      const part = rule.parts.find((item) => item.keywords?.some((keyword) => title.includes(keyword))) ?? fallback;
      buckets.get(part.key)?.push(person);
    });
    return rule.parts.map((part) => {
      const people = buckets.get(part.key) ?? [];
      return { ...block, key: `${block.key}-${part.key}`, label: part.label, people, peopleCount: people.length };
    });
  });

const getUnitStyle = (unit: OrgChartNode): ChartBoxStyle => {
  if (unit.typeCode === 'FACTORY') return BOX_STYLE.BGD;
  if (unit.typeCode === 'WORKSHOP') return BOX_STYLE.WORKSHOP;
  if (unit.row === 4) return BOX_STYLE.TEAM;
  if (unit.row === 5) return BOX_STYLE.ENGINEER;
  return BOX_STYLE.STAFF;
};

const getBlockStyle = (block: OrgChartBlock): ChartBoxStyle => {
  if (block.kind === 'GROUPS') return BOX_STYLE.GROUPS;
  if (block.levelCode === 'KS' || block.levelCode === 'CV') return BOX_STYLE.ENGINEER;
  return BOX_STYLE.STAFF;
};

const toUnitBox = (unit: OrgChartNode): BoxSpec => ({
  id: `U${unit.orgUnitId}`,
  kind: 'UNIT',
  row: unit.row,
  w: unit.typeCode === 'WORKSHOP' ? WIDTH.WORKSHOP : unit.row >= 5 ? WIDTH.BLOCK : WIDTH.UNIT,
  unit,
  style: getUnitStyle(unit),
  searchText: normalizeChartText(
    `${unit.name} ${unit.code} ${getPeopleText(unit.heads)} ${getPeopleText(unit.deputies)}`,
  ),
});

const toBlockBox = (block: OrgChartBlock, unit: OrgChartNode, isSide = false): BoxSpec => ({
  id: block.key,
  kind: 'BLOCK',
  row: block.row,
  w: isSide ? WIDTH.SIDE : WIDTH.BLOCK,
  block,
  unit,
  style: getBlockStyle(block),
  searchText: normalizeChartText(
    `${block.label} ${getPeopleText(block.people ?? [])} ${(block.groups ?? [])
      .map((group) => `${group.name} ${getPeopleText(group.leaders)}`)
      .join(' ')}`,
  ),
});

// ===== Đo kích thước (chưa đặt tọa độ) =====

const sumWidth = (items: { w: number }[], gap: number) =>
  items.reduce((total, item) => total + item.w, 0) + Math.max(0, items.length - 1) * gap;

/** 1 cột: ô trên cùng + các ô treo bên cạnh + các ô ở hàng dưới cùng. */
const measureLeaf = (top: BoxSpec, blocks: OrgChartBlock[], unit: OrgChartNode): LeafSpec => {
  // Khối nằm cùng hàng / trên ô trưởng (dữ liệu lệch) thì đẩy xuống hàng kế tiếp
  const lower = blocks.map((block) =>
    block.row > top.row ? block : { ...block, row: Math.min(LAST_CHART_ROW, top.row + 1) },
  );
  const bottomRow = lower.length ? Math.max(...lower.map((block) => block.row)) : null;

  const sides = lower
    .filter((block) => bottomRow !== null && block.row < bottomRow)
    .map((block, index): BoxSpec => ({ ...toBlockBox(block, unit, true), side: index % 2 === 0 ? 'L' : 'R' }));
  const below = lower.filter((block) => block.row === bottomRow).map((block) => toBlockBox(block, unit));

  const leftW = sumWidth(sides.filter((side) => side.side === 'L'), LAYOUT.BOX_GAP);
  const rightW = sumWidth(sides.filter((side) => side.side === 'R'), LAYOUT.BOX_GAP);
  const belowW = sumWidth(below, LAYOUT.BOX_GAP);

  // Cột gọn: ô Đội / ô Tổ chiếm đúng bề rộng cột; trục dọc lệch để ô Kỹ sư treo bên cạnh
  let width: number;
  let spine: number;
  if (sides.length) {
    const left = leftW ? leftW + LAYOUT.SIDE_GAP : LAYOUT.SPINE_MARGIN;
    const right = rightW ? LAYOUT.SIDE_GAP + rightW : LAYOUT.SPINE_MARGIN;
    width = Math.max(left + right, top.w, belowW);
    spine = left + (width - left - right) / 2;
  } else {
    width = Math.max(top.w, belowW);
    spine = width / 2;
  }
  return { type: 'leaf', top, sides, below, spine, width, topRow: top.row, typeCode: unit.typeCode };
};

const sortUnits = (units: OrgChartNode[] = []) => [...units].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

/** Cột con của 1 đơn vị: đơn vị con + khối người trực thuộc (vd Kỹ sư chưa xếp Đội của Xưởng). */
const getChildSpecs = (unit: OrgChartNode): Spec[] => {
  const children = sortUnits(unit.children).map(measure);
  const loose = expandBlocks(unit)
    .filter((block) => block.row > unit.row)
    .map((block) => measureLeaf(toBlockBox(block, unit), [], unit));
  // Khối trực thuộc đặt trước "Kỹ sư theo ca" (ca luôn ở cuối như bản vẽ)
  const shiftIndex = children.findIndex((child) => child.typeCode === 'SHIFT');
  if (shiftIndex < 0) return [...children, ...loose];
  return [...children.slice(0, shiftIndex), ...loose, ...children.slice(shiftIndex)];
};

const getGapBetween = (a: Spec, b: Spec) => (a.type === 'tree' || b.type === 'tree' ? LAYOUT.GROUP_GAP : LAYOUT.COL_GAP);

const getRowWidth = (specs: Spec[]) =>
  specs.reduce((total, spec, index) => total + spec.width + (index ? getGapBetween(specs[index - 1], spec) : 0), 0);

/** Đơn vị bất kỳ (trừ Nhà máy). */
function measure(unit: OrgChartNode): Spec {
  const top = toUnitBox(unit);
  if (!unit.children?.length) return measureLeaf(top, expandBlocks(unit), unit);

  const children = getChildSpecs(unit);
  const childrenW = getRowWidth(children);
  return {
    type: 'tree',
    top,
    children,
    childrenW,
    width: Math.max(childrenW, top.w),
    topRow: top.row,
    typeCode: unit.typeCode,
  };
}

// ===== Đặt tọa độ =====

const getRowOffsets = (fromRow: number) => {
  const offsets: Record<number, number> = {};
  let y = 0;
  for (let row = fromRow; row <= LAST_CHART_ROW; row += 1) {
    offsets[row] = y;
    y += ROW_HEIGHT[row] + ROW_GAP;
  }
  return { offsets, height: y - ROW_GAP };
};

class Canvas {
  boxes: ChartBox[] = [];
  edges: ChartEdge[] = [];

  box(spec: BoxSpec, x: number, y: number): ChartBox {
    const placed = { ...spec, x, y, h: ROW_HEIGHT[spec.row] };
    this.boxes.push(placed);
    return placed;
  }

  line(points: [number, number][], color: string, arrow = false) {
    this.edges.push({ points, color, arrow });
  }
}

/** Đặt 1 cột; trả về x tâm ô trên cùng (điểm mũi tên từ cấp trên đi vào). */
const placeLeaf = (spec: LeafSpec, x0: number, rowTop: RowTop, canvas: Canvas) => {
  const spine = x0 + spec.spine;
  const center = x0 + spec.width / 2;
  const color = spec.top.style.line;
  const top = canvas.box(spec.top, center - spec.top.w / 2, rowTop(spec.top.row));
  const topBottom = top.y + top.h;
  let trunkEnd = topBottom;

  // Ô treo bên cạnh (Kỹ sư): nhánh ngang từ trục rồi mũi tên xuống
  if (spec.sides.length) {
    const branchY = rowTop(spec.sides[0].row) - ROW_GAP / 2;
    let leftEdge = spine - LAYOUT.SIDE_GAP;
    let rightEdge = spine + LAYOUT.SIDE_GAP;
    spec.sides.forEach((side) => {
      let x: number;
      if (side.side === 'L') {
        x = leftEdge - side.w;
        leftEdge = x - LAYOUT.BOX_GAP;
      } else {
        x = rightEdge;
        rightEdge = x + side.w + LAYOUT.BOX_GAP;
      }
      const placed = canvas.box(side, x, rowTop(side.row));
      const cx = placed.x + placed.w / 2;
      canvas.line(
        [
          [spine, branchY],
          [cx, branchY],
          [cx, placed.y],
        ],
        color,
        true,
      );
    });
    trunkEnd = branchY;
  }

  // Ô hàng dưới cùng (Tổ / Nhân viên): trục đi thẳng xuống
  if (spec.below.length) {
    const belowTop = rowTop(spec.below[0].row);
    let x = center - sumWidth(spec.below, LAYOUT.BOX_GAP) / 2;
    const placed = spec.below.map((item) => {
      const box = canvas.box(item, x, belowTop);
      x += item.w + LAYOUT.BOX_GAP;
      return box;
    });
    const centers = placed.map((box) => box.x + box.w / 2);

    if (placed.length === 1 && spine > placed[0].x + 6 && spine < placed[0].x + placed[0].w - 6) {
      canvas.line(
        [
          [spine, topBottom],
          [spine, belowTop],
        ],
        color,
        true,
      );
    } else {
      const busY = belowTop - ROW_GAP / 3;
      canvas.line(
        [
          [spine, topBottom],
          [spine, busY],
        ],
        color,
      );
      canvas.line(
        [
          [Math.min(spine, ...centers), busY],
          [Math.max(spine, ...centers), busY],
        ],
        color,
      );
      centers.forEach((cx) =>
        canvas.line(
          [
            [cx, busY],
            [cx, belowTop],
          ],
          color,
          true,
        ),
      );
    }
  } else if (trunkEnd > topBottom) {
    canvas.line(
      [
        [spine, topBottom],
        [spine, trunkEnd],
      ],
      color,
    );
  }
  return center;
};

/** Đặt dãy cột con từ x0; trả về trục + đỉnh của từng cột. */
const placeChildren = (children: Spec[], x0: number, rowTop: RowTop, canvas: Canvas) => {
  let x = x0;
  return children.map((child, index) => {
    if (index) x += getGapBetween(children[index - 1], child);
    const spine = place(child, x, rowTop, canvas);
    x += child.width;
    return { spine, top: rowTop(child.topRow) };
  });
};

/** Nối ô cha xuống các con qua thanh ngang ở busY. */
const connect = (
  parentSpine: number,
  parentBottom: number,
  busY: number,
  kids: { spine: number; top: number }[],
  color: string,
  canvas: Canvas,
) => {
  if (!kids.length) return;
  const xs = [parentSpine, ...kids.map((kid) => kid.spine)];
  canvas.line(
    [
      [parentSpine, parentBottom],
      [parentSpine, busY],
    ],
    color,
  );
  canvas.line(
    [
      [Math.min(...xs), busY],
      [Math.max(...xs), busY],
    ],
    color,
  );
  kids.forEach((kid) =>
    canvas.line(
      [
        [kid.spine, busY],
        [kid.spine, kid.top],
      ],
      color,
      true,
    ),
  );
};

function place(spec: Spec, x0: number, rowTop: RowTop, canvas: Canvas): number {
  if (spec.type === 'leaf') return placeLeaf(spec, x0, rowTop, canvas);

  const kids = placeChildren(spec.children, x0 + (spec.width - spec.childrenW) / 2, rowTop, canvas);
  const center = (kids[0].spine + kids[kids.length - 1].spine) / 2;
  const boxX = Math.min(Math.max(center - spec.top.w / 2, x0), x0 + spec.width - spec.top.w);
  const top = canvas.box(spec.top, boxX, rowTop(spec.top.row));
  const spine = top.x + top.w / 2;

  connect(spine, top.y + top.h, rowTop(spec.top.row + 1) - ROW_GAP / 2, kids, spec.top.style.line, canvas);
  return spine;
}

/** Chia các cột con của Nhà máy thành `bands` dải có độ rộng gần bằng nhau (giữ thứ tự). */
const splitBands = (specs: Spec[], bands: number): Spec[][] => {
  if (bands <= 1 || specs.length < 2) return [specs];
  const target = getRowWidth(specs) / bands;
  const result: Spec[][] = [[]];
  let accumulated = 0;
  specs.forEach((spec) => {
    const current = result[result.length - 1];
    if (current.length && accumulated + spec.width / 2 > target && result.length < bands) {
      result.push([spec]);
      accumulated = spec.width;
    } else {
      current.push(spec);
      accumulated += spec.width;
    }
  });
  return result;
};

/** Dựng bố cục từ root (Nhà máy). bands: số dải (1 = 1 hàng ngang dài, 2 = xuống dòng như bản vẽ). */
export const buildOrgChartLayout = (root: OrgChartNode, bands: number): ChartLayout => {
  const canvas = new Canvas();
  const padding = LAYOUT.PADDING;
  const color = BOX_STYLE.BGD.line;

  const bandSpecs = splitBands(getChildSpecs(root), bands);
  const bandWidths = bandSpecs.map(getRowWidth);

  const directors = root.heads ?? [];
  const deputies = root.deputies ?? [];
  const leftCount = Math.ceil(deputies.length / 2);
  const getDeputiesWidth = (count: number) =>
    count * LAYOUT.DEPUTY_WIDTH + Math.max(0, count - 1) * LAYOUT.DEPUTY_GAP;
  const centerGap = LAYOUT.DEPUTY_CENTER_GAP;
  const deputiesW = 2 * Math.max(getDeputiesWidth(leftCount), getDeputiesWidth(deputies.length - leftCount)) + centerGap;
  const directorsW = Math.max(1, directors.length) * (LAYOUT.DIRECTOR_WIDTH + LAYOUT.DEPUTY_GAP);

  const contentW = Math.max(...bandWidths, deputiesW, directorsW);
  const spine = padding + contentW / 2;

  // Tọa độ y từng hàng của từng dải
  const first = getRowOffsets(1);
  const rest = getRowOffsets(3);
  const bandTops = [padding];
  bandSpecs.slice(1).forEach((_, index) => {
    bandTops.push(bandTops[index] + (index === 0 ? first.height : rest.height) + LAYOUT.BAND_GAP);
  });
  const getRowTop =
    (bandIndex: number): RowTop =>
    (row) =>
      bandTops[bandIndex] + (bandIndex === 0 ? first.offsets[row] : rest.offsets[row]);
  const rowTop0 = getRowTop(0);

  // Hàng 1: Giám đốc
  const directorSlots = directors.length ? directors : [null];
  const directorBoxes = directorSlots.map((person, index) => {
    const totalW = directorSlots.length * LAYOUT.DIRECTOR_WIDTH + (directorSlots.length - 1) * LAYOUT.DEPUTY_GAP;
    const x = spine - totalW / 2 + index * (LAYOUT.DIRECTOR_WIDTH + LAYOUT.DEPUTY_GAP);
    return canvas.box(
      {
        id: `GD-${person?.assignmentId ?? 'vacant'}`,
        kind: 'PERSON',
        row: 1,
        w: LAYOUT.DIRECTOR_WIDTH,
        person,
        unit: root,
        levelName: root.headLevelName,
        style: BOX_STYLE.BGD,
        searchText: normalizeChartText(`${root.name} ${getPeopleText(person ? [person] : [])}`),
      },
      x,
      rowTop0(1),
    );
  });
  const directorBottom = directorBoxes[0].y + directorBoxes[0].h;

  // Hàng 2: Phó Giám đốc, chia 2 bên trục giữa
  const deputyTop = rowTop0(2);
  const deputyBusY = deputyTop - ROW_GAP / 2;
  const deputyCenters = deputies.map((person, index) => {
    const isLeft = index < leftCount;
    const slot = isLeft ? leftCount - 1 - index : index - leftCount;
    const x = isLeft
      ? spine - centerGap / 2 - LAYOUT.DEPUTY_WIDTH - slot * (LAYOUT.DEPUTY_WIDTH + LAYOUT.DEPUTY_GAP)
      : spine + centerGap / 2 + slot * (LAYOUT.DEPUTY_WIDTH + LAYOUT.DEPUTY_GAP);
    const box = canvas.box(
      {
        id: `PGD-${person.assignmentId}`,
        kind: 'PERSON',
        row: 2,
        w: LAYOUT.DEPUTY_WIDTH,
        person,
        unit: root,
        levelName: root.deputyLevelName,
        style: BOX_STYLE.BGD,
        searchText: normalizeChartText(getPeopleText([person])),
      },
      x,
      deputyTop,
    );
    return box.x + box.w / 2;
  });
  if (deputyCenters.length) {
    canvas.line(
      [
        [Math.min(spine, ...deputyCenters), deputyBusY],
        [Math.max(spine, ...deputyCenters), deputyBusY],
      ],
      color,
    );
    deputyCenters.forEach((cx) =>
      canvas.line(
        [
          [cx, deputyBusY],
          [cx, deputyTop],
        ],
        color,
        true,
      ),
    );
  }

  // Hàng 3+: các dải đơn vị
  const rightX = padding + contentW + 24;
  let previousBusY = 0;
  bandSpecs.forEach((specs, bandIndex) => {
    const rowTop = getRowTop(bandIndex);
    const x0 = padding + (contentW - bandWidths[bandIndex]) / 2;
    const kids = placeChildren(specs, x0, rowTop, canvas);
    const busY = rowTop(3) - ROW_GAP / 2;
    const xs = kids.map((kid) => kid.spine);

    if (bandIndex === 0) {
      canvas.line(
        [
          [spine, directorBottom],
          [spine, busY],
        ],
        color,
      );
      const right = bandSpecs.length > 1 ? rightX : Math.max(spine, ...xs);
      canvas.line(
        [
          [Math.min(spine, ...xs), busY],
          [right, busY],
        ],
        color,
      );
    } else {
      // Đường vòng bên phải xuống dải dưới (giống bản vẽ)
      canvas.line(
        [
          [rightX, previousBusY],
          [rightX, busY],
          [Math.min(...xs), busY],
        ],
        color,
      );
    }
    kids.forEach((kid) =>
      canvas.line(
        [
          [kid.spine, busY],
          [kid.spine, kid.top],
        ],
        color,
        true,
      ),
    );
    previousBusY = busY;
  });

  const lastBand = bandSpecs.length - 1;
  const height = bandTops[lastBand] + (lastBand === 0 ? first.height : rest.height) + padding;
  return { width: rightX + padding, height, boxes: canvas.boxes, edges: canvas.edges };
};

/** Tỉ lệ để cả sơ đồ vừa khung nhìn. */
export const getFitScale = (layout: ChartLayout, size: { width: number; height: number }) =>
  Math.max(0.1, Math.min(LAYOUT.MAX_FIT_SCALE, size.width / layout.width, size.height / layout.height));
