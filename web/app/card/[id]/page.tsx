import { headers } from "next/headers";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import deployment from "@/lib/deployment.json";
import { PrintButton } from "./print";

export const dynamic = "force-dynamic";
export const metadata = { title: "Demo passport card · Halte" };

/**
 * A printable card for the counter. Its QR is built here from the clean public check URL,
 * never from the holder's address bar (which can carry the #k= control key).
 */
export default async function Card({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ offer?: string }> }) {
  const { id: raw } = await params;
  const { offer } = await searchParams;
  if (!/^0x[0-9a-fA-F]{64}$/.test(raw)) notFound();
  const id = raw.toLowerCase();
  const offerNo = offer && /^\d{1,12}$/.test(offer) ? offer : null;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "halte-roan.vercel.app";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const url = `${proto}://${host}/check/${id}${offerNo ? `?offer=${offerNo}` : ""}`;
  const qr = await QRCode.toString(url, { type: "svg", errorCorrectionLevel: "M", margin: 0, color: { dark: "#18233F", light: "#0000" } });
  const no = `HLT-${id.slice(2, 6)}-${id.slice(6, 10)}`.toUpperCase();
  const ref = `H-${id.slice(10, 14)}.${id.slice(14, 16)}`.toUpperCase();

  return (
    <main className="card-page">
      <article className="pcard" data-demo="passport-card">
        <header>
          <span className="mono">Demo passport card · not a real watch</span>
          <b>Halte</b>
        </header>
        <div className="pcard-body">
          <div className="pcard-qr" aria-label={`QR code for ${url}`} dangerouslySetInnerHTML={{ __html: qr }} />
          <dl>
            <div><dt className="mono">Passport</dt><dd>{no}</dd></div>
            <div><dt className="mono">Demo watch</dt><dd>Ref. {ref} · steel, 39 mm</dd></div>
            {offerNo && <div><dt className="mono">Offer</dt><dd>#{offerNo}</dd></div>}
            <div><dt className="mono">Contract</dt><dd>{deployment.contract.slice(0, 10)}… · Diana</dd></div>
          </dl>
        </div>
        <footer className="mono">Scan at the counter · read-only · no wallet needed</footer>
      </article>
      <p className="card-url">{url}</p>
      <div className="card-act">
        <PrintButton />
        <a href={`/check/${id}${offerNo ? `?offer=${offerNo}` : ""}`}>Open the counter check →</a>
        <a href={`/p/${id}${offerNo ? `?offer=${offerNo}` : ""}`}>Back to the passport</a>
      </div>
      <p className="card-note">The QR opens the dealer&apos;s counter check for this passport. A copied card resolves to the same passport, so it proves what the chain says about the passport, not that the watch in front of you is the one it was issued for.</p>
    </main>
  );
}
