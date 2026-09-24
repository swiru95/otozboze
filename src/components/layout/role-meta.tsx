import {
  LayoutDashboard,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Wheat,
  type LucideIcon,
} from "lucide-react";

import type { UserRole } from "@/generated/prisma/enums";

export const ROLE_ICON: Record<UserRole, LucideIcon> = {
  FARMER: Wheat,
  BUYER: ShoppingCart,
  TRANSPORT: Truck,
  ADMIN: ShieldCheck,
};

export const DashboardIcon = LayoutDashboard;

/** Foreground tint — used for the icon of an inactive tab. */
export const ROLE_TEXT: Record<UserRole, string> = {
  FARMER: "text-role-farmer",
  BUYER: "text-role-buyer",
  TRANSPORT: "text-role-transport",
  ADMIN: "text-role-admin",
};

/**
 * Solid fill for the active tab. `text-background` rather than `text-white`,
 * because the role colours invert in dark mode.
 */
export const ROLE_SOLID: Record<UserRole, string> = {
  FARMER: "bg-role-farmer text-background",
  BUYER: "bg-role-buyer text-background",
  TRANSPORT: "bg-role-transport text-background",
  ADMIN: "bg-role-admin text-background",
};

/** Tinted surface for section headers and chips. */
export const ROLE_SOFT: Record<UserRole, string> = {
  FARMER: "bg-role-farmer/10 text-role-farmer",
  BUYER: "bg-role-buyer/10 text-role-buyer",
  TRANSPORT: "bg-role-transport/10 text-role-transport",
  ADMIN: "bg-role-admin/10 text-role-admin",
};
