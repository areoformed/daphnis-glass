export type Material = 'auto' | 'refracted' | 'frosted' | 'translucent' | 'solid';
export interface Recipe {
  bend: number; roughness: number; rim: number; blur: number; displacement: number;
  saturation: number; fallbackBlur: number; grainSize: number; seed: number;
}
export interface Options {
  material?: Material;
  recipes?: Partial<Record<'refracted' | 'frosted', Partial<Recipe>>>;
}
export interface SurfaceState {
  element: Element;
  material: Exclude<Material,'auto'> | undefined;
  renderer: 'svg' | 'css' | undefined;
  engine: 'webgpu' | 'wasm' | 'javascript' | null;
}
export interface GlassController {
  readonly state: {requested: Material; destroyed: boolean; surfaces: SurfaceState[]};
  setMaterial(material: Material): void;
  setRecipes(recipes: Options['recipes']): void;
  refresh(): void;
  destroy(): void;
}
export const materials: readonly Material[];
export const defaultRecipes: Readonly<Record<'refracted' | 'frosted', Readonly<Recipe>>>;
export function createGlass(targets: string | Element | Iterable<Element>, options?: Options): GlassController;
