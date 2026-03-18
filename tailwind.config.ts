import type { Config } from "tailwindcss";

/**
 * Theme tokens are defined in src/styles/theme.css as CSS variables.
 * Colors and fonts are mapped here so Tailwind utilities (e.g. bg-primary, text-foreground, font-sans) use them.
 */
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--color-background) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        "surface-muted": "rgb(var(--color-surface-muted) / <alpha-value>)",
        foreground: "rgb(var(--color-foreground) / <alpha-value>)",
        "muted-foreground": "rgb(var(--color-muted-foreground) / <alpha-value>)",
        border: "rgb(var(--color-border) / <alpha-value>)",
        primary: {
          DEFAULT: "rgb(var(--color-primary) / <alpha-value>)",
          hover: "rgb(var(--color-primary-hover) / <alpha-value>)",
          muted: "rgb(var(--color-primary-muted) / <alpha-value>)",
          foreground: "rgb(var(--color-primary-foreground) / <alpha-value>)",
        },
        success: {
          DEFAULT: "rgb(var(--color-success) / <alpha-value>)",
          muted: "rgb(var(--color-success-muted) / <alpha-value>)",
        },
        warning: {
          DEFAULT: "rgb(var(--color-warning) / <alpha-value>)",
          muted: "rgb(var(--color-warning-muted) / <alpha-value>)",
        },
        danger: {
          DEFAULT: "rgb(var(--color-danger) / <alpha-value>)",
          muted: "rgb(var(--color-danger-muted) / <alpha-value>)",
        },
        status: {
          success: "rgb(var(--color-status-success) / <alpha-value>)",
          "success-bg": "rgb(var(--color-status-success-bg) / <alpha-value>)",
          warning: "rgb(var(--color-status-warning) / <alpha-value>)",
          "warning-bg": "rgb(var(--color-status-warning-bg) / <alpha-value>)",
          danger: "rgb(var(--color-status-danger) / <alpha-value>)",
          "danger-bg": "rgb(var(--color-status-danger-bg) / <alpha-value>)",
        },
        "ring-offset": "rgb(var(--color-ring-offset) / <alpha-value>)",
        "sidebar-active": {
          bg: "rgb(var(--color-sidebar-active-bg) / <alpha-value>)",
          border: "rgb(var(--color-sidebar-active-border) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderColor: {
        DEFAULT: "rgb(var(--color-border) / <alpha-value>)",
      },
      ringColor: {
        DEFAULT: "rgb(var(--color-primary) / <alpha-value>)",
      },
      width: {
        sidebar: "var(--layout-sidebar-width)",
      },
      minWidth: {
        sidebar: "var(--layout-sidebar-width)",
      },
      height: {
        topbar: "var(--layout-header-height)",
      },
      minHeight: {
        topbar: "var(--layout-header-height)",
        "form-input": "var(--form-input-height)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        card: "var(--radius-card)",
      },
      spacing: {
        "content-x": "var(--layout-content-padding-x)",
        "content-y": "var(--layout-content-padding-y)",
        sidebar: "var(--layout-sidebar-width)",
        topbar: "var(--layout-header-height)",
        "form-group": "var(--form-group-gap)",
        "form-row": "var(--form-row-gap)",
        "form-section": "var(--form-section-gap)",
        "form-actions": "var(--form-actions-gap)",
        "form-input-x": "var(--form-input-padding-x)",
        "form-input-y": "var(--form-input-padding-y)",
        "section-header-x": "var(--section-header-padding-x)",
        "section-header-y": "var(--section-header-padding-y)",
        "section-body": "var(--section-body-padding)",
        "section-gap": "var(--section-gap)",
        "section-inner": "var(--section-inner-gap)",
        "section-list-row": "var(--section-list-row-y)",
        "card": "var(--card-padding)",
        "page-header": "var(--page-header-margin-bottom)",
        "page-header-gap": "var(--page-header-gap)",
        "content-top": "var(--content-top)",
        "table-cell-x": "var(--table-cell-padding-x)",
        "table-cell-y": "var(--table-cell-padding-y)",
        "table-cell-y-header": "var(--table-cell-padding-y-header)",
        toolbar: "var(--toolbar-gap)",
        "filter-control": "var(--filter-control-gap)",
        modal: "var(--modal-padding)",
        "empty-x": "var(--empty-state-padding-x)",
        "empty-y": "var(--empty-state-padding-y)",
      },
    },
  },
  plugins: [],
};

export default config;
