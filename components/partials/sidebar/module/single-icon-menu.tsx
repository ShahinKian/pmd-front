import React from "react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { translate } from "@/lib/utils";

const SingleIconMenu = ({ index, activeIndex, item, trans }: {
  index: number;
  activeIndex: number | null;
  item: any;
  locationName: string;
  trans: any;
}) => {
  const Icon = item.icon;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              "h-12 w-12 mx-auto rounded-md transition-all duration-300 flex flex-col items-center justify-center cursor-pointer relative",
              {
                "bg-primary/10 dark:bg-primary dark:text-primary-foreground text-primary data-[state=delayed-open]:bg-primary/10":
                  activeIndex === index,
                "text-default-500 dark:text-default-400 data-[state=delayed-open]:bg-primary/10 data-[state=delayed-open]:text-primary":
                  activeIndex !== index,
              },
            )}
          >
            <Icon className="w-6 h-6" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="capitalize">
          {translate(item.title, trans)}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default SingleIconMenu;
