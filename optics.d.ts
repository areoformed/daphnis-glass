export interface Optics {
  refractiveIndex?: number;
  surroundingIndex?: number;
  /** CSS pixels; default 6. */
  thickness?: number;
  /** Distance below the pane to the source plane, in CSS pixels; default 0. */
  gap?: number;
}
export interface ResolvedOptics {
  readonly refractiveIndex: number;
  readonly surroundingIndex: number;
  readonly thickness: number;
  readonly gap: number;
}
export type Vector3 = readonly [number, number, number];
export interface InterfaceRay {
  transmitted: [number, number, number] | null;
  reflected: [number, number, number];
  reflectance: number;
  Rs: number;
  Rp: number;
  tir: boolean;
}
export interface OpticalMapParameters { w: number; h: number; radius: number; optics?: Optics; }
export interface OpticalMapStats {
  readonly model: 'rounded-cap-direct';
  readonly source: number;
  readonly tir: number;
  readonly escaped: number;
  readonly outside: number;
  readonly maxDisplacement: number;
  readonly quantizationError: number;
}
export interface OpticalMap { data: Uint8ClampedArray; scale: number; stats: OpticalMapStats; }
export interface PaneRay { status: 'source' | 'tir' | 'escaped' | 'outside'; dx: number; dy: number; transmission: number; }
export const defaultOptics: ResolvedOptics;
export function normalizeOptics(patch?: Optics, base?: ResolvedOptics): ResolvedOptics;
export function interfaceRay(incident: Vector3, normal: Vector3, n1: number, n2: number): InterfaceRay;
export function validateOpticalMapParameters(p: OpticalMapParameters): OpticalMapParameters;
export function tracePane(p: OpticalMapParameters, x: number, y: number): PaneRay;
export function generateOpticalMap(p: OpticalMapParameters): OpticalMap;
export function generateOpticalMapAsync(p: OpticalMapParameters, cancelled?: () => boolean): Promise<OpticalMap>;
