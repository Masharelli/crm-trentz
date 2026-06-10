"use client";

import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Funnel, GripVertical, Pencil, X } from "lucide-react";
import Link from "next/link";
import { useOptimistic, useRef, useState, useTransition } from "react";
import { moverClienteDeEtapa, quitarClienteDeFunnel } from "../actions";
import { statusClass, statusLabel } from "../status";

type Stage = {
  id: string;
  name: string;
  position: number;
};

type Member = {
  id: string;
  stageId: string;
  client: {
    id: string;
    display_name: string;
    status: string;
    primary_email: string | null;
  };
};

type BoardAction =
  | { type: "move"; memberId: string; stageId: string }
  | { type: "remove"; memberId: string };

type Props = {
  funnelId: string;
  stages: Stage[];
  members: Member[];
};

function MemberCard({
  member,
  onRemove,
  overlay = false,
}: {
  member: Member;
  onRemove?: () => void;
  overlay?: boolean;
}) {
  const { attributes, isDragging, listeners, setNodeRef } = useDraggable({
    id: member.id,
    disabled: overlay,
  });

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      {...(overlay ? {} : attributes)}
      {...(overlay ? {} : listeners)}
      data-member-card=""
      className={`group rounded-lg border border-zinc-200 bg-white p-3 shadow-sm ${
        overlay
          ? "rotate-2 cursor-grabbing shadow-lg"
          : isDragging
            ? "opacity-40"
            : "cursor-grab touch-none hover:border-zinc-300"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <GripVertical
            size={14}
            className="mt-0.5 shrink-0 text-zinc-300"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-950">
              {member.client.display_name}
            </p>
            {member.client.primary_email ? (
              <p className="mt-0.5 truncate text-xs text-zinc-500">
                {member.client.primary_email}
              </p>
            ) : null}
          </div>
        </div>
        {onRemove ? (
          <button
            aria-label={`Quitar ${member.client.display_name} del funnel`}
            className="grid size-6 shrink-0 place-items-center rounded-md text-zinc-300 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            type="button"
          >
            <X size={13} />
          </button>
        ) : null}
      </div>
      <span
        className={`mt-2.5 inline-flex h-6 items-center rounded-md px-2 text-xs font-semibold ring-1 ${statusClass[member.client.status] ?? statusClass.prospect}`}
      >
        {statusLabel[member.client.status] ?? member.client.status}
      </span>
    </div>
  );
}

function StageColumn({
  stage,
  members,
  onRemove,
}: {
  stage: Stage;
  members: Member[];
  onRemove: (member: Member) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: stage.id });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col rounded-xl border bg-zinc-50 transition ${
        isOver ? "border-zinc-400 ring-2 ring-zinc-200" : "border-zinc-200"
      }`}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <p className="truncate text-sm font-semibold text-zinc-950">
          {stage.name}
        </p>
        <span className="grid size-6 shrink-0 place-items-center rounded-md bg-zinc-200/70 text-xs font-semibold text-zinc-600">
          {members.length}
        </span>
      </div>
      <div className="flex min-h-32 flex-1 flex-col gap-2 px-3 pb-3">
        {members.map((member) => (
          <MemberCard
            key={member.id}
            member={member}
            onRemove={() => onRemove(member)}
          />
        ))}
        {members.length === 0 ? (
          <div className="grid flex-1 place-items-center rounded-lg border border-dashed border-zinc-200 px-3 py-6">
            <p className="text-center text-xs text-zinc-400">
              Arrastra clientes aqui
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function FunnelBoard({ funnelId, stages, members }: Props) {
  const [optimisticMembers, applyAction] = useOptimistic(
    members,
    (state: Member[], action: BoardAction) => {
      if (action.type === "move") {
        return state.map((m) =>
          m.id === action.memberId ? { ...m, stageId: action.stageId } : m,
        );
      }
      return state.filter((m) => m.id !== action.memberId);
    },
  );
  const [activeMember, setActiveMember] = useState<Member | null>(null);
  const [, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);
  const pan = useRef<{
    pointerId: number;
    startX: number;
    startScroll: number;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  function handleDragStart(event: DragStartEvent) {
    const member = optimisticMembers.find((m) => m.id === event.active.id);
    setActiveMember(member ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveMember(null);

    if (!over) return;

    const memberId = String(active.id);
    const stageId = String(over.id);
    const member = optimisticMembers.find((m) => m.id === memberId);

    if (!member || member.stageId === stageId) return;

    startTransition(async () => {
      applyAction({ type: "move", memberId, stageId });
      await moverClienteDeEtapa(funnelId, memberId, stageId);
    });
  }

  // Deslizar el tablero arrastrando cualquier zona que no sea una tarjeta o un control.
  function handlePanStart(event: React.PointerEvent<HTMLDivElement>) {
    const el = scrollRef.current;
    if (!el || event.button !== 0) return;

    const target = event.target as HTMLElement;
    if (target.closest("[data-member-card], button, a, input, select")) return;

    pan.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScroll: el.scrollLeft,
    };
    el.setPointerCapture(event.pointerId);
  }

  function handlePanMove(event: React.PointerEvent<HTMLDivElement>) {
    const el = scrollRef.current;
    if (!el || !pan.current || pan.current.pointerId !== event.pointerId) {
      return;
    }
    el.scrollLeft = pan.current.startScroll - (event.clientX - pan.current.startX);
  }

  function handlePanEnd(event: React.PointerEvent<HTMLDivElement>) {
    if (pan.current?.pointerId === event.pointerId) {
      pan.current = null;
    }
  }

  function handleRemove(member: Member) {
    if (
      !window.confirm(
        `¿Quitar a "${member.client.display_name}" de este funnel?`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      applyAction({ type: "remove", memberId: member.id });
      await quitarClienteDeFunnel(funnelId, member.id);
    });
  }

  if (stages.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white">
        <div className="flex flex-col items-center gap-3 px-5 py-16 text-center">
          <div className="grid size-12 place-items-center rounded-full bg-zinc-100 text-zinc-400">
            <Funnel size={22} />
          </div>
          <p className="text-sm font-medium text-zinc-700">
            Este funnel no tiene etapas
          </p>
          <p className="text-sm text-zinc-500">
            Agrega etapas para empezar a organizar a tus clientes.
          </p>
          <Link
            href={`/funnels/${funnelId}/editar`}
            className="mt-2 inline-flex h-10 items-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            <Pencil size={15} />
            Editar funnel
          </Link>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      onDragEnd={handleDragEnd}
      onDragStart={handleDragStart}
      sensors={sensors}
    >
      <div
        ref={scrollRef}
        onPointerDown={handlePanStart}
        onPointerMove={handlePanMove}
        onPointerUp={handlePanEnd}
        onPointerCancel={handlePanEnd}
        className="board-scroll flex cursor-grab select-none items-start gap-4 overflow-x-auto pb-4 active:cursor-grabbing"
      >
        {stages.map((stage) => (
          <StageColumn
            key={stage.id}
            stage={stage}
            members={optimisticMembers.filter((m) => m.stageId === stage.id)}
            onRemove={handleRemove}
          />
        ))}
      </div>
      <DragOverlay>
        {activeMember ? <MemberCard member={activeMember} overlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}
