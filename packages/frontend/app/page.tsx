import Link from "next/link";

/** Landing. Author: Can Sarıhan */
export default function Home() {
  return (
    <div>
      <div className="hero">
        <h1>Income infrastructure for the borderless workforce</h1>
        <p>
          Issue invoices, get paid instantly, and turn your invoices into cash{" "}
          <strong>without waiting 60 days</strong>. Powered by Stellar path
          payments + Soroban — no banks, no SWIFT.
        </p>
      </div>
      <div className="tiles">
        <Link href="/invoice" className="tile">
          <h3>🧾 Freelancer</h3>
          <p>Create invoices, share a payment link, and draw an advance against them.</p>
        </Link>
        <Link href="/cashout" className="tile">
          <h3>🏦 Local cash out</h3>
          <p>Withdraw your USDC to a local bank or mobile money account via a Stellar anchor (SEP-24).</p>
        </Link>
        <Link href="/pool" className="tile">
          <h3>💧 Liquidity Provider</h3>
          <p>Deposit USDC into the pool and earn yield backed by real cash flow.</p>
        </Link>
      </div>
    </div>
  );
}
