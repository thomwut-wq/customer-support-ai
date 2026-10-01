"use client";
import type { ReactNode } from "react";
import { cn } from "@/lib/format";
import { openChat } from "../chat/chat-widget";

export function OpenChatButton({ message, className, children, ariaLabel }: { message?: string; className?: string; children: ReactNode; ariaLabel?: string }) {
  return (
    <button type="button" aria-label={ariaLabel} onClick={() => openChat(message)} className={cn("cursor-pointer", className)}>
      {children}
    </button>
  );
}
