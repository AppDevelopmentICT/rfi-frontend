import Cookies from "js-cookie";

import { PB_AUTH_COOKIE } from "@/constants/auth";
import { pb } from "@/lib/pocketbase";
import { isCompanyEmail } from "@/lib/company-email";

/** Clears PocketBase auth if email is not from an allowed company domain (when NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS is set). Returns true if session is OK. */
export function clearAuthIfWrongCompanyDomain(): boolean {
  const strict = Boolean(
    process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS?.trim() &&
      process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS !== "*",
  );
  if (!strict) return true;

  const token = pb.authStore.token;
  const email = pb.authStore.record?.email as string | undefined;
  if (!token || !email) return true;

  if (!isCompanyEmail(email)) {
    pb.authStore.clear();
    Cookies.remove(PB_AUTH_COOKIE, { path: "/" });
    return false;
  }
  return true;
}
