import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const isLocationMatch = (targetLocation: string, locationName: string): boolean =>
  locationName === targetLocation || locationName.startsWith(`${targetLocation}/`);

export function getDynamicPath(pathname: string): string {
  const prefixes = ["fa", "en", "bn", "ar"];
  for (const prefix of prefixes) {
    if (pathname.startsWith(`/${prefix}/`)) {
      return `/${pathname.slice(prefix.length + 2)}`;
    }
  }
  return pathname;
}

interface Translations {
  [key: string]: string;
}

export const translate = (title: string, trans: Translations): string => {
  const lowercaseTitle = title.toLowerCase();
  return trans?.hasOwnProperty(lowercaseTitle) ? trans[lowercaseTitle] : title;
};
