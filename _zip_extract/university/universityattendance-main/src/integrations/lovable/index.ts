// Replaced Lovable-specific auth with standard Supabase OAuth
import { supabase } from "@/supabase/client";

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

export const lovable = {
  auth: {
    signInWithOAuth: async (provider: "google" | "apple" | "microsoft" | "lovable", opts?: SignInOptions) => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider === "lovable" ? "google" : provider,
        options: {
          redirectTo: opts?.redirect_uri ?? window.location.origin + "/check-in",
          queryParams: opts?.extraParams,
        },
      });
      if (error) return { error };
      return { redirected: true };
    },
  },
};
