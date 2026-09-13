"use client";

import { Clock, ImagePlus, LoaderCircle, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { WINDOW_MS } from "@/lib/whatsapp/phone";
import type { WhatsAppTemplate } from "@/lib/whatsapp/client";
import { enviarImagen, enviarMensaje } from "./actions";
import TemplateComposer from "./TemplateComposer";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function SendButton({ sendingImage }: { sendingImage: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="pressable inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-emerald-600 px-3.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
      aria-label={
        pending
          ? sendingImage
            ? "Enviando imagen"
            : "Enviando mensaje"
          : sendingImage
            ? "Enviar imagen"
            : "Enviar mensaje"
      }
      aria-busy={pending}
    >
      {pending ? (
        <LoaderCircle size={18} className="animate-spin" />
      ) : (
        <Send size={18} />
      )}
      <span className="hidden sm:inline">{pending ? "Enviando" : "Enviar"}</span>
    </button>
  );
}

export default function Composer({
  conversationId,
  lastInboundAt,
  templates,
}: {
  conversationId: string;
  lastInboundAt: string | null;
  templates: WhatsAppTemplate[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [windowOpen, setWindowOpen] = useState<boolean | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function clearImage() {
    setSelectedFile(null);
    setPreviewUrl(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function selectImage(file: File | undefined) {
    if (!file) return;

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      clearImage();
      setFileError("Selecciona una imagen JPG o PNG.");
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      clearImage();
      setFileError("La imagen debe pesar 5 MB o menos.");
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setFileError(null);
  }

  useEffect(() => {
    let expiryTimeout: number | null = null;
    const initialTimeout = window.setTimeout(() => {
      if (!lastInboundAt) {
        setWindowOpen(false);
        return;
      }

      const expiresAt = new Date(lastInboundAt).getTime() + WINDOW_MS;
      const remaining = expiresAt - Date.now();
      setWindowOpen(remaining > 0);

      if (remaining > 0) {
        expiryTimeout = window.setTimeout(() => setWindowOpen(false), remaining);
      }
    }, 0);

    return () => {
      window.clearTimeout(initialTimeout);
      if (expiryTimeout !== null) window.clearTimeout(expiryTimeout);
    };
  }, [lastInboundAt]);

  if (windowOpen === null) {
    return (
      <div className="flex items-center gap-2 border-t border-zinc-100 bg-zinc-50 px-4 py-4 text-sm text-zinc-500 sm:px-6">
        <LoaderCircle size={16} className="animate-spin" />
        Verificando disponibilidad para responder...
      </div>
    );
  }

  if (!windowOpen) {
    return (
      <div className="border-t border-zinc-100 bg-amber-50 px-4 py-3 sm:px-6">
        <p className="flex items-start gap-2 text-sm text-amber-800">
          <Clock size={15} className="shrink-0" />
          <span>
            {lastInboundAt
              ? "La ventana de 24 horas expiro. Puedes enviar una plantilla aprobada para retomar el contacto."
              : "El cliente aun no ha escrito. Puedes iniciar el contacto con una plantilla aprobada."}
          </span>
        </p>
        <TemplateComposer conversationId={conversationId} templates={templates} />
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={selectedFile ? enviarImagen : enviarMensaje}
      className="grid gap-2 border-t border-zinc-100 bg-zinc-50 px-4 py-3 sm:px-6"
    >
      <input type="hidden" name="conversation_id" value={conversationId} />
      <input
        ref={fileInputRef}
        type="file"
        name="image"
        accept="image/jpeg,image/png"
        className="sr-only"
        onChange={(event) => selectImage(event.target.files?.[0])}
      />

      {selectedFile && previewUrl ? (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Vista previa de la imagen seleccionada"
            className="size-14 shrink-0 rounded-md bg-white object-contain ring-1 ring-emerald-200"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-zinc-800">
              {selectedFile.name}
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              {(selectedFile.size / 1024 / 1024).toFixed(1)} MB · JPG o PNG
            </p>
          </div>
          <button
            type="button"
            onClick={clearImage}
            className="pressable grid size-8 shrink-0 place-items-center rounded-md text-zinc-500 hover:bg-white hover:text-zinc-800"
            aria-label="Quitar imagen"
          >
            <X size={17} />
          </button>
        </div>
      ) : null}

      {fileError ? (
        <p role="alert" className="text-xs font-medium text-rose-600">
          {fileError}
        </p>
      ) : null}

      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={`pressable grid size-11 shrink-0 place-items-center rounded-md border text-zinc-600 shadow-sm transition hover:text-emerald-700 ${
            selectedFile
              ? "border-emerald-300 bg-emerald-50 text-emerald-700"
              : "border-zinc-200 bg-white hover:border-emerald-300 hover:bg-emerald-50"
          }`}
          aria-label={selectedFile ? "Cambiar imagen" : "Adjuntar imagen"}
          title={selectedFile ? "Cambiar imagen" : "Adjuntar imagen"}
        >
          <ImagePlus size={19} />
        </button>
        <textarea
          name="body"
          rows={1}
          required={!selectedFile}
          maxLength={selectedFile ? 1024 : 4096}
          placeholder={
            selectedFile ? "Agrega un mensaje (opcional)" : "Escribe un mensaje"
          }
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              formRef.current?.requestSubmit();
            }
          }}
          className="max-h-32 min-h-11 flex-1 resize-y rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />
        <SendButton sendingImage={Boolean(selectedFile)} />
      </div>
    </form>
  );
}
