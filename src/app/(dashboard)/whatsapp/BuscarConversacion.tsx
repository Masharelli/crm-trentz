"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function BuscarConversacion({
  initialValue,
}: {
  initialValue: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const term = value.trim();
    router.push(term ? `/whatsapp?q=${encodeURIComponent(term)}` : "/whatsapp");
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Search
        size={15}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Buscar por nombre o numero"
        className="h-10 w-full rounded-md border border-zinc-200 bg-zinc-50 pl-9 pr-3 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white"
      />
    </form>
  );
}
