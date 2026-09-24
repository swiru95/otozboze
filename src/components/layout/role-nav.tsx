"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import type { UserRole } from "@/generated/prisma/enums";
import {
  DashboardIcon,
  ROLE_ICON,
  ROLE_SOLID,
  ROLE_TEXT,
} from "@/components/layout/role-meta";
import { ROLE_HOME, ROLE_LABELS } from "@/lib/format";
import { switchActiveRole } from "@/modules/users/actions/switch-session";

/**
 * One control instead of two: picking a role both changes the session's
 * `activeRole` and navigates to that role's section. The old UI listed every
 * role twice — once as a link, once as a switcher — which overflowed the bar
 * below ~880px and read as two unrelated things.
 */
function useRoleNav(activeRole: UserRole | null) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const go = (role: UserRole) =>
    startTransition(async () => {
      try {
        if (role !== activeRole) await switchActiveRole(role);
        router.push(ROLE_HOME[role]);
      } catch {
        toast.error("Nie udało się zmienić roli");
      }
    });

  return { go, pending };
}

export function RoleTabs({
  roles,
  activeRole,
}: {
  roles: UserRole[];
  activeRole: UserRole | null;
}) {
  const pathname = usePathname();
  const { go, pending } = useRoleNav(activeRole);

  return (
    <nav className="hidden items-center gap-1 md:flex">
      <Link
        href="/"
        className={`flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors hover:bg-muted ${
          pathname === "/" ? "bg-muted text-foreground" : "text-muted-foreground"
        }`}
      >
        <DashboardIcon className="size-4" />
        Pulpit
      </Link>

      {roles.map((role) => {
        const Icon = ROLE_ICON[role];
        const current = pathname === ROLE_HOME[role];
        return (
          <button
            key={role}
            type="button"
            disabled={pending}
            onClick={() => go(role)}
            aria-current={current ? "page" : undefined}
            className={`flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors disabled:opacity-60 ${
              current
                ? ROLE_SOLID[role]
                : `text-muted-foreground hover:bg-muted ${ROLE_TEXT[role]}/80`
            }`}
          >
            <Icon className="size-4" />
            {ROLE_LABELS[role]}
          </button>
        );
      })}
    </nav>
  );
}

/** Thumb-reachable navigation. Phones are the primary device here. */
export function MobileRoleBar({
  roles,
  activeRole,
}: {
  roles: UserRole[];
  activeRole: UserRole | null;
}) {
  const pathname = usePathname();
  const { go, pending } = useRoleNav(activeRole);

  return (
    <nav
      aria-label="Nawigacja"
      className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <div className="flex">
        <Link
          href="/"
          className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[0.7rem] font-medium ${
            pathname === "/" ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          <DashboardIcon className="size-6" />
          Pulpit
        </Link>

        {roles.map((role) => {
          const Icon = ROLE_ICON[role];
          const current = pathname === ROLE_HOME[role];
          return (
            <button
              key={role}
              type="button"
              disabled={pending}
              onClick={() => go(role)}
              aria-current={current ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[0.7rem] font-medium disabled:opacity-60 ${
                current ? ROLE_TEXT[role] : "text-muted-foreground"
              }`}
            >
              <Icon className="size-6" />
              {ROLE_LABELS[role]}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
