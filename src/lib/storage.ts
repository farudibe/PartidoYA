import { supabase } from './supabaseClient'

// Sube una imagen (foto del comprobante) al bucket público "comprobantes"
// y devuelve la URL pública para guardarla en la base de datos.
export async function subirComprobante(file: File, carpeta: string): Promise<string> {
  const extension = file.name.split('.').pop()
  const path = `${carpeta}/${Date.now()}.${extension}`
  const { error } = await supabase.storage.from('comprobantes').upload(path, file)
  if (error) throw error
  const { data } = supabase.storage.from('comprobantes').getPublicUrl(path)
  return data.publicUrl
}
