/** 1 ô khác nhau giữa bản đang sửa và bản mới nhất trên Server (lưu bị 409). */
export interface ConflictField {
  label: string;
  mine: string;
  latest: string;
}

/** Chỉ giữ ô khác nhau (so sau khi bỏ khoảng trắng thừa). */
export const diffConflictFields = (fields: ConflictField[]) =>
  fields.filter(
    (field) => field.mine.replace(/\s+/g, ' ').trim() !== field.latest.replace(/\s+/g, ' ').trim(),
  );
