/**
 * Bộ tính của máy tính cầm tay ở ô giờ công: + − × ÷ (nhận cả + - * / x), ngoặc, dấu trừ đầu số,
 * số thập phân dùng "," hoặc ".". Tự đọc (không dùng eval) nên chỉ chạy được phép tính số học.
 */

type Token =
  | { type: "number"; value: number }
  | { type: "op"; value: "+" | "-" | "*" | "/" }
  | { type: "paren"; value: "(" | ")" };

const OPERATOR_ALIASES: Record<string, "+" | "-" | "*" | "/"> = {
  "+": "+",
  "-": "-",
  "−": "-",
  "*": "*",
  "×": "*",
  x: "*",
  X: "*",
  "/": "/",
  "÷": "/",
  ":": "/",
};

const tokenize = (text: string): Token[] | undefined => {
  const tokens: Token[] = [];
  let index = 0;
  while (index < text.length) {
    const char = text[index];
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    if (/[\d.,]/.test(char)) {
      let end = index;
      while (end < text.length && /[\d.,]/.test(text[end])) end += 1;
      const raw = text.slice(index, end).replace(",", ".");
      // Chỉ 1 dấu thập phân trong 1 số
      if (!/^(\d+\.?\d*|\.\d+)$/.test(raw)) return undefined;
      tokens.push({ type: "number", value: Number(raw) });
      index = end;
      continue;
    }
    const op = OPERATOR_ALIASES[char];
    if (op) {
      tokens.push({ type: "op", value: op });
    } else if (char === "(" || char === ")") {
      tokens.push({ type: "paren", value: char });
    } else {
      return undefined;
    }
    index += 1;
  }
  return tokens;
};

/**
 * Tính biểu thức. Trả undefined khi trống, sai cú pháp hoặc chia cho 0.
 * Ngữ pháp: expr = term (("+"|"-") term)*; term = factor (("*"|"/") factor)*;
 * factor = ("+"|"-") factor | số | "(" expr ")".
 */
export const evaluateExpression = (text: string): number | undefined => {
  const tokens = tokenize(text.trim().replace(/^=/, ""));
  if (!tokens || tokens.length === 0) return undefined;
  let position = 0;
  let failed = false;

  const peek = () => tokens[position];

  const parseFactor = (): number => {
    const token = peek();
    if (!token) {
      failed = true;
      return 0;
    }
    if (token.type === "op" && (token.value === "+" || token.value === "-")) {
      position += 1;
      const value = parseFactor();
      return token.value === "-" ? -value : value;
    }
    if (token.type === "number") {
      position += 1;
      return token.value;
    }
    if (token.type === "paren" && token.value === "(") {
      position += 1;
      const value = parseExpression();
      const close = peek();
      if (!close || close.type !== "paren" || close.value !== ")") {
        failed = true;
        return 0;
      }
      position += 1;
      return value;
    }
    failed = true;
    return 0;
  };

  const parseTerm = (): number => {
    let value = parseFactor();
    for (;;) {
      const token = peek();
      if (
        !token ||
        token.type !== "op" ||
        (token.value !== "*" && token.value !== "/")
      )
        break;
      position += 1;
      const right = parseFactor();
      if (token.value === "*") {
        value *= right;
      } else {
        if (right === 0) failed = true;
        value = right === 0 ? 0 : value / right;
      }
    }
    return value;
  };

  const parseExpression = (): number => {
    let value = parseTerm();
    for (;;) {
      const token = peek();
      if (
        !token ||
        token.type !== "op" ||
        (token.value !== "+" && token.value !== "-")
      )
        break;
      position += 1;
      const right = parseTerm();
      value = token.value === "+" ? value + right : value - right;
    }
    return value;
  };

  const result = parseExpression();
  if (failed || position !== tokens.length || !Number.isFinite(result))
    return undefined;
  return Math.round(result * 100) / 100;
};
