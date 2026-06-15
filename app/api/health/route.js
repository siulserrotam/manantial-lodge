import { json } from "../../_lib/supabase";

export function GET() {
  return json({
    ok: true,
    service: "Manantial Lodge API",
    runtime: "nextjs"
  });
}
