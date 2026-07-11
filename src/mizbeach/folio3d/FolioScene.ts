import * as THREE from "three";

export interface FolioSceneOptions {
  /** viewBox aspect ratio (width / height) of the folio piece this scene shows. */
  aspect: number;
  reducedMotion: boolean;
}

/**
 * A small, framework-agnostic three.js scene that presents one folio piece as
 * a lit "illuminated plate" resting on a tooled-leather folio: the piece's SVG
 * art is mapped onto a flat plane (kept unlit so the gold linework stays crisp
 * and legible), set on a leather backing frame under a warm candle-glow that
 * breathes, with a gentle pointer parallax tilt. The plane stays face-on so the
 * DOM/SVG interaction overlay above it registers pixel-for-pixel.
 *
 * All motion lives here in the render loop, never in stored data; honours
 * prefers-reduced-motion by holding a still, evenly-lit frame.
 */
export class FolioScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private group = new THREE.Group();
  private artPlane: THREE.Mesh;
  private artMaterial: THREE.MeshBasicMaterial;
  private glow: THREE.Mesh;
  private glowMaterial: THREE.MeshBasicMaterial;
  private candle: THREE.PointLight;
  private planeW: number;
  private planeH = 2;
  private reducedMotion: boolean;
  private canvas: HTMLCanvasElement;

  private raf = 0;
  private clock = new THREE.Clock();
  private tiltTarget = new THREE.Vector2(0, 0);
  private tilt = new THREE.Vector2(0, 0);
  private disposed = false;

  constructor(canvas: HTMLCanvasElement, opts: FolioSceneOptions) {
    this.canvas = canvas;
    this.reducedMotion = opts.reducedMotion;
    this.planeW = this.planeH * opts.aspect;

    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const fov = 30;
    this.camera = new THREE.PerspectiveCamera(fov, opts.aspect, 0.1, 100);
    const dist = (this.planeH / 2 / Math.tan((fov * Math.PI) / 360)) * 1.12;
    this.camera.position.set(0, 0, dist);
    this.camera.lookAt(0, 0, 0);

    this.scene.add(this.group);

    // ——— leather backing frame (lit, sits just behind the plate) ———
    const leather = new THREE.Mesh(
      new THREE.PlaneGeometry(this.planeW * 1.08, this.planeH * 1.08),
      new THREE.MeshStandardMaterial({ color: 0x1a1712, roughness: 0.82, metalness: 0.15 }),
    );
    leather.position.z = -0.08;
    this.group.add(leather);

    // ——— the folio art plate (unlit, texture set later) ———
    this.artMaterial = new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false });
    this.artPlane = new THREE.Mesh(new THREE.PlaneGeometry(this.planeW, this.planeH), this.artMaterial);
    this.group.add(this.artPlane);

    // ——— warm candle glow falling on the plate (additive, breathing) ———
    this.glowMaterial = new THREE.MeshBasicMaterial({
      map: makeRadialGlowTexture(),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: this.reducedMotion ? 0.1 : 0.16,
      toneMapped: false,
    });
    this.glow = new THREE.Mesh(new THREE.PlaneGeometry(this.planeW * 1.2, this.planeH * 1.2), this.glowMaterial);
    this.glow.position.z = 0.05;
    this.group.add(this.glow);

    // lights (only the leather is lit — the plate is unlit for legibility)
    this.scene.add(new THREE.AmbientLight(0xfff2dd, 0.55));
    this.candle = new THREE.PointLight(0xffcc88, 14, 20, 2);
    this.candle.position.set(-0.6, 0.9, 1.4);
    this.scene.add(this.candle);

    this.resize();
    this.loop();
  }

  setTexture(tex: THREE.Texture) {
    const prev = this.artMaterial.map;
    this.artMaterial.map = tex;
    this.artMaterial.needsUpdate = true;
    prev?.dispose();
  }

  /** Pointer position in [-1,1] range over the canvas, or null to rest flat. */
  setPointer(p: { x: number; y: number } | null) {
    if (this.reducedMotion) return;
    if (!p) {
      this.tiltTarget.set(0, 0);
      return;
    }
    this.tiltTarget.set(p.y * 0.12, p.x * 0.16);
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
    if (!this.reducedMotion) {
      // ease the tilt toward its target
      this.tilt.lerp(this.tiltTarget, 0.06);
      this.group.rotation.x = this.tilt.x;
      this.group.rotation.y = this.tilt.y;
      // candle breath: a slow flicker with a faster shimmer on top
      const flicker = 0.85 + 0.1 * Math.sin(t * 1.7) + 0.05 * Math.sin(t * 6.3 + 1.2);
      this.candle.intensity = 14 * flicker;
      this.glowMaterial.opacity = 0.13 + 0.05 * flicker;
    }
    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.artMaterial.map?.dispose();
    this.glowMaterial.map?.dispose();
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const mat = obj.material as THREE.Material | THREE.Material[];
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat.dispose();
      }
    });
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
