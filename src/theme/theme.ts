export const theme = {
  colors: {
    bg: "#060708",
    bgSoft: "#0B0D10",
    card: "#111214",
    card2: "#17191D",
    border: "rgba(214,179,106,0.30)",
    borderStrong: "rgba(214,179,106,0.62)",
    gold: "#D6B36A",
    gold2: "#F3E4BE",
    gold3: "#B88A34",
    bronze: "#7A5A22",
    silver: "#C8CDD8",
    silverSoft: "#EEF1F7",
    rose: "#D39A72",
    text: "#F8F3E8",
    textSoft: "#D8CBAE",
    muted: "#9C8D72",
    cyan: "#4EE7E0",
    violet: "#A56BFF",
    success: "#58D39B",
    danger: "#FF6B81",
    shadowGold: "rgba(214,179,106,0.34)",
    shadowCyan: "rgba(78,231,224,0.12)",
    overlay: "rgba(0,0,0,0.48)",
    panel: "rgba(214,179,106,0.08)",
    panelStrong: "rgba(214,179,106,0.14)",
  },
  gradients: {
    background: ["#050505", "#0A0A0B", "#14100A"] as const,
    card: ["rgba(24,19,12,0.96)", "rgba(13,11,9,0.98)"] as const,
    gold: ["#6C4A14", "#C79C45", "#F3E4BE"] as const,
    darkButton: ["#1C170F", "#0F0C08"] as const,
    accent: ["#D6B36A", "#F3E4BE"] as const,
    goldCard: ["rgba(84,57,16,0.98)", "rgba(28,20,11,0.98)"] as const,
    silverCard: ["rgba(76,82,95,0.98)", "rgba(21,24,31,0.98)"] as const,
    bronzeCard: ["rgba(90,49,20,0.98)", "rgba(28,18,11,0.98)"] as const,
  },
  radius: {
    sm: 12,
    md: 18,
    lg: 24,
    xl: 32,
    pill: 999,
  },
  spacing: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40,
  },
  typography: {
    hero: 38,
    title: 28,
    subtitle: 20,
    body: 16,
    caption: 12,
  },
};

export function formatAmount(value: number) {
  return new Intl.NumberFormat("en-US").format(Number(value || 0));
}

export function formatSignedAmount(value: number) {
  const num = Number(value || 0);
  return `${num > 0 ? "+" : num < 0 ? "-" : ""}${formatAmount(Math.abs(num))}`;
}

export function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function getTransactionTitle(type: string) {
  switch (type) {
    case "WELCOME_BONUS":
      return "Welcome Bonus";
    case "CONVERSION_TO_CHIPS":
      return "Converted to Chips";
    case "CONVERSION_TO_COINS":
      return "Converted to Double O";
    default:
      return type.replaceAll("_", " ");
  }
}
