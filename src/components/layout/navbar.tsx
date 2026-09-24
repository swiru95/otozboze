import Link from "next/link";

import { MobileRoleBar, RoleTabs } from "@/components/layout/role-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { DEMO_MODE_ENABLED } from "@/lib/auth/demo";
import { getCurrentUser, resolveActiveRole } from "@/lib/auth/session";
import { listDemoUsers } from "@/modules/users/queries";

export async function Navbar() {
  // The navbar sits in the root layout, so it must survive "no session" — an
  // error thrown here would escape every page-level boundary and take the
  // whole shell down with it.
  const user = await getCurrentUser();

  if (!user) {
    return (
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            otoz<span className="text-primary">boze</span>.pl
          </Link>
        </div>
      </header>
    );
  }

  const activeRole = resolveActiveRole(user);
  // The account picker hands out any identity, so it only exists in demo mode.
  const users = DEMO_MODE_ENABLED ? await listDemoUsers() : [];

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight whitespace-nowrap"
          >
            otoz<span className="text-primary">boze</span>.pl
          </Link>

          <RoleTabs roles={user.roles} activeRole={activeRole} />

          <div className="ml-auto">
            <UserMenu
              canSwitchUser={DEMO_MODE_ENABLED}
              users={users}
              currentUserId={user.id}
              currentUserName={user.name}
              currentUserLogo={user.logoUrl}
              currentUserImage={user.image}
            />
          </div>
        </div>
      </header>

      <MobileRoleBar roles={user.roles} activeRole={activeRole} />
    </>
  );
}
