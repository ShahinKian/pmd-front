import React from "react";
import { cn, isLocationMatch, translate } from "@/lib/utils";
import Link from "next/link";

function NavLink({ childItem, locationName, trans }: {
  childItem: any;
  locationName: string;
  trans: any;
}) {
  const { href, icon, title } = childItem;
  const Icon = icon;
  return (
    <Link
      href={href}
      prefetch
      className={cn(
        "flex font-medium text-sm capitalize px-[10px] py-3 gap-3 rounded-md cursor-pointer",
        {
          "bg-primary text-primary-foreground": isLocationMatch(href, locationName),
          "text-default-600": !isLocationMatch(href, locationName),
        },
      )}
    >
      {Icon ? (
        <span className="inline-flex items-center flex-grow-0">
          <Icon className="h-5 w-5" />
        </span>
      ) : null}
      <div className="flex-grow truncate">{translate(title, trans)}</div>
    </Link>
  );
}

const MenuItem = ({ childItem, locationName, trans }: {
  childItem: any;
  locationName: string;
  trans: any;
}) => (
  <div className="flex-1">
    <NavLink childItem={childItem} locationName={locationName} trans={trans} />
  </div>
);

export default MenuItem;
