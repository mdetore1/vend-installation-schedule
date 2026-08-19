import { supabase } from "./supabaseClient";

// Uploads to the public "task-attachments" bucket under a name that can't
// collide with another upload, and hands back the file's public URL.
export async function uploadAttachment(file) {
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from("task-attachments").upload(path, file);
  if (error) throw error;
  return supabase.storage.from("task-attachments").getPublicUrl(path).data.publicUrl;
}
