import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";
import "@solana/wallet-adapter-react-ui/styles.css";
import { WalletProvider } from "@/components/WalletProvider";
import { Toaster } from "react-hot-toast";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "🗑️ Trash-Tac-Toe | Gorbagana Chain",
  description: "A fun multiplayer tic-tac-toe game on Gorbagana testnet featuring trash cans vs recycling bins!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${robotoMono.variable} antialiased bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950 min-h-screen`}
      >
        <WalletProvider>
          {children}
          <Toaster position="top-right" />
        </WalletProvider>
      </body>
    </html>
  );
}
