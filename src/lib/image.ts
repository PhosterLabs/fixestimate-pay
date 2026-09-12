const MAX_SOURCE_BYTES = 20 * 1024 * 1024
const MAX_OUTPUT_BYTES = 1_500_000
const MAX_DIMENSION = 1600

function canvasBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('We could not compress that photo.')), 'image/jpeg', quality)
  })
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('We could not read that photo. Please try another one.'))
    reader.readAsDataURL(blob)
  })
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => { URL.revokeObjectURL(url); resolve(image) }
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('This photo format could not be opened. Try JPEG, PNG, or WebP.')) }
    image.src = url
  })
}

export async function imageToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image from your camera or photo library.')
  if (file.size > MAX_SOURCE_BYTES) throw new Error('Please choose a photo smaller than 20 MB.')

  const image = await loadImage(file)
  const initialScale = Math.min(1, MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight))
  const attempts = [
    { scale: initialScale, quality: 0.82 },
    { scale: initialScale * 0.85, quality: 0.72 },
    { scale: initialScale * 0.7, quality: 0.62 },
  ]

  for (const attempt of attempts) {
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * attempt.scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * attempt.scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Photo compression is not supported on this device.')
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const blob = await canvasBlob(canvas, attempt.quality)
    if (blob.size <= MAX_OUTPUT_BYTES) return blobToDataUrl(blob)
  }

  throw new Error('We could not make that photo small enough. Try cropping it and upload again.')
}
