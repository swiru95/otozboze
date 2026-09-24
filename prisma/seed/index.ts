import { deflateSync } from "node:zlib";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set — copy .env.example to .env.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

// ---------------------------------------------------------------------------
// Procedural placeholder images
//
// Real PNGs are generated here rather than committing binaries or fetching
// from the network, so seeded pictures go through exactly the same column and
// the same `data:image/png;base64,` shape that a browser upload produces.
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

type Rgb = [number, number, number];

function pngDataUrl(
  width: number,
  height: number,
  paint: (x: number, y: number) => Rgb,
) {
  const stride = width * 3 + 1;
  const raw = Buffer.alloc(stride * height);

  for (let y = 0; y < height; y++) {
    let offset = y * stride;
    raw[offset++] = 0; // filter type: none
    for (let x = 0; x < width; x++) {
      const [r, g, b] = paint(x, y);
      raw[offset++] = r;
      raw[offset++] = g;
      raw[offset++] = b;
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // colour type: truecolour
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);

  return `data:image/png;base64,${png.toString("base64")}`;
}

const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));

/** Grain heap: base colour darkening downwards, with a soft horizon band. */
function grainPainter(base: Rgb) {
  return (x: number, y: number, width: number, height: number): Rgb => {
    const depth = y / height;
    const horizon = depth < 0.32 ? 1.18 - depth * 0.2 : 1 - (depth - 0.32) * 0.55;
    const grain = ((x * 7 + y * 13) % 17) / 17 - 0.5;
    return [
      clamp(base[0] * horizon + grain * 12),
      clamp(base[1] * horizon + grain * 12),
      clamp(base[2] * horizon + grain * 10),
    ];
  };
}

function paintedImage(width: number, height: number, base: Rgb) {
  const painter = grainPainter(base);
  return pngDataUrl(width, height, (x, y) => painter(x, y, width, height));
}

/** A photo plus its list-sized copy, exactly as the uploader produces. */
function photoPair(base: Rgb) {
  return {
    url: paintedImage(480, 360, base),
    thumbnailUrl: paintedImage(200, 150, base),
  };
}

const GRAIN_TINT: Record<string, Rgb> = {
  WHEAT_CONSUMPTION: [198, 158, 74],
  WHEAT_FEED: [186, 150, 80],
  RYE: [150, 120, 80],
  BARLEY_MALTING: [190, 165, 95],
  BARLEY_FEED: [178, 152, 90],
  OATS: [205, 180, 120],
  TRITICALE: [170, 140, 85],
  MAIZE: [222, 178, 52],
  RAPESEED: [232, 196, 40],
  SOYBEAN: [176, 158, 104],
  SUNFLOWER: [238, 190, 45],
  OTHER: [180, 170, 150],
};

/** Wipe in FK-safe order so the seed is re-runnable. */
async function reset() {
  await prisma.review.deleteMany();
  await prisma.platformCharge.deleteMany();
  await prisma.document.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.transportJob.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.grainQuality.deleteMany();
  await prisma.grainOffer.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.location.deleteMany();
  await prisma.company.deleteMany();
}

