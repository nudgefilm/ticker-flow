"use client";

import { IconBrandTelegram } from "@tabler/icons-react";

const TELEGRAM_CHANNEL_URL = "https://t.me/+c2UG4CGmAy1jMWQ9";

export default function TelegramFloatButton() {
  return (
    <a
      href={TELEGRAM_CHANNEL_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="텔레그램 채널 가입"
      className="fixed bottom-[4.5rem] right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm transition-colors hover:bg-white/20"
    >
      <IconBrandTelegram size={18} stroke={1.5} className="text-white" />
    </a>
  );
}
