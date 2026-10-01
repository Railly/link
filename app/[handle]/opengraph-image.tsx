import { notFound } from "next/navigation";
import { handleError, normalizeHandle } from "@/lib/handles";
import { OG_SIZE, ogCard } from "@/lib/og";
import { getPage } from "@/lib/store";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "página de links en linkmi";

export default async function Image({ params }: { params: Promise<{ handle: string }> }) {
  const handle = normalizeHandle(decodeURIComponent((await params).handle));
  const config = handleError(handle) ? null : await getPage(handle);
  if (!config) notFound();
  return ogCard({
    title: config.name,
    subtitle: config.bio || undefined,
    url: `linkmi.ar/${handle}`,
    colors: config.colors,
    font: config.font,
  });
}
