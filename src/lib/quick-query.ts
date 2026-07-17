import { prisma } from "@/lib/prisma";

type QueryIntent = "PRICE" | "OVERSUPPLY" | "WEATHER" | "UNKNOWN";

const APP_URL = process.env.APP_URL || "https://gh7.expiproject.com";

const COMMODITIES = [
  "bawang merah",
  "bawang putih",
  "cabai rawit",
  "cabai merah",
  "beras",
  "jagung",
  "kedelai",
  "tomat",
  "kentang",
  "wortel",
  "kol",
  "padi",
];

const REGIONS = [
  "brebes",
  "jakarta",
  "surabaya",
  "bandung",
  "semarang",
  "yogyakarta",
  "medan",
  "malang",
  "cianjur",
  "garut",
  "indramayu",
];

function parseIntent(query: string): QueryIntent {
  const q = query.toLowerCase();
  if (q.includes("harga") || q.includes("price")) return "PRICE";
  if (
    q.includes("oversupply") ||
    q.includes("status") ||
    q.includes("wilayah") ||
    q.includes("daerah")
  )
    return "OVERSUPPLY";
  if (q.includes("cuaca") || q.includes("weather")) return "WEATHER";
  return "UNKNOWN";
}

function extractCommodity(query: string): string | null {
  const q = query.toLowerCase();
  for (const c of COMMODITIES) {
    if (q.includes(c)) return c;
  }
  return null;
}

function extractRegion(query: string): string | null {
  const q = query.toLowerCase();
  for (const r of REGIONS) {
    if (q.includes(r)) return r;
  }
  return null;
}

function capitalize(str: string): string {
  return str
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

async function handlePrice(query: string): Promise<string> {
  const commodity = extractCommodity(query);
  const region = extractRegion(query);

  if (!commodity) {
    const sample = await prisma.priceSnapshot.findFirst({
      orderBy: { snapshotDate: "desc" },
      select: { commodity: true, pricePerUnit: true, region: true, unit: true },
    });
    if (sample) {
      return `Harga ${capitalize(sample.commodity)} di ${capitalize(sample.region)}: Rp ${sample.pricePerUnit.toLocaleString("id-ID")}/${sample.unit}. Sumber: BAPANAS/PIHPS.`;
    }
    return "Sebutkan komoditas yang ingin dicek harganya, misalnya: \"harga bawang merah\"";
  }

  const where: Record<string, unknown> = { commodity };
  if (region) where.region = region;

  const snap = await prisma.priceSnapshot.findFirst({
    where,
    orderBy: { snapshotDate: "desc" },
    select: { pricePerUnit: true, region: true, unit: true, snapshotDate: true },
  });

  if (!snap) {
    return `Belum ada data harga untuk ${capitalize(commodity)}${region ? ` di ${capitalize(region)}` : ""}. Coba komoditas lain.`;
  }

  const date = snap.snapshotDate.toISOString().slice(0, 10);
  return `Harga ${capitalize(commodity)} di ${capitalize(snap.region)} per ${date}: Rp ${snap.pricePerUnit.toLocaleString("id-ID")}/${snap.unit}. Sumber: BAPANAS/PIHPS.`;
}

async function handleOversupply(query: string): Promise<string> {
  const commodity = extractCommodity(query);
  const region = extractRegion(query);

  const where: Record<string, unknown> = {
    status: "OPEN",
    isOversupply: true,
  };
  if (commodity) where.commodity = commodity;
  if (region) where.locationName = { contains: region, mode: "insensitive" };

  const count = await prisma.saleListing.count({ where });

  if (count === 0) {
    const label = commodity
      ? `${capitalize(commodity)}`
      : "komoditas yang Anda cari";
    return `Saat ini tidak terdeteksi oversupply ${label}${region ? ` di ${capitalize(region)}` : ""}. Status wilayah AMAN.`;
  }

  const total = await prisma.saleListing.aggregate({
    where,
    _sum: { volume: true },
  });
  const volume = total._sum.volume ?? 0;

  const label = commodity ? capitalize(commodity) : "Komoditas";
  return `⚠️ Terdeteksi oversupply ${label}${region ? ` di ${capitalize(region)}` : ""}: ${count} listing aktif, total volume ${volume.toLocaleString("id-ID")} kg. Segera cek dashboard untuk rekomendasi preservasi.`;
}

async function handleWeather(query: string): Promise<string> {
  const region = extractRegion(query) || "brebes";

  const snap = await prisma.weatherSnapshot.findFirst({
    where: { region },
    orderBy: { forecastDate: "desc" },
    select: { temperature: true, humidity: true, condition: true, region: true },
  });

  if (!snap) {
    return `Belum ada data cuaca untuk ${capitalize(region)}.`;
  }

  const temp = snap.temperature != null ? `${snap.temperature}°C` : "n/a";
  const humid = snap.humidity != null ? `${snap.humidity}%` : "n/a";
  const cond = snap.condition ?? "tidak diketahui";
  return `Cuaca ${capitalize(snap.region)}: ${cond}, ${temp}, Kelembaban ${humid}. Sumber: BMKG.`;
}

export async function processQuickQuery(
  phoneNumber: string,
  query: string
): Promise<string> {
  const intent = parseIntent(query);

  try {
    switch (intent) {
      case "PRICE":
        return await handlePrice(query);
      case "OVERSUPPLY":
        return await handleOversupply(query);
      case "WEATHER":
        return await handleWeather(query);
      default:
        return `Gunakan dashboard TaniPintar untuk info lebih lengkap: ${APP_URL}/dashboard`;
    }
  } catch (err) {
    console.error(`[quick-query] gagal proses "${query}":`, err);
    return "Maaf, terjadi kesalahan saat mengambil data. Silakan coba lagi nanti.";
  }
}