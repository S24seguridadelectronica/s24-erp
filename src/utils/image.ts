/**
 * Compresión de imágenes para evidencias.
 *
 * Se guardan como JPEG en base64 (`data:image/jpeg;base64,...`), con un tamaño
 * máximo de 1024 px y calidad 0.7: suficiente para leerse en el PDF y en
 * pantalla sin inflar la base de datos.
 */
export const compressImage = (file: File, maxSize = 1024, quality = 0.7): Promise<string> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error('Canvas no disponible')); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen')); };
    img.src = url;
  });
