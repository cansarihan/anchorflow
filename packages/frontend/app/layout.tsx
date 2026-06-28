import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { WalletBar } from "./components/WalletBar";

/** AnchorFlow kök layout. Author: Can Sarıhan */
export const metadata: Metadata = {
  title: "AnchorFlow",
  description: "Income infrastructure for the borderless workforce — on Stellar.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>
        <nav className="nav">
          <Link href="/" className="brand">
            Anchor<span>Flow</span>
          </Link>
          <div className="nav-links">
            <Link href="/invoice">Faturalar</Link>
            <Link href="/payroll">Maaş Akışı</Link>
            <Link href="/cashout">Nakde Çevir</Link>
            <Link href="/pool">Likidite</Link>
          </div>
          <div className="nav-spacer" />
          <WalletBar />
        </nav>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
