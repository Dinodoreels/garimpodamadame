# Inbound Intelligence / Garimpo Scan — auditoria + Fase 1

## O que já existe hoje (e será reaproveitado)

- **Painel administrativo** com menu lateral, cabeçalho móvel, proteção por login e permissões (`admin`, `vendedor`, `consignador`). O novo módulo entra como mais um grupo no menu, sem mexer nos existentes.
- **Catálogo de venda**: produtos, variações (com preço, custo, estoque, código), imagens, etiquetas com código de barras, kits, fornecedores, lojas e estoque por loja.
- **Movimentos de estoque** hoje são implícitos: a quantidade é alterada direto na variação (venda, etiqueta vendida, integrações). Não existe histórico auditável de movimentação.
- **Integrações** já prontas: Bling, TikTok Shop, Shopify, Mercado Pago, e-mails, notificações.
- **Componentes prontos** para reutilizar: cartões, tabelas, diálogos, abas, gráficos, avisos, estados vazios, upload de imagens.

## O que falta (será criado pelo módulo)

Não existe nada de recebimento de carreta, lote, triagem, controle de qualidade, condição do produto (T1/T2/O1...), endereçamento no galpão, pesquisa de mercado, motor de precificação ou histórico de movimentação. Tudo isso é novo.

Ponto importante de arquitetura: o catálogo atual (produto + variação) é a **loja**. O módulo Inbound terá suas próprias tabelas de produto-mestre, variação e SKU físico, e no fim do fluxo publica/atualiza o produto no catálogo da loja. Assim nada do que já funciona é alterado.

## Como vamos entregar

Por fases, exatamente na ordem que você definiu. Cada fase termina com verificação de erros, banco, permissões e uso em celular/tablet. Este plano cobre a **Fase 1**; as próximas serão planejadas ao final de cada etapa.

## Fase 1 — Banco base + Recebimentos + Lotes

**Banco (novas tabelas, nenhuma existente é alterada):**

- `truck_receipts` — código automático (REC-2026-00001), data/hora, origem/fornecedor, transportadora, placa, motorista, documento, nota, quantidade estimada, valor do lote, observações, status, operador.
- `lots` — código automático (LOTE-2026-00001), vínculo com o recebimento, status, contadores.
- `receipt_attachments` — fotos e documentos anexados (novo balde de arquivos privado `inbound-docs`).
- `inbound_events` — trilha de auditoria do módulo (quem, o quê, antes, depois, quando).
- Novos perfis de acesso: `gestor_cd`, `inbound`, `qc`, `estoque`, `commerce`, `viewer` acrescentados aos perfis já existentes.
- Regras de acesso: admin e gestor do CD gerenciam tudo; operador inbound cria e edita recebimentos/lotes abertos; demais perfis só visualizam. Numeração gerada no banco para evitar códigos repetidos.

**Telas:**

- Novo grupo **INBOUND** no menu lateral com os submenus da sua lista. Nesta fase ficam ativos **Dashboard**, **Recebimentos** e **Lotes**; os demais aparecem como "Em breve" para não criar telas vazias enganosas.
- **Recebimentos**: lista com busca e filtros (status, data, origem, lote), botão **+ Novo recebimento**, formulário em etapas curtas, opção de criar o lote automaticamente junto, anexos de fotos/documentos.
- **Detalhe do recebimento**: dados, lotes vinculados, anexos, histórico de eventos.
- **Lotes**: lista, detalhe, abertura/fechamento e progresso.
- **Dashboard Inbound**: apenas os indicadores que já têm dado real nesta fase (carretas recebidas hoje, lotes abertos, unidades estimadas recebidas, valor recebido, últimos recebimentos). Os demais cartões só entram quando as fases correspondentes existirem — nada de número inventado.

**Detalhes técnicos**

- Rotas novas em `src/App.tsx` sob `/admin/inbound/*`, carregadas sob demanda, dentro do layout admin atual.
- Páginas em `src/pages/admin/inbound/`, componentes em `src/components/admin/inbound/`, hooks em `src/hooks/inbound/` usando React Query como o resto do app.
- Camada de serviços já criada nesta fase em `src/services/inbound/` (`receiptService`, `lotService`) com interfaces, para que IA, pesquisa de mercado e precificação entrem depois sem tocar na interface.
- Máquina de estados do produto e tipos compartilhados definidos em `src/services/inbound/types.ts` desde já.
- Nenhuma alteração em tabelas, funções ou telas existentes.
