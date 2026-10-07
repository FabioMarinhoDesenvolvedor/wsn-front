// Converte as imagens originais (assets/originais) para WebP otimizado em public/images.
// Produtos passam a ser nomeados pela ref (R-CAT-6): 38.png → products/0038.webp.
import { mkdirSync, readdirSync } from "node:fs";
import { join, parse } from "node:path";
import sharp from "sharp";

const SRC = "assets/originais";
const OUT = "public/images";

mkdirSync(join(OUT, "products"), { recursive: true });
mkdirSync(join(OUT, "brands"), { recursive: true });
mkdirSync("src/assets", { recursive: true });

// Produtos: as fotos de fornecedor têm ~200px; sem ampliar (o quadro é feito no CSS).
for (const file of readdirSync(join(SRC, "produtos"))) {
  const { name } = parse(file);
  if (!/^\d+$/.test(name)) continue;
  const ref = name.padStart(4, "0");
  await sharp(join(SRC, "produtos", file))
    .flatten({ background: "#ffffff" })
    .trim({ threshold: 8 })
    .resize(480, 480, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(join(OUT, "products", `${ref}.webp`));
}

// Marcas parceiras.
for (const file of readdirSync(join(SRC, "marcas"))) {
  const slug = parse(file).name.toLowerCase();
  await sharp(join(SRC, "marcas", file))
    .flatten({ background: "#ffffff" })
    .trim({ threshold: 12 })
    .resize({ height: 120, width: 320, fit: "inside" })
    .webp({ quality: 85 })
    .toFile(join(OUT, "brands", `${slug}.webp`));
}

// Logo: o PNG original tem ~40% de margem branca; recorta e gera 2 larguras.
const logo = sharp(join(SRC, "marca-wsn", "wsn-logo.png")).trim({ threshold: 10 });
await logo.clone().resize({ width: 480 }).webp({ quality: 92 }).toFile("src/assets/wsn-logo-480.webp");
await logo.clone().resize({ width: 960 }).webp({ quality: 92 }).toFile("src/assets/wsn-logo-960.webp");
await logo.clone().resize({ width: 1200 }).png().toFile(join(OUT, "og-logo.png"));

console.log("imagens geradas");
