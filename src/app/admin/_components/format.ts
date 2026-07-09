export function timeAgo(iso: string | null | undefined): string {
  if (!iso) {
    return "—";
  }
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) {
    return "—";
  }
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60000);
  if (min < 1) {
    return "刚刚";
  }
  if (min < 60) {
    return `${min}m 前`;
  }
  const hr = Math.floor(min / 60);
  if (hr < 24) {
    return `${hr}h 前`;
  }
  const day = Math.floor(hr / 24);
  if (day < 30) {
    return `${day}d 前`;
  }
  return new Date(iso).toLocaleDateString("zh-CN");
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) {
    return "—";
  }
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("zh-CN", { hour12: false });
}

export function fmtNum(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "0";
  }
  return value.toLocaleString("en-US");
}

export function pct(numerator: number, denominator: number, digits = 1): string {
  if (!denominator) {
    return "—";
  }
  return `${((numerator / denominator) * 100).toFixed(digits)}%`;
}

export function truncate(text: string | null | undefined, max = 60): string {
  if (!text) {
    return "";
  }
  return text.length > max ? text.slice(0, max) + "…" : text;
}
