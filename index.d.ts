import type {Optics, ResolvedOptics, OpticalMapStats} from './optics.js';
export {defaultOptics, interfaceRay} from './optics.js';
export type {Optics, ResolvedOptics, OpticalMapStats} from './optics.js';
export type Material = 'auto' | 'refracted' | 'frosted' | 'translucent' | 'solid';
export interface Recipe {
  bend: number; roughness: number; rim: number; blur: number; displacement: number;
  saturation: number; fallbackBlur: number; grainSize: number; seed: number;
}
export interface Options {
  material?: Material;
  recipes?: Partial<Record<'refracted' | 'frosted', Partial<Recipe>>>;
  optics?: Optics | null;
}
export interface SurfaceState {
  element: Element;
  material: Exclude<Material,'auto'> | undefined;
  renderer: 'svg' | 'css' | undefined;
  engine: 'webgpu' | 'wasm' | 'javascript' | null;
  optics: OpticalMapStats | null;
  opticsError: string | null;
}
export interface GlassController {
  readonly state: {requested: Material; destroyed: boolean; optics: ResolvedOptics | null; surfaces: SurfaceState[]};
  setMaterial(material: Material): void;
  setRecipes(recipes: Options['recipes']): void;
  setOptics(optics: Optics | null): void;
  refresh(): void;
  destroy(): void;
}
export const materials: readonly Material[];
export const defaultRecipes: Readonly<Record<'refracted' | 'frosted', Readonly<Recipe>>>;
export function createGlass(targets: string | Element | Iterable<Element>, options?: Options): GlassController;
