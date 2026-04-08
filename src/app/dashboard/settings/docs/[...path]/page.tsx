import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { promises as fs } from "node:fs";
import path from "node:path";
import { DetailSection } from "@/components/layout";
import { getCurrentUser } from "@/modules/auth";

type PageProps = {
  params: Promise<{ path?: string[] }>;
};

function safeDocPath(segments: string[] | undefined): string | null {
  if (!segments || segments.length === 0) return null;
  if (segments.some((s) => !s || s === "." || s === "..")) return null;

  const rel = segments.join("/");
  if (!rel.endsWith(".md")) return null;
  if (rel.startsWith("/") || rel.includes("\\")) return null;
  return rel;
}

export default async function SettingsDocPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { path: docSegments } = await params;
  const relDoc = safeDocPath(docSegments);
  if (!relDoc) redirect("/dashboard/settings/privacy");

  const repoRoot = process.cwd();
  const docsRoot = path.resolve(repoRoot, "docs");
  const absoluteDoc = path.resolve(docsRoot, relDoc);
  if (!absoluteDoc.startsWith(docsRoot + path.sep)) redirect("/dashboard/settings/privacy");

  let content: string;
  try {
    content = await fs.readFile(absoluteDoc, "utf8");
  } catch {
    redirect("/dashboard/settings/privacy");
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/settings/privacy"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Privacy &amp; compliance
        </Link>
      </div>
      <DetailSection title={`Repository document: ${relDoc}`}>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            This view renders the repository document as plain text for quick in-app reference.
          </p>
          <pre className="max-h-[70vh] overflow-auto rounded-card border border-border bg-surface p-4 text-xs leading-relaxed text-foreground whitespace-pre-wrap">
            {content}
          </pre>
        </div>
      </DetailSection>
    </div>
  );
}

