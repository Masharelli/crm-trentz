// Los filtros `.or()` de PostgREST usan comas y parentesis como sintaxis.
// Normalizar evita que una busqueda escrita por el usuario rompa el filtro.
export function normalizeSearchTerm(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/[,()%_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
