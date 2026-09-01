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

// Sube las fotos de una cancha al bucket público "canchas-fotos" y
// devuelve la lista de URLs públicas (una por foto, en orden).
export async function subirFotosCancha(files: File[], carpeta: string): Promise<string[]> {
  const urls: string[] = []
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const extension = file.name.split('.').pop()
    const path = `${carpeta}/${Date.now()}-${i}.${extension}`
    const { error } = await supabase.storage.from('canchas-fotos').upload(path, file)
    if (error) throw error
    const { data } = supabase.storage.from('canchas-fotos').getPublicUrl(path)
    urls.push(data.publicUrl)
  }
  return urls
}
