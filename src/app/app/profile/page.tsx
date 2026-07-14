/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Check, LogOut, Clapperboard, Phone, Mail } from "lucide-react";
import { useCurrentUser, useVideoJobs, useUpdateProfile, useUsage } from "@/lib/api/hooks";
import { api } from "@/lib/api/client";
import { toast } from "@/lib/toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function ProfilePage() {
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
      toast.error("Couldn't save your display name. Please try again.");
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
      <h1 className="font-display text-3xl font-bold text-ink">Profile</h1>

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
        <Stat label="Videos created" value={total} />
        <Stat label="Ready to publish" value={completed} />
      </div>

      {/* monthly quota */}
      {usage && (
        <section className="mt-4 rounded-card border border-border bg-card p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-ink">
                This month
              </h2>
              <p className="text-sm text-muted-foreground">
                {usage.used} of {usage.limit} credits used ·{" "}
                <span className="capitalize">{usage.plan}</span> plan · resets{" "}
                {usage.resets_at.slice(0, 10)}
              </p>
              <p className="text-xs text-muted-foreground/80">
                1 credit = 1 second of video
              </p>
            </div>
            <span className="font-display text-2xl font-bold text-brand-700">
              {usage.remaining}
              <span className="text-sm font-medium text-muted-foreground"> left</span>
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
              You&apos;ve hit your monthly limit.{" "}
              <a href="/pricing" className="font-semibold text-brand-700">
                See plans
              </a>{" "}
              for more.
            </p>
          )}
        </section>
      )}

      {/* edit display name */}
      <section className="mt-6 rounded-card border border-border bg-card p-6 shadow-soft">
        <h2 className="font-display text-lg font-semibold text-ink">Display name</h2>
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
            {update.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <>
                <Check className="h-4 w-4" />
                Saved
              </>
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </section>

      {/* connected accounts */}
      {user.identities?.length > 0 && (
        <section className="mt-6 rounded-card border border-border bg-card p-6 shadow-soft">
          <h2 className="font-display text-lg font-semibold text-ink">
            Connected accounts
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
          <h2 className="font-display text-lg font-semibold text-ink">Appearance</h2>
          <p className="text-sm text-muted-foreground">
            System, light, or dark — matches the Lumi app.
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
        Log out
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
