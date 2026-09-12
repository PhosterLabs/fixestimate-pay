const MAX_IMAGE_BYTES = 4 * 1024 * 1024

export async function imageToDataUrl(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose a photo in JPEG, PNG, or WebP format.')
  if (file.size > MAX_IMAGE_BYTES) throw new Error('Please choose a photo smaller than 4 MB.')

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('We could not read that photo. Please try another one.'))
    reader.readAsDataURL(file)
  })
}
