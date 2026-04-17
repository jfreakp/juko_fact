import { cookies } from "next/headers";
import { apiSuccess } from "@/lib/api";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete("auth_token");
  return apiSuccess(null);
}
