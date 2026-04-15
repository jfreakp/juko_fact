import { clearAuthCookieHeader } from "@/lib/auth";

export async function POST() {
  return new Response(
    JSON.stringify({ success: true, data: null }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": clearAuthCookieHeader(),
      },
    }
  );
}
