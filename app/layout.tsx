import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ANJANI AI Sales OS",
  description: "AI-native WhatsApp sales operating dashboard for Anjani Interweave.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
