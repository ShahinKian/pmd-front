"use client";
import React from "react";
import { Menu, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/store";
import { useSession } from "@/hooks/use-session";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

function initials(value?: string | null) {
  const words = (value ?? "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "ک";
  return words.slice(0, 2).map((word) => word[0]).join("");
}

const Header = () => {
  const { collapsed, setCollapsed } = useSidebar();
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();

  return (
    <header
      className={cn("z-50 sticky top-0 transition-all duration-150", {
        "ltr:xl:ml-[72px] rtl:xl:mr-[72px]": collapsed,
        "ltr:xl:ml-[300px] rtl:xl:mr-[300px]": !collapsed,
      })}
    >
      <div className="w-full bg-card/90 backdrop-blur-lg md:px-6 px-[15px] py-3 border-b">
        <div className="flex justify-between items-center h-full">
          <div className="flex items-center md:gap-6 gap-3">
            <button type="button" onClick={() => setCollapsed(!collapsed)} className="text-default-600">
              <Menu className="h-5 w-5" />
            </button>
          </div>

          <div className="nav-tools flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="relative md:h-9 md:w-9 h-8 w-8 hover:bg-default-100 dark:hover:bg-default-200 hover:text-primary text-default-500 dark:text-default-800 rounded-full"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              type="button"
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

            <div className="ltr:pl-2 rtl:pr-2 flex items-center gap-2">
              <Avatar className="h-9 w-9">
                {session?.user.profilePictureUrl ? (
                  <AvatarImage src="/api/auth/profile/picture/view" alt={session.user.fullName || session.user.userName} />
                ) : null}
                <AvatarFallback>{initials(session?.user.fullName || session?.user.userName)}</AvatarFallback>
              </Avatar>
              <div className="hidden md:block">
                <div className="text-sm font-medium text-default-800">
                  {session?.user.fullName || session?.user.userName || "کاربر سامانه"}
                </div>
                <div className="text-xs text-default-600">{session?.roleLabels?.[0] ?? ""}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
