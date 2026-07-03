"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

type Props = {
  label: string;
  pendingLabel: string;
};

export default function SubmitButton({ label, pendingLabel }: Props) {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex h-10 whitespace-nowrap items-center gap-2 rounded-md bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? (
        <>
          <LoaderCircle className="animate-spin" size={15} />
          {pendingLabel}
        </>
      ) : (
        label
      )}
    </button>
  );
}
