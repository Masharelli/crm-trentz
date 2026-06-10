"use client";

import { Check } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { toggleTarea } from "./actions";

type Props = {
  taskId: string;
  clientId: string;
  completed: boolean;
};

export default function TaskToggle({ taskId, clientId, completed }: Props) {
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(completed);

  function handleToggle() {
    startTransition(async () => {
      setOptimistic(!optimistic);
      await toggleTarea(taskId, clientId, !optimistic);
    });
  }

  return (
    <button
      aria-label={optimistic ? "Marcar como pendiente" : "Marcar como completada"}
      onClick={handleToggle}
      type="button"
      className={`grid size-5 shrink-0 place-items-center rounded-md border transition ${
        optimistic
          ? "border-emerald-600 bg-emerald-600 text-white"
          : "border-zinc-300 bg-white text-transparent hover:border-zinc-400"
      }`}
    >
      <Check size={12} strokeWidth={3} />
    </button>
  );
}
