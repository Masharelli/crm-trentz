// Helpers compartidos para exportar archivos descargables.

// BOM UTF-8 para que Excel muestre bien los acentos.
export const CSV_BOM = "\uFEFF";

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function csvRow(values: string[]): string {
  return values.map(csvCell).join(",");
}
