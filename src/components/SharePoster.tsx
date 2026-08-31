'use client';

import { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { wrapText, truncateWithEllipsis, formatPosterDate } from '@/lib/poster';

// Brand palette for the canvas — mirrors the Tailwind tokens used in the UI
const POSTER = {
  width: 750,
  height: 1000,
  bg: '#F0FDF4',
  card: '#FFFFFF',
  accent: '#10B981',
  deep: '#047857',
  title: '#0F172A',
  body: '#334155',
  muted: '#94A3B8',
};

export interface PosterRow {
  label: string;
  value: string;
}

export interface SharePosterProps {
  /** headline, e.g. product name / 棵树证书 / quarterly report */
  title: string;
  /** small line under the title, e.g. 兑换券 / 抵消项目 */
  subtitle?: string;
  /** key-value rows rendered as a list */
  rows: PosterRow[];
  /** monospaced serial line, e.g. voucher code / certificate no. */
  serial?: string;
  /** value encoded into the drawn QR (voucher code etc.) */
  qrValue?: string;
  /** trailing line, usually the projection */
  footnote?: string;
  fileName: string;
  buttonLabel?: string;
  buttonSize?: 'default' | 'sm';
  buttonClassName?: string;
}

/**
 * Draws a shareable poster on a canvas and downloads it as a PNG — no
 * html2canvas dependency. jsdom has no 2D context, so every canvas touch is
 * guarded; unit tests cover only the pure helpers in lib/poster.ts.
 */
export function SharePoster({
  title,
  subtitle,
  rows,
  serial,
  qrValue,
  footnote,
  fileName,
  buttonLabel = '下载海报',
  buttonSize = 'sm',
  buttonClassName,
}: SharePosterProps) {
  const qrWrapRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  const drawPoster = (): HTMLCanvasElement | null => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    canvas.width = POSTER.width;
    canvas.height = POSTER.height;
    const { width: W, height: H } = POSTER;
    const margin = 44;

    // Background + white card
    ctx.fillStyle = POSTER.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = POSTER.card;
    ctx.beginPath();
    ctx.roundRect(margin, margin, W - margin * 2, H - margin * 2, 28);
    ctx.fill();

    // Header brand
    ctx.fillStyle = POSTER.accent;
    ctx.beginPath();
    ctx.arc(margin + 44, margin + 58, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('G', margin + 44, margin + 59);
    ctx.fillStyle = POSTER.deep;
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('GreenMiles', margin + 84, margin + 58);

    // Title + subtitle
    let y = margin + 170;
    ctx.font = 'bold 40px sans-serif';
    ctx.fillStyle = POSTER.title;
    const measure = (s: string) => ctx.measureText(s).width;
    for (const line of wrapText(truncateWithEllipsis(title, W - margin * 2 - 16, measure), W - margin * 2, measure, 2)) {
      ctx.fillText(line, margin + 16, y);
      y += 52;
    }
    if (subtitle) {
      ctx.font = '26px sans-serif';
      ctx.fillStyle = POSTER.body;
      ctx.fillText(truncateWithEllipsis(subtitle, W - margin * 2 - 16, measure), margin + 16, y + 6);
      y += 56;
    }

    // Divider
    y += 24;
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(margin + 16, y);
    ctx.lineTo(W - margin - 16, y);
    ctx.stroke();
    y += 56;

    // Key-value rows
    ctx.font = '28px sans-serif';
    for (const row of rows) {
      ctx.fillStyle = POSTER.muted;
      ctx.fillText(truncateWithEllipsis(row.label, 220, measure), margin + 16, y);
      ctx.fillStyle = POSTER.title;
      ctx.textAlign = 'right';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText(truncateWithEllipsis(row.value, W - margin * 2 - 280, measure), W - margin - 16, y);
      ctx.textAlign = 'left';
      ctx.font = '28px sans-serif';
      y += 64;
    }

    // QR (if any) drawn from the hidden QRCodeCanvas
    if (qrValue) {
      const qrCanvas = qrWrapRef.current?.querySelector('canvas');
      if (qrCanvas) {
        const size = 210;
        const qx = (W - size) / 2;
        ctx.drawImage(qrCanvas, qx, y + 24, size, size);
        y += 24 + size + 44;
      }
    }

    // Serial line
    if (serial) {
      ctx.font = 'bold 30px monospace';
      ctx.fillStyle = POSTER.deep;
      ctx.textAlign = 'center';
      ctx.fillText(serial, W / 2, y + 10);
      ctx.textAlign = 'left';
      y += 56;
    }

    // Footnote + footer date
    if (footnote) {
      ctx.font = '26px sans-serif';
      ctx.fillStyle = POSTER.accent;
      ctx.textAlign = 'center';
      ctx.fillText(truncateWithEllipsis(footnote, W - margin * 2 - 32, measure), W / 2, H - margin - 116);
    }
    ctx.font = '22px sans-serif';
    ctx.fillStyle = POSTER.muted;
    ctx.textAlign = 'center';
    ctx.fillText(`GreenMiles · ${formatPosterDate(new Date())}`, W / 2, H - margin - 64);
    ctx.textAlign = 'left';

    return canvas;
  };

  const handleDownload = () => {
    setFailed(false);
    const canvas = drawPoster();
    if (!canvas) {
      setFailed(true);
      return;
    }
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${fileName}.png`;
      link.click();
    } catch {
      // Canvas unavailable or tainted — surface it on the button instead of throwing
      setFailed(true);
    }
  };

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <Button
        type="button"
        variant="outline"
        size={buttonSize}
        className={buttonClassName}
        onClick={handleDownload}
      >
        <Download className="h-4 w-4 mr-1" />
        {failed ? '海报不可用' : buttonLabel}
      </Button>
      {/* Off-screen QR source for the canvas drawImage call */}
      <div ref={qrWrapRef} className="absolute -left-[9999px] top-auto" aria-hidden>
        {qrValue && <QRCodeCanvas value={qrValue} size={210} level="M" />}
      </div>
    </div>
  );
}
