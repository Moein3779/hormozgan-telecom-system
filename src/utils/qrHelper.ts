/**
 * QR Code download and rendering utilities
 */

export function downloadQrCodeAsPng(svgElementId: string, fileName: string): void {
  const svg = document.getElementById(svgElementId);
  if (!svg) return;

  const svgData = new XMLSerializer().serializeToString(svg);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const img = new Image();

  img.onload = () => {
    canvas.width = 600;
    canvas.height = 600;
    if (ctx) {
      // White background for QR code
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 30, 30, 540, 540);

      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `${fileName}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    }
  };

  img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
}

export async function shareUrl(
  url: string,
  title: string,
  text: string
): Promise<'shared' | 'copied' | 'cancelled'> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url });
      return 'shared';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return 'cancelled';
      }
      // Fall through to clipboard copy if share failed
    }
  }

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return 'copied';
    }
  } catch {
    // Fall back to execCommand below
  }

  if (typeof document !== 'undefined') {
    const textarea = document.createElement('textarea');
    textarea.value = url;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
  return 'copied';
}
