import { supabase } from '~/lib/supabase/client'

const BUCKET = 'markdown-uploads'

/**
 * Upload a file to Supabase Storage for use in Milkdown editors.
 * Returns the permanent public URL.
 */
export async function uploadToSupabaseStorage(
  file: File,
  facetId: string,
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'bin'
  const randomId = crypto.randomUUID()
  const path = `${facetId}/${randomId}.${ext}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, file)

  if (error) throw new Error(`Upload failed: ${error.message}`)

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path)

  return publicUrl
}
