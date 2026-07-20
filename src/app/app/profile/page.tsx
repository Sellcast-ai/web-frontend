/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence } from "motion/react";
import { Loader2, Check, LogOut, Clapperboard, Phone, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { PopIn } from "@/components/ui/motion";
import { useCurrentUser, useVideoJobs, useUpdateProfile, useUsage } from "@/lib/api/hooks";
import { api } from "@/lib/api/client";
import { toast } from "@/lib/toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function ProfilePage() {
  const t = useTranslations("app.profile");
  const tt = useTranslations("app.toasts");
  const router = useRouter();
  const qc = useQueryClient();
  const { data: user, isLoading } = useCurrentUser();
  const { data: jobs } = useVideoJobs();
  const { data: usage } = useUsage();
  const update = useUpdateProfile();

  const [nameEdit, setNameEdit] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const name = nameEdit ?? user?.display_name ?? "";

  if (isLoading || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  const completed = jobs?.filter((j) => j.status === "completed").length ?? 0;
  const total = jobs?.length ?? 0;

  async function save() {
    if (!user || name.trim() === user.display_name) return;
    try {
      await update.mutateAsync({ display_name: name.trim() });
    } catch {
      toast.error(tt("saveDisplayNameFailed"));
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function logout() {
    await api.logout().catch(() => undefined);
    qc.clear();
    router.replace("/login");
  }

  const initial = user.display_name?.trim()?.[0]?.toUpperCase() ?? "U";

  return (
    <div className="container-page max-w-3xl py-8">
      <h1 className="font-display text-3xl font-bold text-ink">{t("title")}</h1>

      {/* identity card */}
      <div className="mt-6 flex items-center gap-4 rounded-card border border-border bg-card p-6 shadow-soft">
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt=""
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-gradient text-2xl font-bold text-white">
            {initial}
          </span>
        )}
        <div className="min-w-0">
          <p className="font-display text-xl font-bold text-ink">
            {user.display_name}
          </p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {user.phone_number && (
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />
                {user.phone_number}
              </span>
            )}
            {user.email && (
              <span className="inline-flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                {user.email}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* stats */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <Stat label={t("videosCreated")} value={total} />
        <Stat label={t("readyToPublish")} value={completed} />
      </div>

      {/* monthly quota */}
      {usage && (
        <section className="mt-4 rounded-card border border-border bg-card p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-ink">
                {t("thisMonth")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("usageSummary", {
                  used: usage.used,
                  limit: usage.limit,
                  plan: usage.plan.charAt(0).toUpperCase() + usage.plan.slice(1),
                  date: usage.resets_at.slice(0, 10),
                })}
              </p>
              <p className="text-xs text-muted-foreground/80">
                {t("creditNote")}
              </p>
            </div>
            <span className="font-display text-2xl font-bold text-brand-700">
              {usage.remaining}
              <span className="text-sm font-medium text-muted-foreground">
                {" "}
                {t("creditsLeft")}
              </span>
            </span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="bg-brand-gradient h-full rounded-full"
              style={{
                width: `${usage.limit ? Math.min(100, (usage.used / usage.limit) * 100) : 0}%`,
              }}
            />
          </div>
          {usage.remaining <= 0 && (
            <p className="mt-3 text-sm text-muted-foreground">
              {t("limitHit")}{" "}
              <a href="/pricing" className="font-semibold text-brand-700">
                {t("seePlans")}
              </a>{" "}
              {t("forMore")}
            </p>
          )}
        </section>
      )}

      {/* edit display name */}
      <section className="mt-6 rounded-card border border-border bg-card p-6 shadow-soft">
        <h2 className="font-display text-lg font-semibold text-ink">
          {t("displayName")}
        </h2>
        <div className="mt-3 flex gap-2">
          <input
            value={name}
            onChange={(e) => setNameEdit(e.target.value)}
            className="flex-1 rounded-2xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-brand-300"
          />
          <Button
            size="md"
            onClick={save}
            disabled={update.isPending || name.trim() === user.display_name || !name.trim()}
          >
            <AnimatePresence mode="wait" initial={false}>
              {update.isPending ? (
                <PopIn key="saving" className="inline-flex">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </PopIn>
              ) : saved ? (
                <PopIn key="saved" className="inline-flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  {t("saved")}
                </PopIn>
              ) : (
                <PopIn key="save">{t("save")}</PopIn>
              )}
            </AnimatePresence>
          </Button>
        </div>
      </section>

      {/* connected accounts */}
      {user.identities?.length > 0 && (
        <section className="mt-6 rounded-card border border-border bg-card p-6 shadow-soft">
          <h2 className="font-display text-lg font-semibold text-ink">
            {t("connectedAccounts")}
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {user.identities.map((i) => (
              <Badge key={i.provider} variant="outline" className="capitalize">
                {i.provider}
              </Badge>
            ))}
          </div>
        </section>
      )}

      {/* appearance */}
      <section className="mt-6 flex items-center justify-between rounded-card border border-border bg-card p-6 shadow-soft">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">
            {t("appearance")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("appearanceDescription")}
          </p>
        </div>
        <ThemeToggle />
      </section>

      {/* logout */}
      <button
        type="button"
        onClick={logout}
        className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-rose hover:underline"
      >
        <LogOut className="h-4 w-4" />
        {t("logOut")}
      </button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-card border border-border bg-card p-5 shadow-soft">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clapperboard className="h-4 w-4" />
        {label}
      </p>
      <p className="mt-1 font-display text-3xl font-bold text-brand-700">{value}</p>
    </div>
  );
}
