"use client";
import React from "react";
import { DirectionProvider as RadixDirectionProvider } from "@radix-ui/react-direction";

const DirectionProvider = ({ children }: { children: React.ReactNode; lang?: string }) => {
  return (
    <div dir="rtl">
      <RadixDirectionProvider dir="rtl">{children}</RadixDirectionProvider>
    </div>
  );
};

export default DirectionProvider;