async function main() {
  await reset();

  // --- 4 companies ---------------------------------------------------------
  const [kowalscy, agropol, mlyny, transagro] = await Promise.all([
    prisma.company.create({
      data: {
        name: "Gospodarstwo Rolne Kowalscy",
        nip: "7811886234",
        regon: "630112233",
        email: "biuro@kowalscy.local",
        phone: "+48 61 285 11 22",
        isVerified: true,
      },
    }),
    prisma.company.create({
      data: {
        name: "AgroPol Skup Zbóż Sp. z o.o.",
        nip: "5562334455",
        regon: "340556677",
        krs: "0000123456",
        email: "skup@agropol.local",
        phone: "+48 52 355 40 10",
        isVerified: true,
      },
    }),
    prisma.company.create({
      data: {
        name: "Młyny Wielkopolskie S.A.",
        nip: "7792445566",
        regon: "630998877",
        krs: "0000654321",
        email: "zaopatrzenie@mlyny-wlkp.local",
        phone: "+48 61 842 77 00",
        isVerified: true,
      },
    }),
    prisma.company.create({
      data: {
        name: "TransAgro Logistyka Sp. z o.o.",
        nip: "7842119988",
        regon: "302445566",
        krs: "0000998877",
        email: "spedycja@transagro.local",
        phone: "+48 61 437 20 90",
        isVerified: true,
      },
    }),
  ]);

  // --- Locations spread across the country ---------------------------------
  const loc = async (data: Parameters<typeof prisma.location.create>[0]["data"]) =>
    prisma.location.create({ data });

  const sroda = await loc({
    kind: "FARM",
    label: "Magazyn zbożowy Środa",
    street: "ul. Polna 14",
    city: "Środa Wielkopolska",
    postalCode: "63-000",
    voivodeship: "wielkopolskie",
    latitude: 52.2281,
    longitude: 17.2764,
    companyId: kowalscy.id,
  });
  const kolo = await loc({
    kind: "FARM",
    label: "Silos Koło",
    street: "ul. Zbożowa 3",
    city: "Koło",
    postalCode: "62-600",
    voivodeship: "wielkopolskie",
    latitude: 52.2003,
    longitude: 18.6383,
    companyId: kowalscy.id,
  });
  const zamosc = await loc({
    kind: "FARM",
    street: "Hrubieszowska 88",
    city: "Zamość",
    postalCode: "22-400",
    voivodeship: "lubelskie",
    latitude: 50.7231,
    longitude: 23.2518,
  });
  const hrubieszow = await loc({
    kind: "FARM",
    city: "Hrubieszów",
    postalCode: "22-500",
    voivodeship: "lubelskie",
    latitude: 50.8047,
    longitude: 23.8917,
  });
  const ketrzyn = await loc({
    kind: "FARM",
    city: "Kętrzyn",
    postalCode: "11-400",
    voivodeship: "warmińsko-mazurskie",
    latitude: 54.0761,
    longitude: 21.3753,
  });
  const elblag = await loc({
    kind: "FARM",
    city: "Elbląg",
    postalCode: "82-300",
    voivodeship: "warmińsko-mazurskie",
    latitude: 54.1522,
    longitude: 19.4088,
  });
  const grudziadz = await loc({
    kind: "FARM",
    city: "Grudziądz",
    postalCode: "86-300",
    voivodeship: "kujawsko-pomorskie",
    latitude: 53.4837,
    longitude: 18.7536,
  });
  const inowroclaw = await loc({
    kind: "ELEVATOR",
    label: "Elewator AgroPol",
    street: "ul. Magazynowa 7",
    city: "Inowrocław",
    postalCode: "88-100",
    voivodeship: "kujawsko-pomorskie",
    latitude: 52.7982,
    longitude: 18.2611,
    companyId: agropol.id,
  });
  const poznan = await loc({
    kind: "MILL",
    label: "Młyn Poznań-Starołęka",
    street: "ul. Starołęcka 42",
    city: "Poznań",
    postalCode: "61-361",
    voivodeship: "wielkopolskie",
    latitude: 52.3626,
    longitude: 16.9497,
    companyId: mlyny.id,
  });
  const gdynia = await loc({
    kind: "PORT",
    label: "Terminal zbożowy Gdynia",
    city: "Gdynia",
    postalCode: "81-337",
    voivodeship: "pomorskie",
    latitude: 54.5333,
    longitude: 18.5411,
  });
  const szczecin = await loc({
    kind: "PORT",
    label: "Terminal Szczecin",
    city: "Szczecin",
    postalCode: "70-603",
    voivodeship: "zachodniopomorskie",
    latitude: 53.4183,
    longitude: 14.5761,
  });
  const wrzesnia = await loc({
    kind: "WAREHOUSE",
    label: "Baza TransAgro",
    city: "Września",
    postalCode: "62-300",
    voivodeship: "wielkopolskie",
    latitude: 52.3255,
    longitude: 17.5654,
    companyId: transagro.id,
  });

  // --- 8 users; roles are capability flags, several users hold two ---------
  const mk = (
    email: string,
    name: string,
    roles: Array<"FARMER" | "BUYER" | "TRANSPORT" | "ADMIN">,
    companyId: string | null,
    phone: string,
    // Buyer-side entitlement. Most accounts stay FREE so the demo can show
    // the monthly cap and the paywall without any setup.
    subscriptionTier: "FREE" | "PRO" = "FREE",
  ) =>
    prisma.user.create({
      data: {
        email,
        name,
        emailVerified: new Date(),
        roles,
        activeRole: roles[0],
        phone,
        companyId,
        subscriptionTier,
        ...(subscriptionTier === "PRO"
          ? {
              subscribedAt: new Date("2026-09-01"),
              subscriptionUntil: new Date("2026-10-01"),
            }
          : {}),
      },
    });

  const jan = await mk("jan.kowalski@otozboze.local", "Jan Kowalski", ["FARMER"], kowalscy.id, "+48 601 111 001");
  // Farm with its own trucks — sells and hauls.
  const maria = await mk("maria.kowalska@otozboze.local", "Maria Kowalska", ["FARMER", "TRANSPORT"], kowalscy.id, "+48 601 111 002");
  const anna = await mk("anna.nowak@otozboze.local", "Anna Nowak", ["BUYER"], agropol.id, "+48 601 111 003", "PRO");
  // Trader who also farms — buys from neighbours and sells his own crop.
  const tomasz = await mk("tomasz.wisniewski@otozboze.local", "Tomasz Wiśniewski", ["BUYER", "FARMER"], agropol.id, "+48 601 111 004");
  const piotr = await mk("piotr.zielinski@otozboze.local", "Piotr Zieliński", ["BUYER"], mlyny.id, "+48 601 111 005");
  const katarzyna = await mk("katarzyna.lewandowska@otozboze.local", "Katarzyna Lewandowska", ["TRANSPORT"], transagro.id, "+48 601 111 006");
  // Haulier who also buys spot lots.
  const marek = await mk("marek.wojcik@otozboze.local", "Marek Wójcik", ["TRANSPORT", "BUYER"], transagro.id, "+48 601 111 007");
  const admin = await mk("admin@otozboze.local", "Admin Platformy", ["ADMIN", "FARMER", "BUYER", "TRANSPORT"], null, "+48 601 111 000");

  // Anna's PRO period is a paid one, so it has a charge behind it.
  await prisma.platformCharge.create({
    data: {
      kind: "BUYER_SUBSCRIPTION",
      userId: anna.id,
      amountNet: "199.00",
      description: "Abonament PRO — wrzesień 2026 (symulacja)",
    },
  });

  // --- 16 offers across mixed statuses, grains and locations ---------------
  type OfferSeed = {
    ref: string;
    grainType: Parameters<typeof prisma.grainOffer.create>[0]["data"]["grainType"];
    year: number;
    tonnage: string;
    price: string;
    status: "DRAFT" | "ACTIVE" | "RESERVED" | "SOLD" | "EXPIRED" | "CANCELLED";
    farmerId: string;
    locationId: string;
    title: string;
    /** Paid promotion — pinned to the top of the buyer board. */
    highlighted?: boolean;
    /** How many placeholder photos to attach. Some lots stay bare on
     *  purpose, so the board shows the wheat fallback too. */
    photos?: number;
    quality?: {
      moisture?: string;
      protein?: string;
      gluten?: string;
      fallingNumber?: number;
      testWeight?: string;
      impurities?: string;
      isCertified?: boolean;
    };
  };

  const offerSeeds: OfferSeed[] = [
    { ref: "OF-2026-0001", photos: 2, grainType: "WHEAT_CONSUMPTION", year: 2026, tonnage: "120.00", price: "985.00", status: "ACTIVE", farmerId: jan.id, locationId: sroda.id, title: "Pszenica konsumpcyjna, klasa B", quality: { moisture: "13.10", protein: "12.80", gluten: "26.50", fallingNumber: 285, testWeight: "78.50", impurities: "1.20", isCertified: true } },
    { ref: "OF-2026-0002", photos: 2, grainType: "RAPESEED", year: 2026, tonnage: "45.50", price: "2150.00", status: "ACTIVE", farmerId: jan.id, locationId: kolo.id, title: "Rzepak ozimy, niska wilgotność", highlighted: true, quality: { moisture: "7.80", impurities: "1.90", isCertified: true } },
    { ref: "OF-2026-0003", photos: 1, grainType: "BARLEY_MALTING", year: 2026, tonnage: "80.00", price: "1120.00", status: "ACTIVE", farmerId: maria.id, locationId: sroda.id, title: "Jęczmień browarny odm. Planet", quality: { moisture: "12.40", protein: "10.20", testWeight: "66.00", impurities: "0.80", isCertified: true } },
    { ref: "OF-2026-0004", photos: 1, grainType: "MAIZE", year: 2025, tonnage: "200.00", price: "870.00", status: "ACTIVE", farmerId: tomasz.id, locationId: zamosc.id, title: "Kukurydza sucha, partia 200 t", highlighted: true, quality: { moisture: "14.00", impurities: "2.10" } },
    { ref: "OF-2026-0005", grainType: "WHEAT_FEED", year: 2026, tonnage: "150.00", price: "890.00", status: "ACTIVE", farmerId: tomasz.id, locationId: hrubieszow.id, title: "Pszenica paszowa", quality: { moisture: "13.60", protein: "11.10", testWeight: "74.00", impurities: "2.40" } },
    { ref: "OF-2026-0006", photos: 1, grainType: "RYE", year: 2026, tonnage: "60.00", price: "760.00", status: "RESERVED", farmerId: admin.id, locationId: ketrzyn.id, title: "Żyto konsumpcyjne", quality: { moisture: "13.20", fallingNumber: 190, testWeight: "72.50", impurities: "1.50" } },
    { ref: "OF-2026-0007", grainType: "OATS", year: 2026, tonnage: "35.00", price: "820.00", status: "ACTIVE", farmerId: maria.id, locationId: elblag.id, title: "Owies czarny, partia drobna", quality: { moisture: "12.90", impurities: "2.80" } },
    { ref: "OF-2026-0008", grainType: "TRITICALE", year: 2026, tonnage: "95.00", price: "805.00", status: "ACTIVE", farmerId: jan.id, locationId: grudziadz.id, title: "Pszenżyto ozime", quality: { moisture: "13.40", testWeight: "70.00", impurities: "1.70" } },
    { ref: "OF-2026-0009", photos: 1, grainType: "SOYBEAN", year: 2025, tonnage: "28.00", price: "2380.00", status: "ACTIVE", farmerId: tomasz.id, locationId: zamosc.id, title: "Soja krajowa non-GMO", quality: { moisture: "11.80", protein: "34.50", isCertified: true } },
    { ref: "OF-2026-0010", grainType: "SUNFLOWER", year: 2025, tonnage: "42.00", price: "1890.00", status: "DRAFT", farmerId: tomasz.id, locationId: hrubieszow.id, title: "Słonecznik oleisty (szkic)", quality: { moisture: "9.20" } },
    { ref: "OF-2026-0011", grainType: "WHEAT_CONSUMPTION", year: 2026, tonnage: "180.00", price: "1010.00", status: "DRAFT", farmerId: maria.id, locationId: kolo.id, title: "Pszenica klasa A (szkic)", quality: { moisture: "12.70", protein: "13.90", gluten: "30.10", fallingNumber: 320 } },
    { ref: "OF-2026-0012", grainType: "BARLEY_FEED", year: 2025, tonnage: "110.00", price: "745.00", status: "EXPIRED", farmerId: jan.id, locationId: sroda.id, title: "Jęczmień paszowy — oferta wygasła", quality: { moisture: "13.80", impurities: "3.10" } },
    // Reserved + sold lots below are backed by purchases and transport jobs.
    { ref: "OF-2026-0013", grainType: "WHEAT_CONSUMPTION", year: 2026, tonnage: "100.00", price: "995.00", status: "RESERVED", farmerId: jan.id, locationId: kolo.id, title: "Pszenica konsumpcyjna, rezerwacja", quality: { moisture: "13.00", protein: "12.40", gluten: "27.00", fallingNumber: 275, isCertified: true } },
    { ref: "OF-2026-0014", photos: 1, grainType: "MAIZE", year: 2025, tonnage: "250.00", price: "865.00", status: "SOLD", farmerId: maria.id, locationId: grudziadz.id, title: "Kukurydza paszowa 250 t", quality: { moisture: "14.20", impurities: "2.00" } },
    { ref: "OF-2026-0015", photos: 2, grainType: "RAPESEED", year: 2026, tonnage: "70.00", price: "2185.00", status: "SOLD", farmerId: admin.id, locationId: ketrzyn.id, title: "Rzepak, partia eksportowa", quality: { moisture: "7.50", impurities: "1.40", isCertified: true } },
    { ref: "OF-2026-0016", grainType: "RYE", year: 2026, tonnage: "90.00", price: "775.00", status: "SOLD", farmerId: jan.id, locationId: sroda.id, title: "Żyto paszowe", quality: { moisture: "13.50", testWeight: "71.00", impurities: "2.20" } },
    { ref: "OF-2026-0018", grainType: "BARLEY_FEED", year: 2026, tonnage: "60.00", price: "780.00", status: "SOLD", farmerId: maria.id, locationId: grudziadz.id, title: "Jęczmień paszowy, partia 60 t", photos: 1, quality: { moisture: "13.30", impurities: "2.30" } },
  ];

  const offers: Record<string, { id: string; pickupLocationId: string; tonnage: string; price: string }> = {};

  for (const o of offerSeeds) {
    const created = await prisma.grainOffer.create({
      data: {
        reference: o.ref,
        grainType: o.grainType,
        harvestYear: o.year,
        tonnage: o.tonnage,
        pricePerTonne: o.price,
        status: o.status,
        title: o.title,
        ...(() => {
          const tint = GRAIN_TINT[o.grainType] ?? GRAIN_TINT.OTHER;
          const pairs = Array.from({ length: o.photos ?? 0 }, () =>
            photoPair(tint),
          );
          return {
            photoUrls: pairs.map((pair) => pair.url),
            thumbnailUrl: pairs[0]?.thumbnailUrl ?? null,
          };
        })(),
        isHighlighted: o.highlighted ?? false,
        highlightedAt: o.highlighted ? new Date("2026-09-02") : null,
        highlightFeeNet: o.highlighted ? "15.00" : null,
        farmerId: o.farmerId,
        pickupLocationId: o.locationId,
        availableFrom: new Date("2026-08-15"),
        availableUntil: new Date("2026-12-31"),
        ...(o.quality ? { quality: { create: o.quality } } : {}),
      },
    });
    if (o.highlighted) {
      await prisma.platformCharge.create({
        data: {
          kind: "OFFER_HIGHLIGHT",
          userId: o.farmerId,
          offerId: created.id,
          amountNet: "15.00",
          description: "Wyróżnienie oferty na giełdzie (symulacja)",
        },
      });
    }

    offers[o.ref] = {
      id: created.id,
      pickupLocationId: o.locationId,
      tonnage: o.tonnage,
      price: o.price,
    };
  }

  // --- Logos and facility galleries ----------------------------------------
  // Admin deliberately gets neither, so the default demo account lands on the
  // empty states and can exercise the uploaders.
  await Promise.all([
    prisma.user.update({
      where: { id: jan.id },
      data: { logoUrl: paintedImage(256, 256, [96, 132, 76]) },
    }),
    prisma.user.update({
      where: { id: anna.id },
      data: {
        logoUrl: paintedImage(256, 256, [72, 104, 152]),
        galleryUrls: [
          paintedImage(640, 480, [128, 140, 152]),
          paintedImage(640, 480, [146, 152, 158]),
        ],
      },
    }),
    prisma.user.update({
      where: { id: katarzyna.id },
      data: {
        logoUrl: paintedImage(256, 256, [168, 112, 48]),
        galleryUrls: [
          paintedImage(640, 480, [110, 116, 124]),
          paintedImage(640, 480, [132, 122, 108]),
          paintedImage(640, 480, [96, 104, 116]),
        ],
      },
    }),
  ]);

  // --- Documents: mock compliance evidence ---------------------------------
  // MOCK STORAGE — `url` is a placeholder, no file exists behind it.
  const VALID = { issuedAt: new Date("2026-07-15"), validUntil: new Date("2027-07-14") };
  const EXPIRED = { issuedAt: new Date("2025-06-01"), validUntil: new Date("2026-06-30") };

  const offerDoc = (args: {
    offerRef: string;
    kind: "LAB_RESULT" | "QUALITY_CERTIFICATE" | "ISCC_CERTIFICATE" | "EUDR_STATEMENT" | "OTHER";
    fileName: string;
    sizeBytes: number;
    issuer?: string;
    isVerified?: boolean;
    dates?: { issuedAt: Date; validUntil: Date };
  }) =>
    prisma.document.create({
      data: {
        scope: "OFFER",
        offerId: offers[args.offerRef].id,
        kind: args.kind,
        fileName: args.fileName,
        mimeType: "application/pdf",
        sizeBytes: args.sizeBytes,
        url: `/mock-documents/${args.offerRef}-${args.kind.toLowerCase()}.pdf`,
        issuer: args.issuer ?? null,
        isVerified: args.isVerified ?? false,
        ...(args.dates ?? { issuedAt: new Date("2026-08-20"), validUntil: null }),
      },
    });

  const carrierDoc = (args: {
    carrierId: string;
    kind: "TRANSPORT_LICENCE" | "GMP_PLUS" | "CARRIER_INSURANCE" | "OTHER";
    fileName: string;
    sizeBytes: number;
    issuer: string;
    isVerified?: boolean;
    dates: { issuedAt: Date; validUntil: Date };
  }) =>
    prisma.document.create({
      data: {
        scope: "CARRIER",
        carrierId: args.carrierId,
        kind: args.kind,
        fileName: args.fileName,
        mimeType: "application/pdf",
        sizeBytes: args.sizeBytes,
        url: `/mock-documents/${args.kind.toLowerCase()}-${args.carrierId}.pdf`,
        issuer: args.issuer,
        isVerified: args.isVerified ?? false,
        ...args.dates,
      },
    });

  await Promise.all([
    // Fully documented lot: lab result plus a verified quality certificate.
    offerDoc({ offerRef: "OF-2026-0001", kind: "LAB_RESULT", fileName: "badanie-pszenica-2026-08.pdf", sizeBytes: 284_512, issuer: "SGS Polska" }),
    offerDoc({ offerRef: "OF-2026-0001", kind: "QUALITY_CERTIFICATE", fileName: "swiadectwo-jakosci-klasa-B.pdf", sizeBytes: 142_880, issuer: "SGS Polska", isVerified: true, dates: VALID }),
    // Highlighted rapeseed with an ISCC certificate — the flagship listing.
    offerDoc({ offerRef: "OF-2026-0002", kind: "ISCC_CERTIFICATE", fileName: "iscc-eu-rzepak-2026.pdf", sizeBytes: 512_004, issuer: "ISCC System GmbH", isVerified: true, dates: VALID }),
    offerDoc({ offerRef: "OF-2026-0002", kind: "LAB_RESULT", fileName: "badanie-rzepak-wilgotnosc.pdf", sizeBytes: 96_300, issuer: "SGS Polska" }),
    offerDoc({ offerRef: "OF-2026-0003", kind: "LAB_RESULT", fileName: "jeczmien-browarny-analiza.pdf", sizeBytes: 201_776, issuer: "Lab Agro Poznań" }),
    offerDoc({ offerRef: "OF-2026-0009", kind: "EUDR_STATEMENT", fileName: "oswiadczenie-eudr-soja.pdf", sizeBytes: 88_120, issuer: "Gospodarstwo Wiśniewski", dates: VALID }),
    // Expired certificate: attached, but it earns no badge on the board.
    offerDoc({ offerRef: "OF-2026-0005", kind: "ISCC_CERTIFICATE", fileName: "iscc-eu-2025-wygasly.pdf", sizeBytes: 498_220, issuer: "ISCC System GmbH", dates: EXPIRED }),

    carrierDoc({ carrierId: katarzyna.id, kind: "TRANSPORT_LICENCE", fileName: "licencja-transport-drogowy.pdf", sizeBytes: 176_400, issuer: "GITD", isVerified: true, dates: VALID }),
    carrierDoc({ carrierId: katarzyna.id, kind: "GMP_PLUS", fileName: "gmp-plus-b4-transagro.pdf", sizeBytes: 331_050, issuer: "GMP+ International", isVerified: true, dates: VALID }),
    carrierDoc({ carrierId: marek.id, kind: "CARRIER_INSURANCE", fileName: "polisa-ocp-2026.pdf", sizeBytes: 214_990, issuer: "Warta S.A.", dates: VALID }),
    // Lapsed licence, so the profile shows the expired state too.
    carrierDoc({ carrierId: maria.id, kind: "TRANSPORT_LICENCE", fileName: "licencja-2025.pdf", sizeBytes: 158_640, issuer: "GITD", dates: EXPIRED }),
  ]);

  // --- Purchases + auto-generated transport jobs ---------------------------
  const total = (t: string, p: string) => (Number(t) * Number(p)).toFixed(2);

  const trade = async (args: {
    offerRef: string;
    purchaseRef: string;
    jobRef: string;
    buyerId: string;
    deliveryLocationId: string;
    purchaseStatus: "PENDING" | "CONFIRMED" | "IN_TRANSPORT" | "DELIVERED" | "SETTLED";
    /** Null when the sale is still only a reservation: no job exists yet. */
    jobStatus: "AVAILABLE" | "ASSIGNED" | "IN_TRANSIT" | "DELIVERED" | null;
    carrierId?: string;
    distanceKm: number;
    ratePerTonne: string;
    vehiclePlate?: string;
    driverName?: string;
  }) => {
    const offer = offers[args.offerRef];

    const purchase = await prisma.purchase.create({
      data: {
        reference: args.purchaseRef,
        offerId: offer.id,
        buyerId: args.buyerId,
        tonnage: offer.tonnage,
        pricePerTonne: offer.price,
        totalNet: total(offer.tonnage, offer.price),
        status: args.purchaseStatus,
        deliveryLocationId: args.deliveryLocationId,
        expectedDeliveryAt: new Date("2026-09-20"),
      },
    });

    // A PENDING reservation deliberately has no transport job: the farmer
    // has not confirmed, so there is nothing to haul yet.
    if (args.jobStatus === null) return;

    // The commission is booked when the buyer approves the carrier, not when
    // the carrier applies, so an ASSIGNED job is not yet paid for.
    const feePaid =
      args.jobStatus === "IN_TRANSIT" || args.jobStatus === "DELIVERED";

    const job = await prisma.transportJob.create({
      data: {
        reference: args.jobRef,
        purchaseId: purchase.id,
        status: args.jobStatus,
        carrierId: args.carrierId ?? null,
        pickupLocationId: offer.pickupLocationId,
        deliveryLocationId: args.deliveryLocationId,
        tonnage: offer.tonnage,
        distanceKm: args.distanceKm,
        ratePerTonne: args.ratePerTonne,
        totalNet: total(offer.tonnage, args.ratePerTonne),
        vehicleType: "TIPPER",
        vehiclePlate: args.vehiclePlate,
        driverName: args.driverName,
        pickupFrom: new Date("2026-09-15"),
        pickupTo: new Date("2026-09-18"),
        deliverBy: new Date("2026-09-20"),
        acceptedAt: args.carrierId ? new Date("2026-09-10") : null,
        pickedUpAt: args.jobStatus === "IN_TRANSIT" || args.jobStatus === "DELIVERED" ? new Date("2026-09-16") : null,
        deliveredAt: args.jobStatus === "DELIVERED" ? new Date("2026-09-19") : null,
        commissionFeePaid: feePaid,
        commissionFeeNet: feePaid ? "10.00" : null,
        commissionPaidAt: feePaid ? new Date("2026-09-10") : null,
      },
    });

    if (feePaid && args.carrierId) {
      await prisma.platformCharge.create({
        data: {
          kind: "TRANSPORT_COMMISSION",
          userId: args.carrierId,
          transportJobId: job.id,
          amountNet: "10.00",
          description: `Prowizja za zlecenie ${args.jobRef} (symulacja)`,
        },
      });
    }
  };

  // Reserved lot — job still sitting on the freight board, unclaimed.
  await trade({
    offerRef: "OF-2026-0013",
    purchaseRef: "PU-2026-0001",
    jobRef: "TR-2026-0001",
    buyerId: anna.id,
    deliveryLocationId: inowroclaw.id,
    purchaseStatus: "CONFIRMED",
    jobStatus: "AVAILABLE",
    distanceKm: 140,
    ratePerTonne: "42.00",
  });

  // Claimed by TransAgro, not yet collected.
  await trade({
    offerRef: "OF-2026-0014",
    purchaseRef: "PU-2026-0002",
    jobRef: "TR-2026-0002",
    buyerId: piotr.id,
    deliveryLocationId: poznan.id,
    purchaseStatus: "IN_TRANSPORT",
    jobStatus: "IN_TRANSIT",
    carrierId: katarzyna.id,
    distanceKm: 195,
    ratePerTonne: "48.50",
    vehiclePlate: "PO 4821H",
    driverName: "Zbigniew Mazur",
  });

  // On the road — hauled by the farm's own trucks (FARMER + TRANSPORT user).
  await trade({
    offerRef: "OF-2026-0015",
    purchaseRef: "PU-2026-0003",
    jobRef: "TR-2026-0003",
    buyerId: anna.id,
    deliveryLocationId: gdynia.id,
    purchaseStatus: "IN_TRANSPORT",
    jobStatus: "IN_TRANSIT",
    carrierId: maria.id,
    distanceKm: 210,
    ratePerTonne: "55.00",
    vehiclePlate: "PZ 7710K",
    driverName: "Maria Kowalska",
  });

  // Completed and settled.
  await trade({
    offerRef: "OF-2026-0016",
    purchaseRef: "PU-2026-0004",
    jobRef: "TR-2026-0004",
    buyerId: marek.id,
    deliveryLocationId: szczecin.id,
    purchaseStatus: "SETTLED",
    jobStatus: "DELIVERED",
    carrierId: marek.id,
    distanceKm: 320,
    ratePerTonne: "62.00",
    vehiclePlate: "PSZ 1188N",
    driverName: "Marek Wójcik",
  });

  // Waiting on the demo admin as BUYER: a carrier applied, nobody approved.
  await trade({
    offerRef: "OF-2026-0018",
    purchaseRef: "PU-2026-0005",
    jobRef: "TR-2026-0005",
    buyerId: admin.id,
    deliveryLocationId: poznan.id,
    purchaseStatus: "CONFIRMED",
    jobStatus: "ASSIGNED",
    carrierId: katarzyna.id,
    distanceKm: 165,
    ratePerTonne: "46.00",
    vehiclePlate: "PO 5512J",
    driverName: "Zbigniew Mazur",
  });

  // Waiting on the demo admin as FARMER: a reservation, not a sale. No job.
  await trade({
    offerRef: "OF-2026-0006",
    purchaseRef: "PU-2026-0006",
    jobRef: "TR-2026-0006",
    buyerId: anna.id,
    deliveryLocationId: inowroclaw.id,
    purchaseStatus: "PENDING",
    jobStatus: null,
    distanceKm: 180,
    ratePerTonne: "44.00",
  });

  // --- Reviews: each one anchored to a transaction its author was party to --
  const review = async (args: {
    scope: "TRADE" | "TRANSPORT";
    purchaseRef?: string;
    jobRef?: string;
    authorId: string;
    subjectId: string;
    rating: number;
    comment?: string;
  }) => {
    const purchase = args.purchaseRef
      ? await prisma.purchase.findUniqueOrThrow({
          where: { reference: args.purchaseRef },
          select: { id: true },
        })
      : null;
    const job = args.jobRef
      ? await prisma.transportJob.findUniqueOrThrow({
          where: { reference: args.jobRef },
          select: { id: true },
        })
      : null;

    await prisma.review.create({
      data: {
        scope: args.scope,
        purchaseId: purchase?.id ?? null,
        transportJobId: job?.id ?? null,
        authorId: args.authorId,
        subjectId: args.subjectId,
        rating: args.rating,
        comment: args.comment ?? null,
      },
    });
  };

  // Trade: Piotr bought from Maria (PU-2026-0002)
  await review({ scope: "TRADE", purchaseRef: "PU-2026-0002", authorId: piotr.id, subjectId: maria.id, rating: 5, comment: "Towar zgodny z opisem, szybki załadunek." });
  await review({ scope: "TRADE", purchaseRef: "PU-2026-0002", authorId: maria.id, subjectId: piotr.id, rating: 4, comment: "Płatność bez opóźnień." });

  // Transport on that same trade — carrier Katarzyna
  await review({ scope: "TRANSPORT", jobRef: "TR-2026-0002", authorId: piotr.id, subjectId: katarzyna.id, rating: 5, comment: "Kierowca punktualny." });
  await review({ scope: "TRANSPORT", jobRef: "TR-2026-0002", authorId: katarzyna.id, subjectId: piotr.id, rating: 5 });

  // Trade: Anna bought from Admin (PU-2026-0003), hauled by Maria
  await review({ scope: "TRADE", purchaseRef: "PU-2026-0003", authorId: anna.id, subjectId: admin.id, rating: 4 });
  await review({ scope: "TRADE", purchaseRef: "PU-2026-0003", authorId: admin.id, subjectId: anna.id, rating: 5, comment: "Sprawna komunikacja." });
  await review({ scope: "TRANSPORT", jobRef: "TR-2026-0003", authorId: anna.id, subjectId: maria.id, rating: 5, comment: "Własny transport gospodarstwa, wszystko na czas." });

  // Trade: Marek bought from Jan (PU-2026-0004)
  await review({ scope: "TRADE", purchaseRef: "PU-2026-0004", authorId: marek.id, subjectId: jan.id, rating: 3, comment: "Wilgotność wyższa niż deklarowana." });
  await review({ scope: "TRADE", purchaseRef: "PU-2026-0004", authorId: jan.id, subjectId: marek.id, rating: 4 });

  // Keep the unused base location referenced so it is obviously intentional.
  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "seed.completed",
      entityType: "System",
      entityId: wrzesnia.id,
      metadata: { note: "Database seeded with demo data" },
    },
  });

  const counts = {
    companies: await prisma.company.count(),
    locations: await prisma.location.count(),
    users: await prisma.user.count(),
    offers: await prisma.grainOffer.count(),
    purchases: await prisma.purchase.count(),
    transportJobs: await prisma.transportJob.count(),
    reviews: await prisma.review.count(),
    documents: await prisma.document.count(),
    charges: await prisma.platformCharge.count(),
    offerPhotos: (
      await prisma.grainOffer.findMany({ select: { photoUrls: true } })
    ).reduce((total, offer) => total + offer.photoUrls.length, 0),
  };
  console.table(counts);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
