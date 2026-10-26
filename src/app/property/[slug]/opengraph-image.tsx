import { ImageResponse } from "next/og";
import { getProperty, properties } from "@/lib/mock-data";
import { bedsLabel, formatAED, priceSuffix, typeLabel } from "@/lib/search";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Property listing on SA Realty";

export function generateStaticParams() {
  return properties.map((p) => ({ slug: p.slug }));
}

// Social share card for WhatsApp, X, LinkedIn and Facebook link previews.
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = getProperty(slug);
  if (!p) return new ImageResponse(<div>SA Realty</div>, size);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, background: "#0e4a52", color: "#fff" }}>
        <div style={{ display: "flex", fontSize: 34, fontWeight: 700 }}>SA Realty</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 72, fontWeight: 800 }}>{`AED ${formatAED(p.price)}${priceSuffix(p)}`}</div>
          <div style={{ fontSize: 44, marginTop: 12 }}>{p.title}</div>
          <div style={{ fontSize: 32, marginTop: 20, color: "#b5d8d3" }}>
            {`${bedsLabel(p.bedrooms)} ${typeLabel[p.type]}, ${formatAED(p.areaSqft)} sqft, ${p.location.community}`}
          </div>
        </div>
        <div style={{ display: "flex", height: 12, width: 220, background: "#e2a23b", borderRadius: 6 }} />
      </div>
    ),
    size,
  );
}
