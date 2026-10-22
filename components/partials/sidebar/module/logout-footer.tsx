"use client";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/http/client";
import { useSession } from "@/hooks/use-session";

const LogoutFooter = () => {
  const router = useRouter();
  const { data: session } = useSession();

  async function logout() {
    await apiClient.post("/auth/logout");
    router.replace("/login");
  }

  return (
    <div className="bg-default-50 dark:bg-default-200 items-center flex gap-3 px-4 py-2 mt-5">
      <div className="flex-1 min-w-0">
        <div className="text-default-700 font-semibold text-sm capitalize mb-0.5 truncate">
          {session?.user.fullName || session?.user.userName || "کاربر سامانه"}
        </div>
        <div className="text-xs text-default-600 truncate">
          {session?.roleLabels?.join("، ") ?? ""}
        </div>
      </div>
      <div className="flex-none">
        <button
          type="button"
          onClick={logout}
          className="text-default-500 inline-flex h-9 w-9 rounded items-center dark:bg-default-300 justify-center dark:text-default-900"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default LogoutFooter;
