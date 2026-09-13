"use client";

import { Check } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import ActionErrorToast from "../components/ActionErrorToast";
import { toggleTarea } from "./actions";

type Props = {
  taskId: string;
  clientId: string;
  completed: boolean;
};

export default function TaskToggle({ taskId, clientId, completed }: Props) {
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(completed);
  const [error, setError] = useState<string | null>(null);

  function handleToggle() {
    startTransition(async () => {
      setError(null);
      setOptimistic(!optimistic);
      const result = await toggleTarea(taskId, clientId, !optimistic);
      setError(result.error);
    });
  }

  return (
    <>
      <button
        aria-label={optimistic ? "Marcar como pendiente" : "Marcar como completada"}
        className={`pressable grid size-5 shrink-0 place-items-center rounded-md border ${
          optimistic
            ? "border-emerald-600 bg-emerald-600 text-white"
            : "border-zinc-300 bg-white text-transparent hover:border-zinc-400"
        }`}
        onClick={handleToggle}
        type="button"
      >
        <Check size={12} strokeWidth={3} />
      </button>
      <ActionErrorToast message={error} onDismiss={() => setError(null)} />
    </>
  );
}
