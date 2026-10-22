"use client";
import { User, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSession } from "@/hooks/use-session";
import { apiClient } from "@/lib/http/client";
import { useRouter } from "next/navigation";

function initials(value?: string | null) {
  const words = (value ?? "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "؟";
  return words.slice(0, 2).map((word) => word[0]).join("");
}

const ProfileInfo = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const name = session?.user.fullName || session?.user.userName || "";

  async function logout() {
    await apiClient.post("/auth/logout");
    router.replace("/login");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild className="cursor-pointer">
        <div className="flex items-center">
          <Avatar className="h-9 w-9">
            {session?.user.profilePictureUrl ? (
              <AvatarImage src="/api/auth/profile/picture/view" alt={name} />
            ) : null}
            <AvatarFallback>{initials(name)}</AvatarFallback>
          </Avatar>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 p-0" align="end">
        <DropdownMenuLabel className="flex gap-2 items-center mb-1 p-3">
          <div>
            <div className="text-sm font-medium text-default-800">{name}</div>
            <div className="text-xs text-default-600" dir="ltr">@{session?.user.userName}</div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem className="flex items-center gap-2 text-sm font-medium text-default-600 px-3 py-1.5">
            <User className="w-4 h-4" />
            پروفایل من
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="mb-0 dark:bg-background" />
        <DropdownMenuItem
          onSelect={logout}
          className="flex items-center gap-2 text-sm font-medium text-default-600 my-1 px-3 dark:hover:bg-background cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          خروج
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProfileInfo;
