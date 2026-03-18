/**
 * Shared input/select/textarea classes. Single place to change form control styling.
 * Uses theme tokens only (border, foreground, primary, surface).
 * Selects: use formSelectClasses so the field keeps bg-surface and shows a clear
 * dropdown chevron (theme: .form-select uses background-image, no mask).
 */

const formInputBase =
  "w-full min-h-form-input rounded-sm border border-border bg-surface px-form-input-x py-form-input-y text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50";

export const formInputClasses = formInputBase;

/** Same as formInputClasses plus .form-select (chevron, appearance-none, right padding). Use for <select>. */
export const formSelectClasses = `${formInputBase} form-select`;

export const formCheckboxClasses =
  "h-4 w-4 rounded border-border bg-surface text-primary focus:ring-primary focus:ring-2 focus:ring-offset-0";
