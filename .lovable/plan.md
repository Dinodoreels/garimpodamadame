# Publicar todos os produtos do Bling na loja

## Objetivo
Trazer novamente todo o catálogo conectado ao Bling para a loja, atualizar o saldo pelo depósito **Geral** e publicar inclusive os itens com estoque zero, exibindo-os como **ESGOTADO**.

## Situação confirmada
- A conexão com o Bling está ativa e o estoque usa o Bling como fonte principal.
- O depósito configurado é o **Geral** (`14889184090`).
- Existem **52 produtos vinculados**, todos ainda como rascunho.
- O Bling está informando saldo positivo para **0 produtos**; por isso nenhum foi publicado pela regra atual, que exige estoque maior que zero.

## O que será feito
1. Ajustar a regra de publicação para que estoque zero não impeça o produto de aparecer na loja.
2. Manter como requisitos mínimos SKU válido, preço positivo e pelo menos uma foto real; não inventar dados ausentes.
3. Publicar produtos com saldo zero como indisponíveis para compra, mostrando **ESGOTADO** conforme a regra da loja.
4. Buscar novamente todos os produtos, fotos, preços e o saldo atual do depósito Geral.
5. Atualizar os 52 vínculos existentes sem recriar produtos, SKUs ou imagens duplicadas.
6. Manter a sincronização futura de estoque: quando o Bling informar saldo positivo, o produto ficará comprável; ao voltar a zero, continuará visível como ESGOTADO.
7. Atualizar o texto da área do Bling para explicar que produtos sem estoque serão publicados como esgotados, enquanto itens sem SKU, preço ou foto permanecem pendentes.

## Segurança e consistência
- O Bling continua sendo a fonte do estoque.
- Quantidades negativas recebidas serão limitadas a zero.
- Produtos sem foto real, SKU válido ou preço positivo não serão publicados automaticamente.
- Nenhum produto existente será apagado e nenhum pedido será alterado.

## Validação
- Conferir a quantidade de produtos publicados, rascunhos e vínculos após a sincronização.
- Confirmar que os itens zerados aparecem na loja como ESGOTADO e não podem ser adicionados ao carrinho.
- Confirmar que fotos, preços, SKUs e quantidades correspondem aos dados retornados pelo Bling.
- Repetir a sincronização para garantir que não haja duplicação.
