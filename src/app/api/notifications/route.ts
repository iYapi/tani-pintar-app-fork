import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { unauthorized, internalError } from "@/lib/api-error";

export async function GET(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return unauthorized();

  const url = new URL(req.url);
  const status = url.searchParams.get("status") || undefined;
  const channel = url.searchParams.get("channel") || undefined;
  const type = url.searchParams.get("type") || undefined;
  const dateFrom = url.searchParams.get("dateFrom") || undefined;
  const dateTo = url.searchParams.get("dateTo") || undefined;
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get("pageSize") || "20", 10) || 20)
  );

  try {
    const where: Prisma.NotificationLogWhereInput = {};

    if (ctx.userRole !== "ADMIN") {
      where.userId = ctx.userId;
    }
    if (status) where.status = status as "QUEUED" | "SENT" | "DELIVERED" | "FAILED";
    if (channel) where.channel = channel as "WHATSAPP" | "SMS" | "EMAIL";
    if (type) where.type = type as any;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(`${dateTo}T23:59:59Z`);
    }

    const [total, data] = await Promise.all([
      prisma.notificationLog.count({ where }),
      prisma.notificationLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return Response.json(
      {
        data,
        meta: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize) || 0,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[GET /api/notifications]", err);
    return internalError();
  }
}
