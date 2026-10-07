// Cena "Órbita WSN" — carregada sob demanda (import dinâmico) só quando há WebGL,
// movimento permitido e economia de dados desligada.
//
// Conceito: o símbolo do logo (arco verde + arco navy + três pontos) inclina no
// scroll; os pontos saem da órbita e viram os produtos das categorias — frasco
// (limpeza), copo (descartáveis), capacete amarelo de segurança (EPIs) e caixa
// (embalagens). Geometria procedural, cor chapada, sem texturas nem GLB.
import {
  AmbientLight,
  BoxGeometry,
  CylinderGeometry,
  DirectionalLight,
  Group,
  Mesh,
  MeshLambertMaterial,
  OrthographicCamera,
  Scene,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  WebGLRenderer,
  type BufferGeometry,
  type Material,
} from "three";

const NAVY = 0x0b3a6b;
const GREEN = 0x3e9a12;
const SIGNAL = 0xf2c230;
const WHITE = 0xf7f8f5;
const KRAFT = 0xc79a5b;

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const deg = (d: number) => (d * Math.PI) / 180;

export interface OrbitScene {
  setProgress(p: number): void;
  setPointer(x: number, y: number): void;
  resize(): void;
  setActive(active: boolean): void;
  dispose(): void;
}

export function createOrbitScene(canvas: HTMLCanvasElement, opts: { lowPower: boolean }): OrbitScene {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, opts.lowPower ? 1.5 : 2));

  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  camera.position.set(0, 0, 10);

  scene.add(new AmbientLight(0xffffff, 1.9));
  const key = new DirectionalLight(0xffffff, 2.1);
  key.position.set(3, 4, 6);
  scene.add(key);

  const disposables: (BufferGeometry | Material)[] = [];
  const mat = (color: number) => {
    const m = new MeshLambertMaterial({ color });
    disposables.push(m);
    return m;
  };
  const geo = <G extends BufferGeometry>(g: G) => {
    disposables.push(g);
    return g;
  };
  const seg = opts.lowPower ? 48 : 96;

  // --- Símbolo: os ângulos espelham o SVG do logo (Logo.tsx) ---
  const R = 1;
  const tube = 0.085;
  const symbol = new Group();
  const greenArc = new Mesh(geo(new TorusGeometry(R, tube, 16, seg, deg(125))), mat(GREEN));
  greenArc.rotation.z = deg(85);
  const navyArc = new Mesh(geo(new TorusGeometry(R, tube, 16, seg, deg(125))), mat(NAVY));
  navyArc.rotation.z = deg(200);
  navyArc.position.z = 0.03; // sobreposição dos arcos sem z-fighting
  symbol.add(greenArc, navyArc);
  scene.add(symbol);

  const dotAngles = [66, 50, 34, 18].map(deg); // 3 pontos do logo + o 4º que "nasce" da órbita
  const dotGeo = geo(new SphereGeometry(0.075, 24, 16));
  const dotMat = mat(NAVY);

  // --- Produtos: um por categoria ---
  const makeBottle = () => {
    const g = new Group();
    const body = new Mesh(geo(new CylinderGeometry(0.16, 0.16, 0.42, 32)), mat(GREEN));
    const neck = new Mesh(geo(new CylinderGeometry(0.06, 0.1, 0.1, 24)), mat(GREEN));
    neck.position.y = 0.26;
    const cap = new Mesh(geo(new CylinderGeometry(0.065, 0.065, 0.08, 24)), mat(WHITE));
    cap.position.y = 0.34;
    g.add(body, neck, cap);
    return g;
  };
  const makeCup = () => {
    const g = new Group();
    const cup = new Mesh(geo(new CylinderGeometry(0.18, 0.12, 0.38, 32, 1, true)), mat(WHITE));
    const rim = new Mesh(geo(new TorusGeometry(0.18, 0.016, 8, 32)), mat(WHITE));
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.19;
    const bottom = new Mesh(geo(new CylinderGeometry(0.12, 0.12, 0.01, 32)), mat(WHITE));
    bottom.position.y = -0.19;
    g.add(cup, rim, bottom);
    return g;
  };
  const makeHelmet = () => {
    const g = new Group();
    const dome = new Mesh(geo(new SphereGeometry(0.2, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2)), mat(SIGNAL));
    const brim = new Mesh(geo(new CylinderGeometry(0.27, 0.27, 0.025, 40)), mat(SIGNAL));
    const ridge = new Mesh(geo(new BoxGeometry(0.05, 0.05, 0.4)), mat(SIGNAL));
    ridge.position.y = 0.17;
    ridge.scale.set(1, 1, 0.95);
    g.add(dome, brim, ridge);
    return g;
  };
  const makeBox = () => {
    const g = new Group();
    const box = new Mesh(geo(new BoxGeometry(0.4, 0.3, 0.3)), mat(KRAFT));
    const tape = new Mesh(geo(new BoxGeometry(0.42, 0.04, 0.08)), mat(NAVY));
    tape.position.y = 0.14;
    g.add(box, tape);
    return g;
  };

  const products = [makeBottle(), makeCup(), makeHelmet(), makeBox()];
  // Destino de cada produto: espalhados ao redor do anel inclinado.
  const targets = [new Vector3(-1.45, 0.95, 0.5), new Vector3(1.4, 1.05, 0.2), new Vector3(1.5, -0.75, 0.6), new Vector3(-1.4, -0.85, 0.3)];
  const PRODUCT_SCALE = 1.45;

  const travellers = dotAngles.map((a, i) => {
    const dot = new Mesh(dotGeo, dotMat);
    const start = new Vector3(Math.cos(a) * R, Math.sin(a) * R, 0);
    const product = products[i];
    product.scale.setScalar(0.0001);
    product.rotation.set(deg(18), deg(-30 + i * 25), 0);
    scene.add(dot, product);
    return { dot, product, start, target: targets[i], spin: 0.25 + i * 0.07, delay: i * 0.08 };
  });
  travellers[3].dot.scale.setScalar(0.0001); // o 4º ponto surge durante a saída

  const tmp = new Vector3(); // reaproveitado a cada quadro (sem lixo para o GC)
  let progress = 0;
  let intro = 0; // abertura automática: os produtos saem da órbita sem depender de scroll
  const INTRO_TARGET = 0.72;
  let pointerX = 0;
  let pointerY = 0;
  let active = true;
  let raf = 0;
  let last = performance.now();
  let time = 0;

  const frame = (now: number) => {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    time += dt;
    intro = Math.min(INTRO_TARGET, intro + dt * 0.45);
    const drive = Math.max(intro, progress);

    const p = easeInOut(clamp01(drive));
    symbol.rotation.x = lerp(0, deg(62), p) + pointerY * 0.12;
    symbol.rotation.y = lerp(0, deg(-18), p) + pointerX * 0.18;
    symbol.position.y = lerp(0, -0.15, p);

    for (const t of travellers) {
      const local = easeInOut(clamp01((drive - t.delay) / 0.62));
      const pos = tmp.lerpVectors(t.start, t.target, local);
      pos.z += Math.sin(local * Math.PI) * 0.6; // arco para fora da tela
      const bob = Math.sin(time * 1.2 + t.spin * 10) * 0.03 * local;
      t.dot.position.copy(pos);
      t.product.position.set(pos.x + pointerX * 0.06, pos.y + bob + pointerY * 0.04, pos.z);
      const dotScale = t === travellers[3] ? Math.sin(local * Math.PI) : 1 - local;
      t.dot.scale.setScalar(Math.max(0.0001, dotScale));
      t.product.scale.setScalar(Math.max(0.0001, local * PRODUCT_SCALE));
      t.product.rotation.y += dt * t.spin * (0.4 + local);
    }

    renderer.render(scene, camera);
    if (active) raf = requestAnimationFrame(frame);
  };

  const api: OrbitScene = {
    setProgress(p) {
      progress = p;
    },
    setPointer(x, y) {
      pointerX = x;
      pointerY = y;
    },
    resize() {
      const { clientWidth: w, clientHeight: h } = canvas;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      const view = 2.35; // meia-altura visível em unidades da cena
      const aspect = w / h;
      camera.left = -view * aspect;
      camera.right = view * aspect;
      camera.top = view;
      camera.bottom = -view;
      camera.updateProjectionMatrix();
      if (!active) renderer.render(scene, camera);
    },
    setActive(next) {
      active = next;
      if (active && !raf) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    },
    dispose() {
      active = false;
      cancelAnimationFrame(raf);
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };

  api.resize();
  raf = requestAnimationFrame(frame);
  return api;
}

export function supportsWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
}
