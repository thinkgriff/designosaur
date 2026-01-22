import OpenAI, { toFile } from "openai";
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Upstash
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Rate limits
const perMinute = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "1 m"), // 3 per minute
  analytics: true,
});

const perDay = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(20, "1 d"), // 20 per day
  analytics: true,
});

// Palettes (no UI)
const BG_CIRCLE_COLORS = ["#FFD36E", "#FFB703", "#9AD7FF", "#FFB3C7", "#CDB4DB", "#B7E4C7"];
const DINO_SKIN_COLORS = ["#7BCF9E", "#9ACD32", "#6FB98F", "#8DB580", "#B5A76C"];
const ACCENT_COLORS = ["#102447", "#1F2A1F", "#4A2A14", "#5C4033", "#3A3A3A"];
const INK_COLORS = ["#0B0F16", "#111111", "#1A1A1A"]; // always dark

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makePrompt(p: {
  bgCircleColor: string;
  dinoSkinColor: string;
  accentColor: string;
  inkColor: string;
}) {
  return `
Transform the person in the USER PHOTO into a "Designosaur" character that closely matches the STYLE REFERENCE.

You will receive TWO images:
1) USER PHOTO: preserve identity and facial likeness AND body vibe (clothing/shape).
2) STYLE REFERENCE: match character design + illustration style closely.

MATCH STYLE REFERENCE:
- body proportions + silhouette + outfit style
- bold, clean outlines with subtle texture
- playful, friendly mascot-style illustration

MAKE IT FEEL OLD / VETERAN / "DESIGNOSAUR":
- subtle wrinkles/creases; tired-but-kind eyes; faint smile lines
- gentle “seasoned pro” vibe (confident, not frail)
- hints of gray/white accents where appropriate

COLOR DIRECTION:
- background circle: ${p.bgCircleColor}
- dinosaur skin/body: ${p.dinoSkinColor}
- accents (clothing/highlights): ${p.accentColor}
- ink/outline: ${p.inkColor} (dark, high-contrast)

COMPOSITION:
- single subject, centered
- simple clean background with a bold circle behind the character
- no extra characters
- not photorealistic
`;
}

function getClientIp(req: Request) {
  // Vercel commonly provides x-forwarded-for; first value is the original client
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const xri = req.headers.get("x-real-ip");
  if (xri) return xri.trim();
  return "unknown";
}

export async function POST(req: Request) {
  try {
    // Rate limiting (minute + day)
    const ip = getClientIp(req);
    const key = `designosaur:${ip}`;

    const [minRes, dayRes] = await Promise.all([
      perMinute.limit(`${key}:m`),
      perDay.limit(`${key}:d`),
    ]);

    if (!minRes.success) {
      return NextResponse.json(
        {
          error: "Too many dinos too fast 🦖💨 Try again in a minute.",
          scope: "minute",
          limit: minRes.limit,
          remaining: minRes.remaining,
          reset: minRes.reset,
        },
        { status: 429, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (!dayRes.success) {
      return NextResponse.json(
        {
          error: "Daily dino limit reached 🦖🌙 Come back tomorrow.",
          scope: "day",
          limit: dayRes.limit,
          remaining: dayRes.remaining,
          reset: dayRes.reset,
        },
        { status: 429, headers: { "Cache-Control": "no-store" } }
      );
    }

    const formData = await req.formData();
    const userImage = formData.get("image") as File | null;

    if (!userImage) {
      return NextResponse.json({ error: "No image uploaded" }, { status: 400 });
    }

    // Load style reference from /public
    const stylePath = path.join(process.cwd(), "public", "designosaur-style.png");
    const styleBuffer = await fs.readFile(stylePath);

    // Convert inputs to OpenAI files
    const userBuffer = Buffer.from(await userImage.arrayBuffer());
    const userFile = await toFile(userBuffer, userImage.name || "user.jpg", {
      type: userImage.type || "image/jpeg",
    });

    const styleFile = await toFile(styleBuffer, "designosaur-style.png", {
      type: "image/png",
    });

    // 3 variants, each with its own palette
    const palettes = Array.from({ length: 3 }).map(() => ({
      bgCircleColor: pick(BG_CIRCLE_COLORS),
      dinoSkinColor: pick(DINO_SKIN_COLORS),
      accentColor: pick(ACCENT_COLORS),
      inkColor: pick(INK_COLORS),
    }));

    const imagesB64 = await Promise.all(
      palettes.map(async (p) => {
        const rsp = await openai.images.edit({
          model: "gpt-image-1",
          image: [userFile, styleFile],
          prompt: makePrompt(p),
          n: 1,
          size: "1024x1024",
          output_format: "png",
          input_fidelity: "high",
        });

        const b64 = rsp.data?.[0]?.b64_json;
        if (!b64) throw new Error("No image returned from API");
        return b64;
      })
    );

    return NextResponse.json(
      { images: imagesB64.map((b64) => `data:image/png;base64,${b64}`) },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: any) {
    console.error("DESIGNOSAUR_API_ERROR", err);
    return NextResponse.json(
      { error: err?.message || "Failed to generate image" },
      { status: 500 }
    );
  }
}
