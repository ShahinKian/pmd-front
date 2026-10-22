"use client";
import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSession } from "@/hooks/use-session";

function initials(value?: string | null) {
  const words = (value ?? "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "؟";
  return words.slice(0, 2).map((word) => word[0]).join("");
}

const FooterMenu = () => {
  const { data: session } = useSession();
  const name = session?.user.fullName || session?.user.userName || "";

  return (
    <div className="space-y-5 flex flex-col items-center justify-center pb-6">
      <Avatar className="h-9 w-9">
        {session?.user.profilePictureUrl ? (
          <AvatarImage src="/api/auth/profile/picture/view" alt={name} />
        ) : null}
        <AvatarFallback>{initials(name)}</AvatarFallback>
      </Avatar>
    </div>
  );
};

export default FooterMenu;
