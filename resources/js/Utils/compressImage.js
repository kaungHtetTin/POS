const MAX_IMAGE_BYTES = 250 * 1024;

const canvasBlob = (canvas, type, quality) => new Promise((resolve) => canvas.toBlob(resolve, type, quality));

export async function compressImage(file, maxBytes = MAX_IMAGE_BYTES) {
    if (!file || !file.type?.startsWith('image/')) throw new Error('Please choose a valid image file.');
    if (file.size <= maxBytes) return file;

    const bitmap = await createImageBitmap(file);
    let width = bitmap.width;
    let height = bitmap.height;
    const longest = Math.max(width, height);
    if (longest > 1920) {
        const ratio = 1920 / longest;
        width = Math.max(1, Math.round(width * ratio));
        height = Math.max(1, Math.round(height * ratio));
    }

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { alpha: false });
    for (let attempt = 0; attempt < 8; attempt += 1) {
        canvas.width = width;
        canvas.height = height;
        context.fillStyle = '#fff';
        context.fillRect(0, 0, width, height);
        context.drawImage(bitmap, 0, 0, width, height);
        for (const quality of [0.82, 0.72, 0.62, 0.52, 0.42, 0.34]) {
            const blob = await canvasBlob(canvas, 'image/jpeg', quality);
            if (blob && blob.size <= maxBytes) {
                bitmap.close?.();
                return new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'photo'}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
            }
        }
        width = Math.max(320, Math.round(width * 0.82));
        height = Math.max(320, Math.round(height * 0.82));
    }
    bitmap.close?.();
    throw new Error('The image could not be compressed below 250 KB. Please choose a smaller image.');
}

export { MAX_IMAGE_BYTES };
