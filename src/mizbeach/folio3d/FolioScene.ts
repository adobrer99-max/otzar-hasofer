import * as THREE from "three";

export interface FolioSceneOptions {
  /** viewBox aspect ratio (width / height) of the folio piece this scene shows. */
  aspect: number;
  reducedMotion: boolean;
  /**
   * How many stacked art planes to create. 1 for the central panel; the ring
   * mandala uses 3 (a static base plus two cyclewheels that turn independently).
   */
  layerCount?: number;
}

interface Layer {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  rot: number;
  rotTarget: number;
}

/**
 * A small, framework-agnostic three.js scene that presents a folio piece as a
 * lit "illuminated plate" resting on a tooled-leather folio: the piece's SVG
 * art is mapped onto flat planes (unlit, so the gold linework stays crisp),
 * set on a leather backing under a warm candle-glow that breathes, with a
 * gentle pointer parallax tilt. Art planes stay face-on so the DOM/SVG
 * interaction overlay above registers pixel-for-pixel.
 *
 * The mandala stacks several planes and turns two of them (the Mazalot and
 * Moon cyclewheels) beneath a fixed pointer — a volvelle. All motion lives in
 * the render loop, never in stored data; prefers-reduced-motion holds a still,
 * evenly-lit frame and snaps wheel turns instead of easing them.
 */
export class FolioScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private group = new THREE.Group();
  private layers: Layer[] = [];
  private glowMaterial: THREE.MeshBasicMaterial;
  private candle: THREE.PointLight;
  private planeW: number;
  private planeH = 2;
  private reducedMotion: boolean;
  private canvas: HTMLCanvasElement;

  private raf = 0;
  private clock = new THREE.Clock();
  private disposed = false;

  constructor(canvas: HTMLCanvasElement, opts: FolioSceneOptions) {
    this.canvas = canvas;
    this.reducedMotion = opts.reducedMotion;
    this.planeW = this.planeH * opts.aspect;
    const layerCount = opts.layerCount ?? 1;

    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    // The art plane fills the viewport exactly (no inset) so every drawn slot
    // registers pixel-for-pixel with the DOM/SVG interaction overlay above it —
    // a placed letter sits in its slot, never floating off it.
    const fov = 30;
    this.camera = new THREE.PerspectiveCamera(fov, opts.aspect, 0.1, 100);
    const dist = this.planeH / 2 / Math.tan((fov * Math.PI) / 360);
    this.camera.position.set(0, 0, dist);
    this.camera.lookAt(0, 0, 0);

    this.scene.add(this.group);

    // ——— leather backing frame (lit, sits just behind the plates) ———
    const leather = new THREE.Mesh(
      new THREE.PlaneGeometry(this.planeW * 1.08, this.planeH * 1.08),
      new THREE.MeshStandardMaterial({ color: 0x1a1712, roughness: 0.82, metalness: 0.15 }),
    );
    leather.position.z = -0.08;
    this.group.add(leather);

    // ——— the folio art plates (unlit, textures set later) ———
    for (let i = 0; i < layerCount; i++) {
      const material = new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(this.planeW, this.planeH), material);
      mesh.position.z = i * 0.03;
      this.group.add(mesh);
      this.layers.push({ mesh, material, rot: 0, rotTarget: 0 });
    }

    // ——— warm candle glow falling on the plate (additive, breathing) ———
    this.glowMaterial = new THREE.MeshBasicMaterial({
      map: makeRadialGlowTexture(),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: this.reducedMotion ? 0.1 : 0.16,
      toneMapped: false,
    });
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(this.planeW * 1.2, this.planeH * 1.2), this.glowMaterial);
    glow.position.z = layerCount * 0.03 + 0.05;
    this.group.add(glow);

    this.scene.add(new THREE.AmbientLight(0xfff2dd, 0.55));
    this.candle = new THREE.PointLight(0xffcc88, 14, 20, 2);
    this.candle.position.set(-0.6, 0.9, 1.4);
    this.scene.add(this.candle);

    this.resize();
    this.loop();
  }

  setTexture(tex: THREE.Texture, layer = 0) {
    const l = this.layers[layer];
    if (!l) {
      tex.dispose();
      return;
    }
    const prev = l.material.map;
    l.material.map = tex;
    l.material.needsUpdate = true;
    prev?.dispose();
  }

  /** Turn a cyclewheel layer to `radians` (eased, unless reduced motion). */
  setLayerRotation(layer: number, radians: number) {
    const l = this.layers[layer];
    if (!l) return;
    l.rotTarget = radians;
    if (this.reducedMotion) {
      l.rot = radians;
      l.mesh.rotation.z = radians;
    }
  }

  resize() {
    const w = this.canvas.clientWidth || 1;
    const h = this.canvas.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private loop = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    if (typeof document !== "undefined" && document.hidden) return;

    const t = this.clock.getElapsedTime();
    // The plate stays face-on and fixed (so the overlay keeps registering); the
    // life comes from the breathing candle and the turning wheels, not from
    // moving the geometry the reader is placing cards onto.
    for (const l of this.layers) {
      if (Math.abs(l.rot - l.rotTarget) > 1e-4) {
        l.rot += (l.rotTarget - l.rot) * (this.reducedMotion ? 1 : 0.15);
        l.mesh.rotation.z = l.rot;
      }
    }
    if (!this.reducedMotion) {
      const flicker = 0.85 + 0.1 * Math.sin(t * 1.7) + 0.05 * Math.sin(t * 6.3 + 1.2);
      this.candle.intensity = 14 * flicker;
      this.glowMaterial.opacity = 0.13 + 0.05 * flicker;
    }
    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.glowMaterial.map?.dispose();
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const mat = obj.material as THREE.Material | THREE.Material[];
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat.dispose();
      }
    });
    for (const l of this.layers) l.material.map?.dispose();
    this.renderer.dispose();
  }
}

/** A soft warm radial gradient (bright center → transparent) for the candle glow. */
function makeRadialGlowTexture(): THREE.Texture {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size * 0.42, 0, size / 2, size * 0.42, size / 2);
  g.addColorStop(0, "rgba(255,214,150,0.9)");
  g.addColorStop(0.5, "rgba(220,170,110,0.35)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
