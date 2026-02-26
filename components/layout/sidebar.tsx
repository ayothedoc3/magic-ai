"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, ADMIN_NAV_ITEMS, APP_NAME } from "@/lib/constants";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  MessageSquare,
  Wand2,
  Image,
  Video,
  FileText,
  Settings,
  BarChart3,
  Users,
  CreditCard,
  Layout,
  Settings2,
  Sparkles,
  Bot,
  Activity,
  Menu,
} from "lucide-react";
import { useState } from "react";

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  MessageSquare,
  Wand2,
  Image,
  Video,
  FileText,
  Settings,
  BarChart3,
  Users,
  CreditCard,
  Layout,
  Settings2,
  Sparkles,
  Bot,
  Activity,
};

interface SidebarProps {
  userRole: string;
}

function SidebarContent({ userRole, onNavigate }: { userRole: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const isAdmin = userRole === "ADMIN";

  return (
    <ScrollArea className="h-full">
      <nav className="space-y-1 p-3">
        {NAV_ITEMS.map((item) => {
          const Icon = iconMap[item.icon];
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {Icon && <Icon className="h-4 w-4" />}
              {item.title}
            </Link>
          );
        })}
      </nav>
      {isAdmin && (
        <>
          <Separator className="mx-3" />
          <div className="px-3 py-2">
            <p className="mb-1 px-3 text-xs font-semibold uppercase text-muted-foreground">
              Admin
            </p>
            <nav className="space-y-1">
              {ADMIN_NAV_ITEMS.map((item) => {
                const Icon = iconMap[item.icon];
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {Icon && <Icon className="h-4 w-4" />}
                    {item.title}
                  </Link>
                );
              })}
            </nav>
          </div>
        </>
      )}
    </ScrollArea>
  );
}

export function Sidebar({ userRole }: SidebarProps) {
  return (
    <aside className="hidden w-64 border-r bg-card lg:block">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold">
          <Sparkles className="h-5 w-5 text-primary" />
          {APP_NAME}
        </Link>
      </div>
      <div className="h-[calc(100vh-3.5rem)]">
        <SidebarContent userRole={userRole} />
      </div>
    </aside>
  );
}

export function MobileSidebar({ userRole }: SidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <div className="flex h-14 items-center border-b px-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-bold"
            onClick={() => setOpen(false)}
          >
            <Sparkles className="h-5 w-5 text-primary" />
            {APP_NAME}
          </Link>
        </div>
        <SidebarContent userRole={userRole} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
