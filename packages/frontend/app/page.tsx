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
        <Link href="/pool" className="tile">
          <h3>💧 Likidite Sağlayıcı</h3>
          <p>Havuza USDC yatır, gerçek nakit-akışı destekli yield kazan.</p>
        </Link>
        <Link href="/invoice" className="tile">
          <h3>⚡ Nasıl çalışır</h3>
          <p>
            Invoice → path-payment settlement → tokenize → anında avans → otomatik
            kapanış.
          </p>
        </Link>
      </div>
    </div>
  );
}
