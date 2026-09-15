import { NextResponse } from "next/server";
import { LocalStorageProvider } from "@/server/providers/storage";
import { prisma } from "@/server/db/prisma";

export const dynamic = "force-dynamic";

/**
 * Local storage driver endpoint (development only).
 * PUT accepts a signed upload; GET serves the file with its stored MIME type.
 */
function keyFrom(params: { key: string[] }) {
  const key = params.key.join("/");
  if (key.includes("..") || key.startsWith("/")) return null;
  return key;
}

export async function PUT(req: Request, ctx: RouteContext<"/api/storage/[...key]">) {
  if (process.env.STORAGE_DRIVER === "s3") return NextResponse.json({ error: { code: "NOT_FOUND", message: "Not found." } }, { status: 404 });
  const key = keyFrom(await ctx.params);
  if (!key) return NextResponse.json({ error: { code: "VALIDATION", message: "Invalid key." } }, { status: 400 });
  const url = new URL(req.url);
  if (!LocalStorageProvider.verify(key, url.searchParams.get("expires"), url.searchParams.get("sig"))) {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "Upload link is invalid or expired." } }, { status: 403 });
  }
  const media = await prisma.media.findUnique({ where: { key }, select: { size: true } });
  const body = Buffer.from(await req.arrayBuffer());
  if (media && body.byteLength > media.size + 1024) {
    return NextResponse.json({ error: { code: "VALIDATION", message: "File is larger than declared." } }, { status: 413 });
  }
  const { storage } = await import("@/server/providers/storage");
  await storage().putObject(key, body, req.headers.get("content-type") ?? "application/octet-stream");
  return new NextResponse(null, { status: 204 });
}

export async function GET(_req: Request, ctx: RouteContext<"/api/storage/[...key]">) {
  const key = keyFrom(await ctx.params);
  if (!key) return new NextResponse("Not found", { status: 404 });
  const media = await prisma.media.findUnique({ where: { key }, select: { mime: true, fileName: true, deletedAt: true } });
  if (!media || media.deletedAt) return new NextResponse("Not found", { status: 404 });
  const file = await LocalStorageProvider.read(key);
  if (!file) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": media.mime,
      "Content-Length": String(file.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": `inline; filename="${encodeURIComponent(media.fileName)}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
