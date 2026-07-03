"use server";

import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { EarlyAccessFormState } from "@/lib/early-access-state";

type ActionResult<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: string;
    };

type EarlyAccessResult = {
  duplicate: boolean;
};

const earlyAccessSchema = z.object({
  email: z.email("Enter a valid email address").trim().toLowerCase().max(255),
  source: z.string().trim().max(80).default("landing"),
});

function isUniqueViolation(error: { code?: string; message?: string }) {
  return error.code === "23505" || error.message?.toLowerCase().includes("duplicate");
}

function createEarlyAccessClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function sendEarlyAccessNotification(email: string, source: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.EARLY_ACCESS_TO_EMAIL;
  const from = process.env.EARLY_ACCESS_FROM_EMAIL;

  if (!apiKey || !to || !from) {
    console.warn("[early-access] Resend env vars missing; signup stored without notification.");
    return false;
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to,
      subject: "New Nyabag early access signup",
      text: `New Nyabag early access signup\n\nEmail: ${email}\nSource: ${source}`,
    });

    if (error) {
      console.error("[early-access] Resend notification failed:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[early-access] Resend notification threw:", error);
    return false;
  }
}

export async function submitEarlyAccessSignup(
  formData: FormData
): Promise<ActionResult<EarlyAccessResult>> {
  const parsed = earlyAccessSchema.safeParse({
    email: formData.get("email"),
    source: formData.get("source") ?? "landing",
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid signup details",
    };
  }

  let supabase: ReturnType<typeof createEarlyAccessClient>;
  try {
    supabase = createEarlyAccessClient();
  } catch (error) {
    console.error("[early-access] Supabase env vars missing:", error);
    return {
      success: false,
      error: "Could not join early access. Please email hello@nyabag.com.",
    };
  }

  const { email, source } = parsed.data;
  const { error } = await supabase.from("early_access_signups").insert({
    email,
    source,
  });

  if (error) {
    if (isUniqueViolation(error)) {
      return {
        success: true,
        data: {
          duplicate: true,
        },
      };
    }

    console.error("[early-access] Signup insert failed:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    const notified = await sendEarlyAccessNotification(
      email,
      `${source} (database insert failed: ${error.code ?? "unknown"})`
    );

    if (notified) {
      return {
        success: true,
        data: {
          duplicate: false,
        },
      };
    }

    return {
      success: false,
      error: "Could not join early access. Please email hello@nyabag.com.",
    };
  }

  await sendEarlyAccessNotification(email, source);

  return {
    success: true,
    data: {
      duplicate: false,
    },
  };
}

export async function submitEarlyAccessSignupForm(
  _previousState: EarlyAccessFormState,
  formData: FormData
): Promise<EarlyAccessFormState> {
  const result = await submitEarlyAccessSignup(formData);

  if (!result.success) {
    return {
      status: "error",
      message: result.error,
    };
  }

  if (result.data.duplicate) {
    return {
      status: "success",
      message: "You are already on the early access list. We will send an invite when spots open.",
      duplicate: true,
    };
  }

  return {
    status: "success",
    message: "You are on the early access list. We will send an invite when spots open.",
    duplicate: false,
  };
}
