import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";

export async function GET() {
  const modelPath = join(
    process.cwd(),
    "components",
    "models",
    "kuma_heavy_robot_r-9000s.glb",
  );
  const model = await readFile(modelPath);

  return new Response(new Uint8Array(model), {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": String(model.byteLength),
      "Content-Type": "model/gltf-binary",
    },
  });
}
