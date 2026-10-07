# Design "Ficha Técnica" e hero "Órbita WSN" ← SUBSTITUÍDA por 2026-10-07-design-fresco-confiavel.md

- **Data**: 2026-10-07 · **Status**: aprovada ("Mantém o design que você montou")

- Catálogo como ficha técnica: grade de hairlines, `REF 0003` em Geist Mono como
  elemento gráfico, seções numeradas, foto em quadro branco uniforme.
- Tipo: Archivo (eixo `wdth` expandido nos títulos) + Geist + Geist Mono, auto-hospedadas.
- Cor: navy `#0B3A6B` = ação; verde `#3E9A12` = marca/confirmação; amarelo de
  sinalização `#F2C230` = pontuação (foco, contador, capacete de EPI). Amostradas do
  PNG do logo — trocar se o vetor oficial divergir.
- Sem sombras decorativas, sem glow; hierarquia por superfície + hairline (herança
  Connections Hub/Clozi).
- Movimento concentrado: hero 3D (Three.js, lazy, só ≥768px, sem reduced-motion /
  save-data), view transitions, "voo" do produto para a cotação, tick do contador,
  reveal único, faixa de marcas. Tudo desliga em `prefers-reduced-motion`.
- Hero: arco + 3 pontos do logo; os pontos saem da órbita e viram frasco (limpeza),
  copo (descartáveis), capacete (EPIs) e caixa (embalagens). Intro automática até 72%
  e scroll completa. SVG estático é o fallback e o LCP.
