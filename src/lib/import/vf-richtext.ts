import type { VFTextSegment, VFRichTextNode } from './types';

/**
 * Convert a VF rich text segment array into an HTML string.
 * Handles: plain text strings, bold (fontWeight "700"), italic (fontStyle "italic"),
 * and arbitrarily nested text segments.
 */
export function vfRichTextToHtml(textArray: VFTextSegment[]): string {
  return textArray
    .map((segment) => {
      // Plain string segment
      if (typeof segment === 'string') {
        return escapeHtml(segment);
      }

      // Rich text node with possible attributes and nested text
      return processRichTextNode(segment);
    })
    .join('');
}

function processRichTextNode(node: VFRichTextNode): string {
  const texts = Array.isArray(node.text) ? node.text : [node.text];
  let inner = '';

  for (const item of texts) {
    if (typeof item === 'string') {
      inner += escapeHtml(item);
    } else {
      // Recursively process nested rich text
      inner += processRichTextNode(item);
    }
  }

  // Apply formatting attributes
  if (node.attributes?.fontWeight === '700') {
    inner = `<b>${inner}</b>`;
  }
  if (node.attributes?.fontStyle === 'italic') {
    inner = `<i>${inner}</i>`;
  }

  return inner;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
