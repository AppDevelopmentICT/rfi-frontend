import PocketBase from "pocketbase";

export { PB_AUTH_COOKIE } from "@/constants/auth";

const url =
  process.env.NEXT_PUBLIC_POCKETBASE_URL || "http://127.0.0.1:8090";

export const pb = new PocketBase(url);
