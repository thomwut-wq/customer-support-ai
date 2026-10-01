import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Thai } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const notoThai = Noto_Sans_Thai({ variable: "--font-noto-thai", subsets: ["thai"], weight: ["300", "400", "500", "600", "700"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Customer Support AI — ผู้ช่วยตอบคำถามลูกค้าอัจฉริยะ", template: "%s · Customer Support AI" },
  description: "ศูนย์ช่วยเหลือลูกค้าด้วย AI แชตบอทตอบคำถามทันทีจากฐานความรู้ของบริษัท ตลอด 24 ชั่วโมง",
};

export const viewport: Viewport = { themeColor: "#4f46e5" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" className={`${inter.variable} ${notoThai.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        {children}
        <Toaster position="top-right" richColors closeButton toastOptions={{ className: "font-sans" }} />
      </body>
    </html>
  );
}
