import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { WalletBar } from "./components/WalletBar";

/** AnchorFlow root layout. Author: Can Sarıhan */
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
    <html lang="en">
      <body>
        <nav className="nav">
          <Link href="/" className="brand">
            Anchor<span>Flow</span>
          </Link>
          <div className="nav-links">
            <Link href="/invoice">Invoices</Link>
            <Link href="/payroll">Payroll</Link>
            <Link href="/cashout">Cash Out</Link>
            <Link href="/pool">Liquidity</Link>
          </div>
          <div className="nav-spacer" />
          <WalletBar />
        </nav>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
