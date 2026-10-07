# Site só em tema claro até existir logo vetorial

- **Data**: 2026-10-07 · **Status**: decisão de implementação (avisar o Fábio)

Os tokens já têm tema escuro (`prefers-color-scheme` + `[data-theme=dark]`), mas o
logo é raster com "WSN" navy — some no fundo escuro. `index.html` fixa
`data-theme="light"`. Quando a WSN entregar o vetor: versão clara do logo, remover o
atributo e revisar contraste das superfícies escuras.
