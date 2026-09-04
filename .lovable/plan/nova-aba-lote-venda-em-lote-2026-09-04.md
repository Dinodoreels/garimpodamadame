# Nova aba "LOTE" — venda em lote

Uma nova página pública de venda em lote/atacado, com a mesma cara do Catálogo, e a aba "LOTE" no menu logo depois de "CATÁLOGO".

## Como vai funcionar

- No menu: INÍCIO · CATÁLOGO · **LOTE** · LANÇAMENTOS · SOBRE · CONTATO (também no menu do celular e no rodapé, para ficar consistente).
- A página de lote mostra uma grade de produtos igual à do Catálogo, com busca, categorias, ordenação e os mesmos filtros.
- Só aparecem ali os produtos que você marcar como "venda em lote".

## Como você marca um produto como lote

- Na tela de cadastro/edição de produto do painel, entra uma chavinha nova: **"Vender em lote"**.
- Ligou a chavinha, o produto passa a aparecer na aba LOTE. Desligou, some de lá.
- Na lista de produtos do painel entra um filtro para ver rapidamente só os itens de lote.
- Produtos de lote continuam aparecendo normalmente no Catálogo, a menos que você me peça para separá-los.

## Texto da página

A página nasce com um título e subtítulo padrão ("Venda em Lote" / "Compre em maior quantidade com condições especiais"), editáveis depois pela área de conteúdo do site, como as outras páginas.

## Detalhes técnicos

1. Migração: adicionar `is_lote boolean not null default false` em `public.products`, com índice parcial para a consulta da vitrine. Sem novas tabelas, sem mudança de RLS (as políticas atuais de `products` já cobrem leitura pública).
2. Novo hook `useLoteProducts` (ou parâmetro em `useProducts`) filtrando `is_lote = true` e `status/is_available` como o catálogo faz.
3. Nova página `src/pages/Lote.tsx` reaproveitando a estrutura de `Catalog.tsx` (busca, `CategoryChips`, `CatalogFiltersSheet`, `ProductGrid`, `Header`, `Footer`, `MobileBottomNav`) e `useSiteContent`/`useCMSPageBySlugOrHome('lote')` para o hero editável.
4. Rota `/lote` em `src/App.tsx`; entrada `{ name: 'LOTE', href: '/lote' }` na lista de navegação do `Header.tsx` após CATÁLOGO, e link equivalente no `Footer.tsx`.
5. `ProductDialog.tsx`: campo `is_lote` no `formData`, `Switch` na aba de informações, incluído no insert/update; filtro por lote em `src/pages/admin/Products.tsx`.
