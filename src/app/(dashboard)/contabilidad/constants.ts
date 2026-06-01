export const expenseCategories = [
  { label: "Renta", value: "rent" },
  { label: "Nomina", value: "payroll" },
  { label: "Software", value: "software" },
  { label: "Servicios", value: "services" },
  { label: "Marketing", value: "marketing" },
  { label: "Impuestos", value: "taxes" },
  { label: "Equipo", value: "equipment" },
  { label: "Mantenimiento", value: "maintenance" },
  { label: "Viajes", value: "travel" },
  { label: "Otro", value: "other" },
] as const;

export type ExpenseCategory = (typeof expenseCategories)[number]["value"];

export const categoryLabel: Record<ExpenseCategory, string> =
  expenseCategories.reduce(
    (acc, category) => ({ ...acc, [category.value]: category.label }),
    {} as Record<ExpenseCategory, string>,
  );

export const categoryClass: Record<ExpenseCategory, string> = {
  equipment: "bg-sky-50 text-sky-800 ring-sky-200",
  maintenance: "bg-stone-100 text-stone-800 ring-stone-200",
  marketing: "bg-fuchsia-50 text-fuchsia-800 ring-fuchsia-200",
  other: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  payroll: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  rent: "bg-amber-50 text-amber-800 ring-amber-200",
  services: "bg-cyan-50 text-cyan-800 ring-cyan-200",
  software: "bg-indigo-50 text-indigo-800 ring-indigo-200",
  taxes: "bg-rose-50 text-rose-800 ring-rose-200",
  travel: "bg-teal-50 text-teal-800 ring-teal-200",
};

export const currencies = ["MXN", "USD"] as const;
