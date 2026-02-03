/**
 * Utility functions for handling gallery image variants
 */

/**
 * Generate variant URL from base image URL
 * @param baseUrl - The base image URL (e.g., "https://example.com/image.webp")
 * @param variant - The variant suffix (e.g., "tile", "dialog", "fullscreen") 
 * @returns The variant URL (e.g., "https://example.com/image-tile.webp")
 */
export function getImageVariant(baseUrl: string, variant: 'tile' | 'dialog' | 'fullscreen'): string {
  if (!baseUrl) return baseUrl;
  
  // Handle the case where the URL might already have a variant suffix
  const cleanUrl = baseUrl.replace(/-(?:tile|dialog|fullscreen)(?=\.[^.]+$)/, '');
  
  // Insert the variant suffix before the file extension
  return cleanUrl.replace(/(\.[^.]+)$/, `-${variant}$1`);
}

/**
 * Get the best image URL for gallery tiles (380x380 square, cropped)
 */
export function getTileImageUrl(baseUrl: string): string {
  return getImageVariant(baseUrl, 'tile');
}

/**
 * Get the best image URL for dialog/modal display (1280x720, letterboxed)
 */
export function getDialogImageUrl(baseUrl: string): string {
  return getImageVariant(baseUrl, 'dialog');
}

/**
 * Get the best image URL for fullscreen display (1920x1080, letterboxed)
 */
export function getFullscreenImageUrl(baseUrl: string): string {
  return getImageVariant(baseUrl, 'fullscreen');
}

/**
 * Get thumbnail URL - alias for tile variant
 */
export function getThumbnailUrl(baseUrl: string): string {
  return getTileImageUrl(baseUrl);
}