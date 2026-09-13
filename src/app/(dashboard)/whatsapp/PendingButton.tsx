"use client";

import { LoaderCircle } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  pendingLabel: string;
  children: ReactNode;
};

export default function PendingButton({
  pendingLabel,
  children,
  className = "",
  ...props
}: Props) {
  const { pending } = useFormStatus();

  return (
    <button
      {...props}
      type="submit"
      disabled={pending || props.disabled}
      aria-busy={pending}
      className={`pressable ${className}`}
    >
      {pending ? (
        <>
          <LoaderCircle size={16} className="animate-spin" />
          <span>{pendingLabel}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
