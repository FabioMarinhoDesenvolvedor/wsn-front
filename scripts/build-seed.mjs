// Gera migrations/seed/catalog.sql a partir de data/catalogo-origem.json (+ preços locais).
// Roda uma vez por ambiente. A classificação por palavra-chave do site antigo vive só
// aqui (R-CAT-3): depois do seed, categoria é dado editado no painel.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const source = JSON.parse(readFileSync("data/catalogo-origem.json", "utf8"));
const prices = existsSync("data/precos.local.json")
  ? JSON.parse(readFileSync("data/precos.local.json", "utf8"))
  : {};

const categories = [
  { slug: "limpeza", name: "Limpeza e Higiene", description: "Produtos de limpeza profissional" },
  { slug: "descartaveis", name: "Descartáveis", description: "Descartáveis para alimentação" },
  { slug: "epis", name: "EPIs", description: "Equipamentos de proteção" },
  { slug: "embalagens", name: "Embalagens", description: "Embalagens diversas" },
  { slug: "papeis", name: "Papéis", description: null },
  { slug: "uniformes", name: "Uniformes", description: null },
];

// Marcas: as 9 parceiras com logo (seção "Melhores Marcas") + as que aparecem nos nomes.
const brands = [
  { slug: "3m", name: "3M", logo: "/images/brands/3m.webp", match: [] },
  { slug: "scotch-brite", name: "Scotch-Brite", logo: "/images/brands/scotch-brite.webp", match: ["scotch brite"] },
  { slug: "descarpack", name: "Descarpack", logo: "/images/brands/descarpack.webp", match: ["descarpack"] },
  { slug: "medix", name: "Medix", logo: "/images/brands/medix.webp", match: ["medix"] },
  { slug: "copobras", name: "Copobras", logo: "/images/brands/copobras.webp", match: [] },
  { slug: "bombril", name: "Bombril", logo: "/images/brands/bombril.webp", match: [] },
  { slug: "alpfilm", name: "Alpfilm", logo: "/images/brands/alpfilm.webp", match: ["alpfilm"] },
  { slug: "life-clean", name: "Life Clean", logo: "/images/brands/life-clean.webp", match: ["life clean"] },
  { slug: "sanro", name: "Sanro", logo: "/images/brands/sanro.webp", match: [] },
  { slug: "itaja", name: "Itajá", logo: null, match: ["itaja"] },
  { slug: "ype", name: "Ypê", logo: null, match: ["ype"] },
  { slug: "omo", name: "Omo", logo: null, match: ["omo"] },
  { slug: "bom-ar", name: "Bom Ar", logo: null, match: ["bom ar"] },
  { slug: "radium", name: "Radium", logo: null, match: ["radium"] },
  { slug: "veja", name: "Veja", logo: null, match: ["veja"] },
  { slug: "coala", name: "Coala", logo: null, match: ["coala"] },
  { slug: "freeco", name: "Freeco", logo: null, match: ["freeco"] },
  { slug: "suprema", name: "Suprema", logo: null, match: ["suprema"] },
  { slug: "pro-inset", name: "Pro Inset", logo: null, match: ["pro inset"] },
  { slug: "mago", name: "Mago", logo: null, match: ["mago"] },
];

const UNIT_MAP = { unidade: "unidade", caixa: "caixa", par: "par", pct: "pacote" };

const plain = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const has = (text, ...words) => words.some((w) => text.includes(w));
const wordMatch = (text, term) => new RegExp(`(^|[^a-z])${term}([^a-z]|$)`).test(text);

// Porta fiel do classificador de src/components/Products.tsx (site v1).
function classify(name) {
  const n = plain(name);
  const papelAluminio = has(n, "papel") && has(n, "aluminio");
  if (has(n, "luva", "mascara", "respirador", "protetor", "face shield", "touca", "avental") ||
      (n.includes("epi") && !n.includes("jaleco"))) return "epis";
  if (has(n, "uniforme", "jaleco", "calca", "camisa", "dolma", "bata ")) return "uniformes";
  if (!papelAluminio && (has(n, "papel", "papeis", "toalha", "guardanapo", "higienico", "interfolha") ||
      (n.includes("bobina") && has(n, "papel", "toalha")))) return "papeis";
  if (papelAluminio || (n.includes("saco") && n.includes("lixo")) || has(n, "bandeja", "embalage", "filme pvc") ||
      (n.includes("bobina") && !n.includes("papel"))) return "embalagens";
  if (has(n, "descartave", "copo", "prato", "talher", "mexedor", "palito", "manga de confeitar") ||
      (n.includes("pano") && !n.includes("rolo"))) return "descartaveis";
  return "limpeza";
}

