import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const breadcrumbItemsVariants = cva(
  "flex gap-1 items-center transition underline-offset-4",
  {
    variants: {
      color: {
        default:
          "text-default-600 hover:text-default-800 data-[state=active]:text-primary aria-[current=page]:text-primary",
        primary:
          "text-primary/80 hover:text-primary/60 data-[state=active]:text-primary aria-[current=page]:text-primary",
        success:
          "text-success/80 hover:text-success/60 data-[state=active]:text-success aria-[current=page]:text-success",
        info:
          "text-info/80 hover:text-info/60 data-[state=active]:text-info aria-[current=page]:text-info",
        warning:
          "text-warning/80 hover:text-warning/60 data-[state=active]:text-warning aria-[current=page]:text-warning",
        destructive:
          "text-destructive/80 hover:text-destructive/60 data-[state=active]:text-destructive aria-[current=page]:text-destructive",
      },
      underline: {
        none: "no-underline",
        hover: "hover:underline",
        always: "underline",
        active: "active:underline",
        focus: "focus:underline",
      },
      size: {
        md: "text-base",
        sm: "text-sm",
        lg: "text-lg",
      },
    },
    defaultVariants: {
      color: "default",
      size: "sm",
      underline: "none",
    },
  },
);

const breadcrumbsVariants = cva("flex flex-wrap list-none max-w-fit", {
  variants: {
    variant: {
      default: "default-style",
      solid: "bg-muted p-3 rounded",
      bordered: "border-2 border-border rounded p-3",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

interface BreadcrumbsProps
  extends React.HTMLAttributes<HTMLOListElement>,
    VariantProps<typeof breadcrumbsVariants> {
  maxItems?: number;
  itemsBeforeCollapse?: number;
  itemsAfterCollapse?: number;
  renderEllipsis?: React.ReactNode;
  separator?: React.ReactNode;
  itemClasses?: string;
  disabled?: boolean;
  variant?: "solid" | "default" | "bordered";
  underline?: "none" | "hover" | "always" | "active" | "focus";
  ellipsisClass?: string;
  size?: "sm" | "md" | "lg";
  color?: "default" | "primary" | "success" | "info" | "warning" | "destructive";
}

const Breadcrumbs = React.forwardRef<HTMLOListElement, BreadcrumbsProps>(
  (
    {
      className,
      children,
      maxItems,
      itemsBeforeCollapse = 1,
      itemsAfterCollapse = 1,
      color,
      size,
      disabled,
      separator = <ChevronRight className="h-4 w-4 rtl:rotate-180" />,
      variant,
      underline,
      renderEllipsis,
      ellipsisClass,
      itemClasses,
      ...props
    },
    ref,
  ) => {
    const breadcrumbItems = React.Children.toArray(children);
    const totalItems = breadcrumbItems.length;

    let visibleItems: React.ReactNode[] = breadcrumbItems;
    if (maxItems && totalItems > maxItems) {
      const visibleBefore = Math.min(itemsBeforeCollapse, totalItems - itemsAfterCollapse);
      const visibleAfter = Math.min(itemsAfterCollapse, totalItems - visibleBefore);
      visibleItems = [
        ...breadcrumbItems.slice(0, visibleBefore),
        null,
        ...breadcrumbItems.slice(totalItems - visibleAfter),
      ];
    }

    return (
      <ol ref={ref} className={cn(breadcrumbsVariants({ variant }), className)} {...props}>
        {visibleItems.map((child, index) => {
          const isLast = index === visibleItems.length - 1;
          const isCurrent = isLast || (child as React.ReactElement<{ iscurrent?: boolean }>)?.props?.iscurrent;

          if (child === null) {
            return (
              <li key={"breadcrumb-ellipsis-" + index} className="flex items-center">
                <div className={cn("flex gap-1 text-default-600 items-center text-base", ellipsisClass)}>
                  {renderEllipsis ?? <MoreHorizontal className="h-4 w-4" />}
                  <span className="separator px-1 self-center">{separator}</span>
                </div>
              </li>
            );
          }

          return React.cloneElement(child as React.ReactElement<any>, {
            ...props,
            islast: isLast,
            iscurrent: isCurrent,
            disabled: disabled && !isLast,
            separator,
            underline,
            size,
            color,
            className: cn(
              breadcrumbItemsVariants({ color, size }),
              (child as React.ReactElement<any>).props.className,
              itemClasses,
            ),
          });
        })}
      </ol>
    );
  },
);

Breadcrumbs.displayName = "Breadcrumbs";

const BreadcrumbItem = React.forwardRef<HTMLSpanElement, any>(
  (
    {
      className,
      children,
      color,
      islast,
      href,
      size,
      disabled,
      underline,
      startContent,
      endContent,
      separator,
      iscurrent,
      ...props
    },
    ref,
  ) => {
    return (
      <li className="inline-flex items-center">
        <span
          ref={ref}
          className={cn(
            breadcrumbItemsVariants({ color, size, underline }),
            className,
            {
              "cursor-pointer": !islast,
              "opacity-50 cursor-not-allowed": disabled && !iscurrent,
            },
          )}
          aria-current={iscurrent ? "page" : undefined}
          data-state={iscurrent ? "active" : undefined}
          {...props}
        >
          {startContent && <span>{startContent}</span>}
          {href ? (
            <Link href={href} prefetch>
              {children}
            </Link>
          ) : (
            children
          )}
          {endContent && <span>{endContent}</span>}
          {!islast && separator ? (
            <span className="separator px-1 cursor-default">{separator}</span>
          ) : null}
        </span>
      </li>
    );
  },
);

BreadcrumbItem.displayName = "BreadcrumbItem";

export { Breadcrumbs, BreadcrumbItem };
