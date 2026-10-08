// Hex mirrors of the --chart-* and neutral tokens in globals.css.
// Chart.js draws on canvas and parses colors itself, so it needs concrete values.
export interface ChartTheme {
     series: string[];
     text: string;
     grid: string;
     foreground: string;
     surface: string;
     tooltipBackground: string;
     tooltipBorder: string;
}

export const chartThemes: Record<"light" | "dark", ChartTheme> = {
     light: {
          series: ["#3f945b", "#2b85aa", "#d49838", "#8062b0", "#d15c56"],
          text: "#555d59",
          grid: "#e5e9e7",
          foreground: "#131a17",
          surface: "#ffffff",
          tooltipBackground: "#ffffff",
          tooltipBorder: "#dce1de",
     },
     dark: {
          series: ["#5ebc7b", "#54aad1", "#e8b45e", "#aa8dde", "#e97871"],
          text: "#969d9a",
          grid: "#262a28",
          foreground: "#e5e9e7",
          surface: "#131614",
          tooltipBackground: "#191d1b",
          tooltipBorder: "#272b29",
     },
};

export function withAlpha(hex: string, alpha: number): string {
     const value = Math.round(alpha * 255)
          .toString(16)
          .padStart(2, "0");
     return `${hex}${value}`;
}
