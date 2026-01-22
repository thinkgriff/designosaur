import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const PALETTES = [
  "muted sage green skin with warm tan jacket and faded cream background",
  "dusty olive skin with rust brown clothing and soft yellow background",
  "aged moss green skin with charcoal jacket and pale teal background",
];

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const image = form.get("image") as File | null;

    if (!image) {
      return NextResponse.json(
        { error: "No image uploaded" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await image.arrayBuffer());

    const images: string[] = [];

    for (let i = 0; i < 3; i++) {
      const result = await openai.images.generate({
        model: "gpt-image-1",
        image: buffer,
        size: "1024x1024",
        prompt: `
Create a hand-drawn, vintage illustration of an older anthropomorphic dinosaur.
Keep the person's facial features and body proportions recognizable, but redraw
them as a dinosaur character. The dinosaur should look seasoned, wise, and
experienced — wrinkles, age lines, and a gentle expression are encouraged.

Do NOT copy the pose from the original photo.
Use a new relaxed seated pose with a laptop.

Art style: mid-century editorial illustration, visible ink outlines,
slightly rough texture, warm paper grain.
Ink lines should be darker than the fill colors.

Color palette: ${PALETTES[i]}.
`,
      });

      images.push(
        `data:image/png;base64,${result.data[0].b64_json}`
      );
    }

    return NextResponse.json({ images });
  } catch (err: any) {
    console.error("DESIGNOSAUR ERROR", err);
    return NextResponse.json(
      { error: err.message || "Generation failed" },
      { status: 500 }
    );
  }
}
