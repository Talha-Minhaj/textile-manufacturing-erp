import { getSession } from "@/lib/auth";
import { aiQuerySchema } from "@/lib/schemas";
import { executeNaturalLanguageQuery } from "@/modules/ai/query-engine";

export const dynamic = "force-dynamic";

/**
 * Forward Deployed AI Query Assistant Endpoint.
 * Accepts natural language business queries, maps them to grounded schema queries,
 * and returns structured analytical cards and metrics.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Please sign in to access AI assistant." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = aiQuerySchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const response = await executeNaturalLanguageQuery(parsed.data.query);
    return Response.json(response);
  } catch (error: any) {
    return Response.json(
      { error: error?.message || "Failed to process natural language business query." },
      { status: 500 }
    );
  }
}