const brandOf = (name) => {
  const n = plain(name);
  return brands.find((b) => b.match.some((m) => wordMatch(n, m)))?.slug ?? null;
};

// Nomes chegam em CAIXA ALTA; o catálogo novo usa caixa de frase legível.
const KEEP_UPPER = new Set(["pvc", "3m", "epi", "epis", "un", "l", "ml", "g", "cm", "kg", "m"]);
const PROPER = Object.fromEntries(brands.map((b) => [plain(b.name), b.name]));
Object.assign(PROPER, { "scotch": "Scotch", "brite": "Brite", "life": "Life", "clean": "Clean", "bom": "Bom", "ar": "Ar", "pro": "Pro", "inset": "Inset" });
const BRAND_WORDS = new Set(["scotch", "brite", "life", "clean", "pro", "inset", "itaja", "ype", "omo", "radium", "veja", "coala", "freeco", "suprema", "mago", "descarpack", "medix", "alpfilm"]);

function prettyName(raw) {
  const words = raw.trim().replace(/\s+/g, " ").toLowerCase().split(" ");
  const bomArAt = words.findIndex((w, i) => w === "bom" && words[i + 1] === "ar");
  return words
    .map((w, i) => {
      const p = plain(w);
      if (p === "3m") return "3M";
      if (/\d/.test(w))
        return w
          .replace(/x/g, "×")
          .replace(/(\d)(ml|cm|kg|g|l|m)(?=$|×)/g, (_, d, u) => `${d} ${u === "l" ? "L" : u}`);
      if (p === "l") return "L";
      if (KEEP_UPPER.has(p)) return ["un", "ml", "g", "cm", "kg", "m"].includes(p) ? w : w.toUpperCase();
      if (BRAND_WORDS.has(p) || ((i === bomArAt || i === bomArAt + 1) && bomArAt >= 0)) return PROPER[p] ?? w[0].toUpperCase() + w.slice(1);
      if (i === 0) return w[0].toUpperCase() + w.slice(1);
      return w;
    })
    .join(" ")
    .replace(/ - /g, " – ");
}

const slugify = (v) =>
  plain(v).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80).replace(/-+$/g, "");

const q = (v) => (v === null || v === undefined ? "NULL" : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);

const lines = [
  "-- GERADO por scripts/build-seed.mjs — não editar à mão.",
  "DELETE FROM product_slugs; DELETE FROM products; DELETE FROM brands; DELETE FROM categories;",
];
categories.forEach((c, i) =>
  lines.push(`INSERT INTO categories (id, slug, name, description, position) VALUES (${i + 1}, ${q(c.slug)}, ${q(c.name)}, ${q(c.description)}, ${i + 1});`),
);
brands.forEach((b, i) =>
  lines.push(`INSERT INTO brands (id, slug, name, logo_path) VALUES (${i + 1}, ${q(b.slug)}, ${q(b.name)}, ${q(b.logo)});`),
);

const summary = {};
for (const p of source) {
  const name = prettyName(p.nome);
  const cat = classify(p.nome);
  const brand = brandOf(p.nome);
  summary[cat] = (summary[cat] ?? 0) + 1;
  const unit = UNIT_MAP[p.unidade];
  if (!unit) throw new Error(`Unidade desconhecida ${p.unidade} (${p.ref})`);
  lines.push(
    `INSERT INTO products (ref, slug, name, unit, category_id, brand_id, price_cents, image_path) VALUES (` +
      [
        q(p.ref),
        q(slugify(name)),
        q(name),
        q(unit),
        `(SELECT id FROM categories WHERE slug = ${q(cat)})`,
        brand ? `(SELECT id FROM brands WHERE slug = ${q(brand)})` : "NULL",
        q(prices[p.ref] ?? null),
        q(`/images/products/${p.ref}.webp`),
      ].join(", ") +
      ");",
  );
}

mkdirSync("migrations/seed", { recursive: true });
writeFileSync("migrations/seed/catalog.sql", lines.join("\n") + "\n");
console.log(`seed: ${source.length} produtos`, summary, Object.keys(prices).length ? "(com preços internos)" : "(sem preços)");
