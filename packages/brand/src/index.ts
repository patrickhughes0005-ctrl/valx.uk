export const brand = {
  name: "ValX",
  slogan: null,
  colours: {
    primary: "#FF8A1F",
    primaryDark: "#C75B12",
    background: "#0C0E0D",
    panel: "#181B19",
    panelRaised: "#202420",
    text: "#F7F8F6",
    muted: "#969A94",
    line: "#2A2E2A",
    danger: "#F18484",
    warning: "#F1BD69",
    info: "#86B8FF"
  },
  radius: {
    small: 12,
    medium: 18,
    large: 28,
    pill: 999
  }
} as const;

export type Brand = typeof brand;

