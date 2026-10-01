import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import LinkPage from "@/components/LinkPage";
import { handleError, normalizeHandle } from "@/lib/handles";
import { getPage } from "@/lib/store";

export async function generateStaticParams() {
  return [{ handle: "sofiferro" }];
}

async function resolve(params: PageProps<"/[handle]">["params"]) {
  const handle = normalizeHandle(decodeURIComponent((await params).handle));
  return handleError(handle) ? null : getPage(handle);
}

export async function generateMetadata({ params }: PageProps<"/[handle]">): Promise<Metadata> {
  const config = await resolve(params);
  return config ? { title: config.name, description: config.bio } : {};
}

async function HandlePage({ params }: Pick<PageProps<"/[handle]">, "params">) {
  const config = await resolve(params);
  if (!config) notFound();
  return <LinkPage config={config} reportEmail={process.env.LINKMI_REPORT_EMAIL} />;
}

export default function Page({ params }: PageProps<"/[handle]">) {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-[#07060b]" />}>
      <HandlePage params={params} />
    </Suspense>
  );
}
