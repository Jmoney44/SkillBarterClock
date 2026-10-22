import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const maxFileSize = 5 * 1024 * 1024;
const maxRequestSize = maxFileSize + 64 * 1024;
const mimeToExtension = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

type AvatarMimeType = keyof typeof mimeToExtension;

function isAvatarMimeType(value: string): value is AvatarMimeType {
  return Object.hasOwn(mimeToExtension, value);
}

function matchesFileSignature(bytes: Uint8Array, mimeType: AvatarMimeType) {
  if (mimeType === "image/jpeg") {
    return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return bytes.length > 8
      && bytes[0] === 0x89
      && bytes[1] === 0x50
      && bytes[2] === 0x4e
      && bytes[3] === 0x47
      && bytes[4] === 0x0d
      && bytes[5] === 0x0a
      && bytes[6] === 0x1a
      && bytes[7] === 0x0a;
  }
  return bytes.length > 12
    && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF"
    && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
}

async function authenticatedClient() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { response: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  return { supabase, user };
}

export async function POST(request: Request) {
  const auth = await authenticatedClient();
  if ("response" in auth) return auth.response;

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxRequestSize) {
    return NextResponse.json({ error: "Use an image no larger than 5 MB." }, { status: 413 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Upload a valid image file." }, { status: 400 });
  }

  const file = formData.get("avatar");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose an image file to upload." }, { status: 400 });
  }
  if (file.size === 0 || file.size > maxFileSize || !isAvatarMimeType(file.type)) {
    return NextResponse.json({ error: "Use a JPEG, PNG, or WebP image no larger than 5 MB." }, { status: 400 });
  }

  const fileBytes = new Uint8Array(await file.arrayBuffer());
  if (!matchesFileSignature(fileBytes, file.type)) {
    return NextResponse.json({ error: "The image file contents do not match its file type." }, { status: 400 });
  }

  const { data: currentProfile, error: profileReadError } = await auth.supabase
    .from("profiles")
    .select("avatar_path")
    .eq("id", auth.user.id)
    .single<{ avatar_path: string | null }>();
  if (profileReadError) {
    console.error("Could not load current profile image:", profileReadError);
    return NextResponse.json({ error: "Could not load your current profile image." }, { status: 500 });
  }

  const extension = mimeToExtension[file.type];
  const avatarPath = `${auth.user.id}/${crypto.randomUUID()}.${extension}`;
  const storage = auth.supabase.storage.from("avatars");
  const { error: uploadError } = await storage.upload(avatarPath, fileBytes, {
    contentType: file.type,
    cacheControl: "3600",
    upsert: false,
  });
  if (uploadError) {
    console.error("Could not upload profile image:", uploadError);
    return NextResponse.json({ error: "Could not upload your profile image." }, { status: 500 });
  }

  const { error: updateError } = await auth.supabase.rpc("set_my_avatar_path", {
    p_avatar_path: avatarPath,
  });
  if (updateError) {
    const { error: cleanupError } = await storage.remove([avatarPath]);
    if (cleanupError) console.error("Could not clean up a profile image after its profile update failed:", cleanupError);
    console.error("Could not save profile image path:", updateError);
    return NextResponse.json({ error: "The image uploaded, but could not be saved to your profile." }, { status: 500 });
  }

  let cleanupWarning = "";
  if (currentProfile.avatar_path) {
    const { error: cleanupError } = await storage.remove([currentProfile.avatar_path]);
    if (cleanupError) {
      console.error("Could not remove the previous profile image:", cleanupError);
      cleanupWarning = "Your new image is saved, but the previous image could not be cleaned up.";
    }
  }

  const avatarUrl = storage.getPublicUrl(avatarPath).data.publicUrl;
  return NextResponse.json({ success: true, avatarUrl, cleanupWarning });
}

export async function DELETE() {
  const auth = await authenticatedClient();
  if ("response" in auth) return auth.response;

  const { data: currentProfile, error: profileReadError } = await auth.supabase
    .from("profiles")
    .select("avatar_path")
    .eq("id", auth.user.id)
    .single<{ avatar_path: string | null }>();
  if (profileReadError) {
    console.error("Could not load current profile image:", profileReadError);
    return NextResponse.json({ error: "Could not load your current profile image." }, { status: 500 });
  }

  const { error: updateError } = await auth.supabase.rpc("set_my_avatar_path", {
    p_avatar_path: null,
  });
  if (updateError) {
    console.error("Could not remove profile image from profile:", updateError);
    return NextResponse.json({ error: "Could not remove your profile image." }, { status: 500 });
  }

  let cleanupWarning = "";
  if (currentProfile.avatar_path) {
    const { error: cleanupError } = await auth.supabase.storage.from("avatars").remove([currentProfile.avatar_path]);
    if (cleanupError) {
      console.error("Could not delete removed profile image:", cleanupError);
      cleanupWarning = "Your profile image was removed, but its stored file could not be cleaned up.";
    }
  }

  return NextResponse.json({ success: true, cleanupWarning });
}
