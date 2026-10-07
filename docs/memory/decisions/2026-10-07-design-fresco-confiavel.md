# Design "Fresco & Confiável" (substitui "Ficha Técnica")

- **Data**: 2026-10-07 · **Status**: aprovada após feedback duro do Fábio
- **Substitui**: `2026-10-07-design-ficha-tecnica.md`

## Por que mudou
O Fábio rejeitou a "Ficha Técnica": hero 3D sem relação com descartáveis, visual
"quadrático", frio e industrial, não parecia uma distribuidora de limpeza/higiene.

## Pesquisa
Sites reais fotografados: Method, Blueland, Grove, Kimberly-Clark Professional, Ecolab,
Descarpack. Padrões: produto é o herói (fotos reais em fundo claro), superfícies brancas e
azul-céu, cards bem arredondados com sombra suave, botões pílula, tipografia geométrica
amigável, faixas claras com ícones de benefício, categorias com foto, busca em destaque,
barra de categorias e barra de aviso no topo.

## Decisão
- Tipografia única: **Plus Jakarta Sans** (800 títulos, 400–600 texto). Sem mono, sem fonte larga.
- Cores: navy `#0B3A6B` (ação), verde `#3E9A12` (marca/CTA de busca), azul-céu dos banners
  `#6FA8DC` e tintas `--surface-sky` / `--surface-mint`. Raio 10/16/24/32. Sombras navy suaves.
- Assinatura: **ondas dos banners da própria WSN** (`src/ui/Waves.tsx`) no fim do hero e no rodapé.
- Hero: mosaico bento com fotos reais (luvas nitrílicas, Ypê, papel, álcool gel, luvas amarelas).
  **Sem Three.js** (removido do projeto).
- Curadoria visual em `src/content/site.ts` → `showcase` (refs do hero, capas de categoria, vitrine).
- Selos "a confirmar" só aparecem com `?revisao=1`.
