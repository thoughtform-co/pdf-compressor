/**
 * Types for the client-side PDF compression engine (port of compress.py).
 */

export interface CompressionStep {
  name: string;
  maxDimension: number;
  quality: number;
}

export type CompressionMode = "server" | "preserveText" | "highCompression";

export interface CompressionResult {
  success: boolean;
  outputBytes: Uint8Array | null;
  originalSizeBytes: number;
  finalSizeBytes: number;
  targetReached: boolean;
  stepUsed: string;
  errorMessage?: string;
}

export interface CompressionProgress {
  message: string;
  step?: string;
  sizeMb?: number;
}

export type ProgressCallback = (progress: CompressionProgress) => void;
