import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Star, Clock, Tag, Box, Github } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/avatar";
import { InstallCommands } from "@/components/install-commands";
import { Markdown } from "@/components/markdown";
import {
  fetchPackageIndex,
  getPackageManifestUrl,
  getReadmeUrl,
  getRepoBaseUrls,
  REVALIDATE_SECONDS,
} from "@/lib/packages";

async function getManifest(tooth: string, version: string) {
  const url = getPackageManifestUrl(tooth, version);
  try {
    const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
    if (res.ok) return res.json();
    return null;
  } catch {
    return null;
  }
}

async function getReadme(tooth: string, version: string) {
  const url = getReadmeUrl(tooth, version);
  if (!url) return null;

  try {
    const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function buildPackageUrl(tooth: string, version?: string, variant?: string) {
  const query = new URLSearchParams();
  if (variant !== undefined) {
    query.set("variant", variant);
  }
  if (version) {
    query.set("version", version);
  }
  const queryString = query.toString();
  return queryString ? `/packages/${tooth}?${queryString}` : `/packages/${tooth}`;
}

function resolvePackageByTooth(packageEntries: Record<string, import("@/types").RawPackageEntry>, tooth: string) {
  const exact = packageEntries[tooth];
  if (exact) {
    return { tooth, pkg: exact };
  }

  const normalizedTooth = tooth.toLowerCase();
  const matchedTooth = Object.keys(packageEntries).find(
    (key) => key.toLowerCase() === normalizedTooth,
  );

  if (!matchedTooth) {
    return null;
  }

  return { tooth: matchedTooth, pkg: packageEntries[matchedTooth] };
}

function getSortedVariants(pkg: import("@/types").RawPackageEntry): string[] {
  return Object.keys(pkg.variants).sort((a, b) => {
    if (a === "") return -1;
    if (b === "") return 1;
    return a.localeCompare(b);
  });
}

function getVersionsForVariant(pkg: import("@/types").RawPackageEntry, variant: string): string[] {
  const variantMeta = pkg.variants[variant];
  if (!variantMeta) return [];
  return Array.from(new Set(variantMeta.versions));
}

interface PageProps {
  params: Promise<{ tooth: string[] }>;
  searchParams: Promise<{
    variant?: string;
    version?: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const slugPath = resolvedParams.tooth
    .map((s) => {
      try {
        return decodeURIComponent(s);
      } catch {
        return s;
      }
    })
    .join("/");

  const packageIndex = await fetchPackageIndex();
  const resolved = resolvePackageByTooth(packageIndex.packages, slugPath);

  if (!resolved) {
    return { title: "Not Found" };
  }

  return {
    title: resolved.pkg.info.name,
    description: resolved.pkg.info.description,
  };
}

export default async function PackageDetailPage({
  params,
  searchParams,
}: Readonly<PageProps>) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const slugParts = resolvedParams.tooth.map((segment) => {
    try {
      return decodeURIComponent(segment);
    } catch {
      return segment;
    }
  });
  const slugPath = slugParts.join("/");

  const packageIndex = await fetchPackageIndex();
  const resolved = resolvePackageByTooth(packageIndex.packages, slugPath);

  if (!resolved) {
    notFound();
  }

  const tooth = resolved.tooth;
  const pkg = resolved.pkg;
  const variants = getSortedVariants(pkg);
  if (variants.length === 0) {
    notFound();
  }

  const requestedVariant = resolvedSearchParams.variant;
  const selectedVariant = requestedVariant && variants.includes(requestedVariant)
    ? requestedVariant
    : variants[0];

  const versionCandidates = getVersionsForVariant(pkg, selectedVariant);
  if (versionCandidates.length === 0) {
    notFound();
  }

  const requestedVersion = resolvedSearchParams.version;
  const selectedVersion = requestedVersion && versionCandidates.includes(requestedVersion)
    ? requestedVersion
    : versionCandidates.at(-1);

  if (!selectedVersion) {
    notFound();
  }

  const canonicalVariant = selectedVariant;
  if (
    resolvedSearchParams.variant !== canonicalVariant
    || resolvedSearchParams.version !== selectedVersion
  ) {
    redirect(buildPackageUrl(tooth, selectedVersion, selectedVariant));
  }

  const manifest = await getManifest(tooth, selectedVersion);
  const readme = await getReadme(tooth, selectedVersion);
  const repoUrls = getRepoBaseUrls(tooth, selectedVersion);
  const info = manifest?.info || pkg.info;

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <Link
        href="/"
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 mb-6 transition-colors"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to packages
      </Link>

      <div className="grid gap-8 lg:grid-cols-4">
        <div className="lg:col-span-3 space-y-8">
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0">
              <Avatar
                src={info.avatar_url}
                alt={info.name}
                name={info.name}
                className="w-24 h-24 rounded-xl"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold tracking-tight mb-2 break-words">
                {info.name}
              </h1>
              <p className="text-lg text-gray-500 dark:text-gray-400 leading-relaxed max-w-3xl">
                {info.description}
              </p>
            </div>
          </div>

          <InstallCommands tooth={tooth} version={selectedVersion} variant={selectedVariant} />

          <Card>
            <CardHeader className="border-b">
              <CardTitle>README</CardTitle>
            </CardHeader>
            <CardContent className="p-6 md:p-8">
              {readme ? (
                <div className="prose dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-blue-600 prose-pre:bg-gray-100 prose-pre:text-gray-800 dark:prose-pre:bg-gray-900 dark:prose-pre:text-gray-200 prose-code:bg-gray-100 prose-code:text-gray-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm dark:prose-code:bg-gray-900 dark:prose-code:text-gray-200 prose-table:border-collapse prose-th:border prose-td:border prose-th:p-2 prose-td:p-2 prose-img:inline-block prose-img:my-1 prose-img:mr-1 prose-p:my-4">
                  <Markdown rawBase={repoUrls.raw} blobBase={repoUrls.blob}>
                    {readme}
                  </Markdown>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p>No README available for version {selectedVersion}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-500 flex items-center gap-2">
                  <Box className="w-4 h-4" /> Version
                </span>
                <span className="font-medium font-mono">{selectedVersion}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-500 flex items-center gap-2">
                  <Star className="w-4 h-4" /> Stars
                </span>
                <span className="font-medium">{pkg.stargazer_count}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-500 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Updated
                </span>
                <span className="font-medium text-sm">
                  {new Date(pkg.updated_at).toLocaleDateString()}
                </span>
              </div>

              <div className="pt-2">
                <div className="text-sm text-gray-500 mb-2 flex items-center gap-2">
                  <Tag className="w-4 h-4" /> Tags
                </div>
                <div className="flex flex-wrap gap-2">
                  {(pkg.info.tags ?? []).map((tag: string) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                  {(!pkg.info.tags || pkg.info.tags.length === 0) && (
                    <span className="text-sm text-gray-400">No tags</span>
                  )}
                </div>
              </div>

              <div className="pt-4">
                <Button className="w-full" asChild>
                  <a
                    href={`https://${tooth}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2"
                  >
                    <Github className="h-4 w-4" />
                    <span>View on GitHub</span>
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Variants</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {variants.map((variant) => {
                  const variantVersions = getVersionsForVariant(pkg, variant);
                  const variantLatest = variantVersions.at(-1);
                  if (!variantLatest) return null;
                  const targetVersion = variantVersions.includes(selectedVersion)
                    ? selectedVersion
                    : variantLatest;
                  const isCurrent = variant === selectedVariant;
                  const variantUrl = buildPackageUrl(tooth, targetVersion, variant);
                  return (
                    <Link key={variant} href={variantUrl} prefetch={false}>
                      <Badge
                        variant={isCurrent ? "default" : "outline"}
                        className={`font-mono cursor-pointer transition-colors ${isCurrent ? "" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}
                      >
                        {variant === "" ? "(default)" : variant}
                      </Badge>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Versions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 max-h-96 overflow-y-auto pr-2">
                {versionCandidates
                  .slice()
                  .reverse()
                  .map((version) => {
                    const isCurrent = version === selectedVersion;
                    const versionUrl = buildPackageUrl(tooth, version, selectedVariant);
                    return (
                      <Link key={version} href={versionUrl} prefetch={false}>
                        <Badge
                          variant={isCurrent ? "default" : "outline"}
                          className={`font-mono cursor-pointer transition-colors ${isCurrent ? "" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}
                        >
                          {version}
                        </Badge>
                      </Link>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
