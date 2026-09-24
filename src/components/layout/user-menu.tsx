"use client";

import { ChevronDown } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import type { UserRole } from "@/generated/prisma/enums";
import { ROLE_TEXT } from "@/components/layout/role-meta";
import { BrandAvatar } from "@/modules/images/components/brand-avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_LABELS } from "@/lib/format";
import { switchDemoUser } from "@/modules/users/actions/switch-session";

type Props = {
  users: Array<{ id: string; name: string | null; roles: UserRole[] }>;
  currentUserId: string;
  currentUserName: string | null;
  currentUserLogo: string | null;
  currentUserImage: string | null;
  /** False outside demo mode, where becoming another account is not a feature. */
  canSwitchUser: boolean;
};

/** Demo-only account picker. The label is a first name, not the full one. */
export function UserMenu({
  users,
  currentUserId,
  currentUserName,
  currentUserLogo,
  currentUserImage,
  canSwitchUser,
}: Props) {
  const [pending, startTransition] = useTransition();
  const firstName = currentUserName?.split(" ")[0] ?? "Konto";

  if (!canSwitchUser) {
    return (
      <span className="flex items-center gap-2 text-sm font-medium">
        <BrandAvatar
          logoUrl={currentUserLogo}
          image={currentUserImage}
          name={currentUserName}
          size="sm"
        />
        <span className="max-w-32 truncate">{firstName}</span>
      </span>
    );
  }

  const onSelectUser = (id: string) =>
    startTransition(async () => {
      await switchDemoUser(id);
      toast.success("Przełączono konto");
    });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={pending}>
          <BrandAvatar
            logoUrl={currentUserLogo}
            image={currentUserImage}
            name={currentUserName}
            size="sm"
          />
          <span className="max-w-24 truncate">{firstName}</span>
          <ChevronDown className="size-4 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Konto demo (bez logowania)</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {users.map((user) => (
          <DropdownMenuItem
            key={user.id}
            onSelect={() => onSelectUser(user.id)}
            className="flex flex-col items-start gap-0.5 py-2"
          >
            <span className={user.id === currentUserId ? "font-semibold" : ""}>
              {user.name}
            </span>
            <span className="flex gap-1.5 text-xs">
              {user.roles.length === 0 && (
                <span className="text-muted-foreground">brak ról</span>
              )}
              {user.roles.map((role) => (
                <span key={role} className={ROLE_TEXT[role]}>
                  {ROLE_LABELS[role]}
                </span>
              ))}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
