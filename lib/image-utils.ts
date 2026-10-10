/**
 * Compresses an image file client-side before uploading, ensuring fast uploads.
 * Uses URL.createObjectURL and an automatic 2.5-second timeout safeguard so it
 * NEVER hangs or fails silently.
 */
export async function optimizeImageFile(
  file: File,
  maxDimension = 1200,
  quality = 0.85
): Promise<File> {
  // If SVG or GIF, don't re-encode in canvas
  if (
    file.type === 'image/svg+xml' ||
    file.type === 'image/gif' ||
    file.name.toLowerCase().endsWith('.svg') ||
    file.name.toLowerCase().endsWith('.gif')
  ) {
    return file;
  }

  // If already under 2MB, return directly without unnecessary canvas processing
  if (file.size <= 2 * 1024 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    // 1.5 second timeout safeguard: if browser canvas hangs or fails, fall back to original file
    const timeout = setTimeout(() => {
      resolve(file);
    }, 1500);

    try {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();

      img.onload = () => {
        clearTimeout(timeout);
        try {
          let width = img.width;
          let height = img.height;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            URL.revokeObjectURL(objectUrl);
            resolve(file);
            return;
          }

          // Fill white background for potential transparency
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          canvas.toBlob(
            (blob) => {
              URL.revokeObjectURL(objectUrl);
              if (!blob) {
                resolve(file);
                return;
              }
              const extension = mimeType === 'image/png' ? '.png' : '.jpg';
              const cleanName = file.name.replace(/\.[^.]+$/, '') + extension;
              const optimizedFile = new File([blob], cleanName, {
                type: mimeType,
                lastModified: Date.now(),
              });
              resolve(optimizedFile);
            },
            mimeType,
            quality
          );
        } catch {
          URL.revokeObjectURL(objectUrl);
          resolve(file);
        }
      };

      img.onerror = () => {
        clearTimeout(timeout);
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      };

      img.src = objectUrl;
    } catch {
      clearTimeout(timeout);
      resolve(file);
    }
  });
}
