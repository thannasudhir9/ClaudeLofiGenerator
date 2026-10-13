import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lofi Studio — AI Lofi Video & Beat Generator",
  description: "Craft atmospheric lofi beats, aesthetic anime & pixar video loops, and story slides with synthesized Rhodes chords, analog tape flutter, and instant YouTube & Instagram export.",
  keywords: ["lofi generator", "lofi beats", "ai video maker", "chillhop", "lofi music", "youtube lofi", "instagram reels lofi"],
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: "#0a0814",
};

const themeScript = `try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
