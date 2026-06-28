import Link from "next/link";

/** Landing. Author: Can Sarıhan */
export default function Home() {
  return (
    <div>
      <div className="hero">
        <h1>Sınırsız iş gücünün gelir altyapısı</h1>
        <p>
          Fatura kes, anında öde al, ve faturanı <strong>60 gün beklemeden</strong>{" "}
          nakde çevir. Stellar path payments + Soroban ile, banka ve SWIFT olmadan.
        </p>
      </div>
      <div className="tiles">
        <Link href="/invoice" className="tile">
          <h3>🧾 Freelancer</h3>
          <p>Fatura oluştur, ödeme link'i paylaş, faturana karşı avans çek.</p>
        </Link>
        <Link href="/cashout" className="tile">
          <h3>🏦 Yerel nakde çevir</h3>
          <p>Stellar anchor (SEP-24) ile USDC'ni yerel banka/mobil paraya çek.</p>
        </Link>
        <Link href="/pool" className="tile">
          <h3>💧 Likidite Sağlayıcı</h3>
          <p>Havuza USDC yatır, gerçek nakit-akışı destekli yield kazan.</p>
        </Link>
      </div>
    </div>
  );
}
