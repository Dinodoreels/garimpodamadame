# Aba "LOTES" e nova ordem do menu

Continuação do que já foi feito: a marcação "Vender em lote" já existe no cadastro de produto. Falta a página pública e o menu — agora com a ordem que você pediu.

## Nova ordem do menu

INÍCIO · LANÇAMENTOS · CATÁLOGO · LOTES · SOBRE · CONTATO

A aba se chama **LOTES** (plural) e leva para a nova página de venda em lote. A mesma ordem vale no menu do celular e nos links do rodapé.

## Página de lotes

- Grade de produtos igual à do Catálogo: busca, categorias, ordenação, filtros e o mesmo visual.
- Mostra apenas os produtos com a chavinha "Vender em lote" ligada.
- Título e subtítulo padrão ("Venda em Lote" / "Compre em maior quantidade com condições especiais"), editáveis depois pela área de conteúdo do site.

## No painel

- A chavinha "Vender em lote" na tela do produto (já adicionada) passa a ser gravada ao salvar.
- Filtro rápido na lista de produtos para ver só os itens de lote.

## Detalhes técnicos

1. Coluna `products.is_lote` já criada por migração — nada mais a fazer no banco.
2. Concluir a gravação: incluir `is_lote` no insert/update de `useProductAdmin.ts`, no `convertDialogToAdminFormat` e no `getInitialFormData` de `src/pages/admin/Products.tsx`, mais o filtro na listagem.
3. Adicionar `is_lote?: boolean` à interface `Product` em `src/hooks/useProducts.ts` (o select já traz `*`).
4. Nova página `src/pages/Lote.tsx` derivada de `Catalog.tsx`, filtrando `is_lote === true`, usando `useCMSPageBySlugOrHome('lote')` para o hero.
5. Rota `/lote` em `src/App.tsx`; `defaultNavigation` em `Header.tsx` reordenado para INÍCIO, LANÇAMENTOS, CATÁLOGO, LOTES, SOBRE, CONTATO; links do `Footer.tsx` na mesma ordem com o item LOTES.
