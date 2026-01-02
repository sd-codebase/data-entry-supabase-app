/**
 * Utility functions for manipulating image syntax in text
 * Image syntax: {{img_FILENAME_img}} or {{imgcell_FILENAME_imgcell}}
 */

/**
 * Toggle "smile-" prefix on image filename in selected text
 * If smile- exists, remove it. If not, add it.
 * @example {{img_diagram.jpg_img}} → {{img_smile-diagram.jpg_img}}
 * @example {{img_smile-diagram.jpg_img}} → {{img_diagram.jpg_img}}
 */
export function toggleSmilePrefix(text: string): string {
  // Check if smile- prefix exists
  const hasSmile = /\{\{(img|imgcell)_smile-/.test(text);

  if (hasSmile) {
    // Remove smile- prefix
    return text
      .replace(/\{\{img_smile-([^}]+)_img\}\}/g, "{{img_$1_img}}")
      .replace(/\{\{imgcell_smile-([^}]+)_imgcell\}\}/g, "{{imgcell_$1_imgcell}}");
  } else {
    // Add smile- prefix
    return text
      .replace(/\{\{img_([^}]+)_img\}\}/g, "{{img_smile-$1_img}}")
      .replace(/\{\{imgcell_([^}]+)_imgcell\}\}/g, "{{imgcell_smile-$1_imgcell}}");
  }
}

/**
 * Replace any file extension with .jpg in image syntax
 * @example {{img_diagram.xyz_img}} → {{img_diagram.jpg_img}}
 */
export function replaceExtensionWithJpg(text: string): string {
  return text
    .replace(
      /\{\{img_(.+)\.[a-zA-Z0-9]+_img\}\}/g,
      "{{img_$1.jpg_img}}"
    )
    .replace(
      /\{\{imgcell_(.+)\.[a-zA-Z0-9]+_imgcell\}\}/g,
      "{{imgcell_$1.jpg_imgcell}}"
    );
}

/**
 * Replace any file extension with .png in image syntax
 * @example {{img_diagram.xyz_img}} → {{img_diagram.png_img}}
 */
export function replaceExtensionWithPng(text: string): string {
  return text
    .replace(
      /\{\{img_(.+)\.[a-zA-Z0-9]+_img\}\}/g,
      "{{img_$1.png_img}}"
    )
    .replace(
      /\{\{imgcell_(.+)\.[a-zA-Z0-9]+_imgcell\}\}/g,
      "{{imgcell_$1.png_imgcell}}"
    );
}

/**
 * Replace any file extension with .jpeg in image syntax
 * @example {{img_diagram.xyz_img}} → {{img_diagram.jpeg_img}}
 */
export function replaceExtensionWithJpeg(text: string): string {
  return text
    .replace(
      /\{\{img_(.+)\.[a-zA-Z0-9]+_img\}\}/g,
      "{{img_$1.jpeg_img}}"
    )
    .replace(
      /\{\{imgcell_(.+)\.[a-zA-Z0-9]+_imgcell\}\}/g,
      "{{imgcell_$1.jpeg_imgcell}}"
    );
}

/**
 * Check if text contains image syntax
 */
export function hasImageSyntax(text: string): boolean {
  return /\{\{(img|imgcell)_[^}]+_(img|imgcell)\}\}/.test(text);
}
