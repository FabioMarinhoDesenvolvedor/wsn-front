# Preço só na proposta; a feature de venda é cotação → proposta → aprovação

- **Data**: 2026-10-07 · **Status**: aprovada (Fábio: "preços não públicos"; quer uma
  feature que justifique dizer ao Wesley que o projeto vale X)

- Site público nunca mostra preço. `products.price_cents` é tabela interna que
  pré-preenche a proposta.
- Vendedor precifica a cotação no painel (quantidade/preço editáveis, desconto, frete,
  validade 1–60 dias, condições). Cada envio é uma versão; a anterior vira "substituída".
- Cliente recebe link pessoal `/proposta/<token>`: vê, imprime em PDF, aprova com nome
  (registro com data e hash de IP) ou repete os itens numa nova cotação.
- Aprovação → cotação "ganha" + e-mail para vendas. Job diário expira propostas.
- Painel mede: recebidas, valor aprovado online, conversão, tempo até 1ª proposta,
  propostas abertas e não aprovadas ("hora de ligar"), produtos mais pedidos e
  **buscas sem resultado** (demanda que a WSN não atende).
