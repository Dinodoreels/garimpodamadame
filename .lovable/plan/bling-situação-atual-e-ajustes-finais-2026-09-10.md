# Bling: situação atual e ajustes finais

## O sistema já está funcional?

**Sim, a conexão está de pé e funcionando.** Verificado no banco:

- Conta conectada: **eduardo simoes de lima**, integração **ligada**.
- Token válido (renova sozinho; validade atual até 10/09 às 21h de Brasília).
- Sem nenhum erro registrado.
- A busca automática de pedidos rodou sozinha às **16:00** e voltou **com sucesso** — isso prova que a loja está realmente conversando com o Bling.
- Histórico: 2 autorizações e 1 busca de pedidos, todas com sucesso.

**O que ainda não acontece nada:** a loja está com **0 produtos** cadastrados, 0 vínculos e 0 pedidos. Então não há o que sincronizar ainda — por isso "Enviar todos os produtos" respondeu "0 produtos na fila". Isso não é erro, é falta de conteúdo.

## Pendências

1. **Tela feia depois de autorizar.** A versão publicada da função de retorno devolve o cabeçalho errado (`text/plain` em vez de `text/html`), então o navegador mostra o código-fonte em vez da página "Bling conectado". Confirmado consultando o cabeçalho da função publicada. O código já está correto no projeto — basta republicar a função.
2. **Depósito e canal de venda não escolhidos.** Estão vazios. Sem o depósito, o controle de estoque usa o padrão do Bling; sem o canal, os pedidos do site entram no Bling sem identificação de origem.

## O que vou fazer

1. Republicar a função de retorno do Bling para a tela de sucesso aparecer bonita na próxima autorização. Nenhuma mudança de código é necessária.

## O que você faz

1. Em **Configurações → Bling**, clique em **Buscar** ao lado de "Depósito do Bling" e escolha o depósito e o canal de venda.
2. Cadastre os produtos da loja (ou importe-os) com o **código (SKU)** preenchido — é o SKU que casa cada produto com o do Bling.
3. Depois clique em **Vincular pelo código (SKU)** e em **Enviar todos os produtos**.

Feito isso, estoque, preços e pedidos passam a circular sozinhos: a fila roda a cada 5 minutos e os pedidos dos marketplaces são buscados a cada 15 minutos.

## Detalhe técnico

- Verificação feita em `bling_config`, `bling_sync_log`, `bling_sync_queue`, `bling_product_links`, `products`, `orders`.
- Cabeçalho da função publicada conferido com `curl -D -`: retorna `content-type: text/plain`; o arquivo `supabase/functions/bling-oauth-callback/index.ts` já define `text/html; charset=utf-8`. Basta redeploy.
