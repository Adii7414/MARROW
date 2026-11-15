import * as THREE from 'three';

export type SkinKey = 'paint' | 'titanium' | 'aluminium' | 'carbon' | 'ceramic' | 'polymer';

export const SKINS: Record<SkinKey, { label: string; color: string; metalness: number; roughness: number; clearcoat: number; note: string; density: string; code: string }> = {
  paint: { label: 'MORROW white', color: '#ECEAE4', metalness: 0.1, roughness: 0.3, clearcoat: 0.9, note: 'Two-stage polyurethane over composite skin. Standard delivery finish.', density: '—', code: 'FIN-01' },
  titanium: { label: 'Titanium', color: '#B9B5AA', metalness: 0.92, roughness: 0.34, clearcoat: 0, note: 'Ti-6Al-4V, bead-blasted. Used where heat and fatigue meet: pylons, firewalls, fittings.', density: '4.43 g/cm³', code: 'MAT-TI64' },
  aluminium: { label: 'Aluminium alloy', color: '#CBCED1', metalness: 1, roughness: 0.22, clearcoat: 0, note: 'Al-Li 2198 sheet, polished. Third-generation alloy, 7% lighter than its predecessors.', density: '2.69 g/cm³', code: 'MAT-AL2198' },
  carbon: { label: 'Carbon composite', color: '#2A2B2B', metalness: 0.35, roughness: 0.4, clearcoat: 1, note: 'Toughened epoxy CFRP, automated fibre placement. The skin of the M-series wing and barrel.', density: '1.58 g/cm³', code: 'MAT-CF-T1100' },
  ceramic: { label: 'Ceramic coating', color: '#E3DFD3', metalness: 0, roughness: 0.82, clearcoat: 0, note: 'Yttria-stabilised zirconia thermal barrier — for hot sections and the M03 leading edges.', density: '6.10 g/cm³', code: 'MAT-YSZ' },
  polymer: { label: 'Advanced polymer', color: '#D9CFBF', metalness: 0, roughness: 0.5, clearcoat: 0.4, note: 'PEEK thermoplastic, weldable and recyclable. Fairings, interior structures, access panels.', density: '1.32 g/cm³', code: 'MAT-PEEK' },
};

export const PRIMER = new THREE.Color('#8E9886');

export function createMaterials(plane: THREE.Plane) {
  const std = (o: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial({ side: THREE.DoubleSide, ...o });
  const base: Record<string, THREE.MeshPhysicalMaterial> = {
    skin: std({ color: SKINS.paint.color, metalness: 0.1, roughness: 0.3, clearcoat: 0.9, clearcoatRoughness: 0.2 }),
    structure: std({ color: '#9AA39A', metalness: 0.55, roughness: 0.45 }),
    composite: std({ color: '#2E3030', metalness: 0.3, roughness: 0.45, clearcoat: 0.6 }),
    metal: std({ color: '#C3C1BA', metalness: 0.95, roughness: 0.28 }),
    dark: std({ color: '#262726', metalness: 0.6, roughness: 0.45 }),
    glass: std({ color: '#121416', metalness: 0.4, roughness: 0.08, clearcoat: 1 }),
    accent: std({ color: '#B34A32', metalness: 0.1, roughness: 0.32, clearcoat: 0.9 }),
    interior: std({ color: '#E7E2D6', metalness: 0, roughness: 0.75 }),
    seat: std({ color: '#3A3B39', metalness: 0, roughness: 0.85 }),
    rubber: std({ color: '#151515', metalness: 0, roughness: 0.9 }),
    fuel: std({ color: '#C98A3A', metalness: 0.2, roughness: 0.5 }),
    hydraulic: std({ color: '#4E7FA6', metalness: 0.5, roughness: 0.4 }),
    electric: std({ color: '#C9A43A', metalness: 0.4, roughness: 0.4 }),
    lightRed: std({ color: '#FF3B2F', emissive: '#FF2A1A', emissiveIntensity: 1.5 }),
    lightGreen: std({ color: '#36D67A', emissive: '#1FD06A', emissiveIntensity: 1.5 }),
    lightWhite: std({ color: '#FFF6E0', emissive: '#FFF1D6', emissiveIntensity: 1.5 }),
  };
  const cut: Record<string, THREE.MeshPhysicalMaterial> = {};
  Object.entries(base).forEach(([k, m]) => {
    const c = m.clone();
    c.clippingPlanes = [plane];
    cut[k] = c;
  });
  const ghost = new THREE.MeshBasicMaterial({ color: '#8fb6d9', transparent: true, opacity: 0.06, depthWrite: false, side: THREE.DoubleSide });
  const wire = new THREE.MeshBasicMaterial({ color: '#cfe3f7', wireframe: true, transparent: true, opacity: 0, depthWrite: false });
  const all = [...Object.values(base), ...Object.values(cut)];
  return {
    get: (k: string, cuttable?: boolean) => (cuttable ? cut[k] : base[k]) ?? base.structure,
    pair: (k: string) => [base[k], cut[k]],
    all,
    ghost,
    wire,
    dispose: () => [...all, ghost, wire].forEach((m) => m.dispose()),
  };
}
export type MaterialSet = ReturnType<typeof createMaterials>;
