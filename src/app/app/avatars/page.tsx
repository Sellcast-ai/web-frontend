/* eslint-disable @next/next/no-img-element */
"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, UserSquare2, Sparkles, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAvatars, useCreateAvatar, useDeleteAvatar } from "@/lib/api/hooks";
import type { Avatar } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { StaggerItem } from "@/components/ui/motion";
import { Modal } from "@/components/ui/overlay";
import { UploadProgress } from "@/components/ui/upload-progress";
import { useDropzone } from "@/lib/use-dropzone";
import { cn } from "@/lib/utils";

const MAX_UPLOAD_MB = 8;

function readAsBase64(file: File): Promise<{ dataUrl: string; base64: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve({ dataUrl, base64: dataUrl.split(",")[1] ?? "" });
    };
    reader.onerror = () => reject(new Error("Couldn't read the file"));
    reader.readAsDataURL(file);
  });
}

export default function AvatarsPage() {
  const t = useTranslations("app.avatars");
  const { data, isLoading } = useAvatars();
  const avatars = data ?? [];
  const mine = avatars.filter((a) => !a.is_shared);
  const digital = avatars.filter((a) => a.is_shared);

  return (
    <div className="container-page max-w-4xl py-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-bold text-ink">{t("title")}</h1>
        <p className="text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      <UploadCard />

      {/* my avatars */}
      <section className="mt-10">
        <h2 className="text-xs font-bold uppercase tracking-widest text-brand-600">
          {t("yourAvatars")}
        </h2>
        {isLoading ? (
          <div className="mt-4 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
          </div>
        ) : mine.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {t("emptyYourAvatars")}
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {mine.map((a, i) => (
              <StaggerItem key={a.id} index={i}>
                <AvatarCard avatar={a} />
              </StaggerItem>
            ))}
          </div>
        )}
      </section>

      {/* digital characters (BytePlus library) */}
      <section className="mt-10">
        <h2 className="text-xs font-bold uppercase tracking-widest text-brand-600">
          {t("digitalCharacters")}
        </h2>
        {digital.length === 0 ? (
          <div className="mt-3 flex items-start gap-3 rounded-card border border-dashed border-border bg-card p-5">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-brand-500" />
            <p className="text-sm text-muted-foreground">
              {t("digitalComingSoon")}
            </p>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {digital.map((a, i) => (
              <StaggerItem key={a.id} index={i}>
                <AvatarCard avatar={a} />
              </StaggerItem>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function UploadCard() {
  const t = useTranslations("app.avatars.upload");
  const tt = useTranslations("app.toasts");
  const [progress, setProgress] = useState(0);
  const create = useCreateAvatar({ saveError: tt("saveAvatarFailed") }, setProgress);
  const fileInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState<{ dataUrl: string; base64: string; filename: string } | null>(null);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const drop = useDropzone((files) => void pick(files[0]));

  async function pick(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) return setError(t("notImageError"));
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024)
      return setError(t("tooLargeError", { max: MAX_UPLOAD_MB }));
    const { dataUrl, base64 } = await readAsBase64(file);
    setPhoto({ dataUrl, base64, filename: file.name });
    if (!name) setName(file.name.replace(/\.[^.]+$/, ""));
  }

  async function submit() {
    if (!photo || !consent || name.trim().length < 1) return;
    setProgress(0);
    // failure is surfaced as a toast by useCreateAvatar; keep the form filled
    try {
      await create.mutateAsync({
        name: name.trim(),
        filename: photo.filename,
        data_base64: photo.base64,
        consent,
      });
    } catch {
      return;
    }
    setPhoto(null);
    setName("");
    setConsent(false);
  }

  return (
    <div className="mt-6 rounded-card border border-border bg-card p-5 shadow-soft">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {/* photo slot */}
        <button
          type="button"
          {...drop.props}
          onClick={() => fileInput.current?.click()}
          className={cn(
            "relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition-colors",
            drop.over
              ? "border-brand-400 bg-accent/50"
              : photo
                ? "border-brand-400"
                : "border-border hover:border-brand-400",
          )}
        >
          {photo ? (
            <img src={photo.dataUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-1 text-muted-foreground">
              <ImagePlus className="h-6 w-6" />
              <span className="text-xs font-semibold">{t("addPhoto")}</span>
            </span>
          )}
        </button>

        <div className="flex-1 space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("namePlaceholder")}
            className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-brand-300"
          />
          <label className="flex items-start gap-2.5 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-brand-600"
            />
            <span>
              {t("consent")}
            </span>
          </label>
          <div className="flex items-center gap-3">
            <Button
              size="md"
              onClick={submit}
              disabled={!photo || !consent || name.trim().length < 1 || create.isPending}
            >
              {create.isPending ? (
                <UploadProgress progress={progress} />
              ) : (
                <>
                  <UserSquare2 className="h-4 w-4" />
                  {t("saveAvatar")}
                </>
              )}
            </Button>
            {photo && (
              <button
                type="button"
                onClick={() => setPhoto(null)}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-ink"
              >
                <X className="h-3.5 w-3.5" /> {t("clear")}
              </button>
            )}
          </div>
          {error && <p className="text-sm text-rose">{error}</p>}
        </div>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => {
          if (e.target.files?.[0]) void pick(e.target.files[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function AvatarCard({ avatar }: { avatar: Avatar }) {
  const t = useTranslations("app.avatars.card");
  const tt = useTranslations("app.toasts");
  const del = useDeleteAvatar({ deleteError: tt("deleteAvatarFailed") });
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="group relative overflow-hidden rounded-card border border-border bg-card shadow-soft">
      <div className="aspect-square bg-muted">
        {avatar.image_url ? (
          <img src={avatar.image_url} alt={avatar.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <UserSquare2 className="h-8 w-8" />
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 p-3">
        <p className="truncate text-sm font-semibold text-ink">{avatar.name}</p>
        {!avatar.is_shared && (
          <button
            type="button"
            aria-label={t("deleteAvatar")}
            onClick={() => setConfirming(true)}
            disabled={del.isPending}
            className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-rose"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title={t("deleteTitle")}
      >
        <p className="text-sm text-muted-foreground">
          {t("deleteDescription", { name: avatar.name })}
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="outline" size="sm" onClick={() => setConfirming(false)}>
            {t("cancel")}
          </Button>
          <Button
            size="sm"
            className="bg-rose shadow-none hover:bg-rose/90"
            disabled={del.isPending}
            onClick={() =>
              del.mutate(avatar.id, { onSuccess: () => setConfirming(false) })
            }
          >
            {del.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {t("delete")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
