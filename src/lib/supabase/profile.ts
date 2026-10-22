import type { User } from "@supabase/supabase-js";
import type { createSupabaseServerClient } from "./server";

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type ProfileRecord = {
  id: string;
  full_name: string;
  avatar_path: string | null;
  bio: string;
  location: string;
  languages: string[];
  timezone: string;
  availability: string;
  teaching_skills: string[];
  learning_skills: string[];
  onboarding_complete: boolean;
  role: "member" | "admin";
  credit_balance: number;
  pending_credits: number;
  created_at: string;
};

export type PublicProfile = {
  id: string;
  name: string;
  avatarUrl: string;
  email: string;
  bio: string;
  location: string;
  languages: string[];
  timezone: string;
  availability: string;
  teaching: string[];
  learning: string[];
  onboardingComplete: boolean;
  role: "member" | "admin";
  balance: number;
  pending: number;
  createdAt: string;
};

export async function getProfile(
  supabase: SupabaseClient,
  user: User,
): Promise<PublicProfile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<ProfileRecord>();

  if (error) {
    throw new Error(`Could not load profile: ${error.message}`);
  }

  const avatarUrl = data.avatar_path
    ? supabase.storage.from("avatars").getPublicUrl(data.avatar_path).data.publicUrl
    : "";
  return mapProfile(data, user.email, avatarUrl);
}

export function mapProfile(profile: ProfileRecord, email?: string, avatarUrl = ""): PublicProfile {
  return {
    id: profile.id,
    name: profile.full_name,
    avatarUrl,
    email: email ?? "",
    bio: profile.bio,
    location: profile.location,
    languages: profile.languages,
    timezone: profile.timezone,
    availability: profile.availability,
    teaching: profile.teaching_skills,
    learning: profile.learning_skills,
    onboardingComplete: profile.onboarding_complete,
    role: profile.role,
    balance: Number(profile.credit_balance),
    pending: Number(profile.pending_credits),
    createdAt: profile.created_at,
  };
}
