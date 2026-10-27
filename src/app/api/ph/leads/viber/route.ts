import type { NextRequest } from "next/server";
import { chatRedirect } from "@/lib/server/chat-redirect";

/** "Chat on Viber". viber://chat needs the number with "+" encoded as %2B. */
export function GET(req: NextRequest) {
  return chatRedirect(req, "VIBER", (agent) => `viber://chat?number=${encodeURIComponent(agent.viber)}`);
}
