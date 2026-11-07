import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const otpTypes = new Set<EmailOtpType>(["signup", "invite", "magiclink", "recovery", "email_change", "email"]);

/**
 * Verifies email links that carry a token hash (see the email templates in the
 * README). Unlike /auth/callback, this works when the link is opened in a
 * different browser or device from the one that requested it.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const requestedNext = url.searchParams.get("next");
  const next = requestedNext?.startsWith("/") && !requestedNext.startsWith("//")
    ? requestedNext
    : type === "recovery" ? "/reset-password" : "/";

  if (tokenHash && type && otpTypes.has(type)) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }

  const failure = type === "recovery" || next.startsWith("/reset-password")
    ? "/forgot-password?expired=1"
    : "/auth/confirmation-error";
  return NextResponse.redirect(new URL(failure, url.origin));
}
