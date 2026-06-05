// ─── Node.js Canvas Factory for pdfjs-dist ──────────────────────────────────
// pdfjs-dist requires a DOM CanvasFactory in browser environments.
// In Node.js we implement the interface using the `canvas` package.

import { Injectable } from '@nestjs/common';
import { Canvas, CanvasRenderingContext2D } from 'canvas';
import canvas from 'canvas';

interface CanvasAndContext {
  canvas: Canvas;
  context: CanvasRenderingContext2D;
}

@Injectable()
export class NodeCanvasFactory {
  private readonly Canvas = canvas;

  create(width: number, height: number): CanvasAndContext {
    if (width <= 0 || height <= 0) throw new Error(`Invalid canvas dimensions: ${width}x${height}`);

    const canvas = this.Canvas.createCanvas(width, height);
    const context = canvas.getContext('2d');
    return { canvas, context };
  }

  reset(canvasAndContext: CanvasAndContext, width: number, height: number): void {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }

  destroy(canvasAndContext: CanvasAndContext): void {
    // Release native canvas resources (important for long-running processes)
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
  }
}
