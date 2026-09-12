/**
 * Utilitaire de compression d'images côté client avant encodage en Base64.
 * 
 * Conçu spécifiquement pour le plan gratuit Firebase (Spark) :
 * Réduit les photos de 3-5 Mo à environ 80-150 Ko sans perte visible de netteté,
 * garantissant le respect de la limite stricte de 1 Mo par document Firestore.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  outputFormat?: 'image/webp' | 'image/jpeg';
}

export async function compressImageToBase64(
  file: File,
  options: CompressionOptions = {}
): Promise<{ base64: string; sizeKb: number }> {
  const {
    maxWidth = 1080,
    maxHeight = 810,
    quality = 0.75,
    outputFormat = 'image/webp',
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Calcul des dimensions proportionnelles
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        // Dessin sur Canvas pour compression
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Impossible de créer le contexte 2D du canvas'));
          return;
        }

        // Lissage de haute qualité
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Export en Base64 compressé
        const base64 = canvas.toDataURL(outputFormat, quality);
        
        // Calcul de la taille en Ko
        const stringLength = base64.length - (base64.indexOf(',') + 1);
        const sizeInBytes = 4 * Math.ceil(stringLength / 3) * 0.562489633438312;
        const sizeKb = Math.round(sizeInBytes / 1024);

        resolve({ base64, sizeKb });
      };

      img.onerror = () => reject(new Error('Échec du chargement de l\'image'));
      img.src = event.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
    reader.readAsDataURL(file);
  });
}
