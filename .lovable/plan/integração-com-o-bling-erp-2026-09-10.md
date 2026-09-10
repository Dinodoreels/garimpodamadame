# Integração com o Bling (ERP)

Conectar a loja ao Bling para que ele seja a ponte com Mercado Livre, Shopee, Magalu, Amazon e TikTok Shop. Tudo é configurado e controlado por uma nova aba **Bling** dentro do painel de Integrações, com o mesmo estilo das abas já existentes (Shopify, TikTok).

## O que a integração faz

1. **Estoque e preços** — quando o estoque ou o preço muda de um lado, o outro é atualizado automaticamente.
2. **Produtos** — envio dos produtos da loja para o Bling e importação dos produtos que já existem lá, com vínculo por SKU.
3. **Pedidos da loja para o Bling** — cada venda do site vira um pedido no Bling, pronto para nota fiscal e envio.
4. **Pedidos dos marketplaces para a loja** — pedidos que o Bling recebe do Mercado Livre, Shopee, Magalu, Amazon e TikTok Shop aparecem no painel de Pedidos, marcados com a origem.

## Controle total pelo painel

Como você pediu para poder mudar tudo por dentro do sistema, a aba Bling terá:

- Botão **Conectar com o Bling** (login pela conta Bling, sem digitar chaves à mão além do cadastro do aplicativo).
- Liga/desliga geral da integração.
- Chaves para ligar/desligar cada sincronização separadamente: estoque, preços, produtos, pedidos para o Bling, pedidos dos marketplaces.
- Escolha de quem manda em caso de diferença: **Bling manda**, **Loja manda** ou **Só avisar** (mostra a diferença e você decide) — regulável por item (estoque e preço).
- Frequência da busca de pedidos (ex: a cada 5, 15 ou 30 minutos).
- Lista de produtos vinculados com status (vinculado, com erro, não vinculado) e botão para vincular ou sincronizar manualmente.
- Histórico de sincronizações com o erro exato quando algo falha, e botão de tentar de novo.
- Botão de teste da conexão.

## Passo a passo do que será feito

1. **Guia de configuração** na tela, explicando como criar o aplicativo no Bling (Bling > Cadastros > Aplicativos), o que colar e qual URL de retorno usar. Você ainda não tem conta, então esse guia fica pronto antes de precisar dos dados.
2. **Estruturas no banco**: configuração do Bling, vínculo de produtos, vínculo de pedidos, filas de sincronização e histórico.
3. **Conexão segura** com login pela conta Bling e renovação automática do acesso.
4. **Sincronizações** de produtos, estoque/preço e pedidos, rodando em segundo plano.
5. **Aba Bling no painel** com tudo acima.

## Detalhes técnicos

- API Bling v3 (`https://api.bling.com.br/Api/v3`), OAuth2 authorization code com refresh token; credenciais do app guardadas na config e tokens renovados por função de borda.
- Tabelas novas: `bling_config`, `bling_product_links`, `bling_order_links`, `bling_sync_queue`, `bling_sync_log` — todas com GRANTs e RLS restrita a admin; leitura pública nenhuma.
- Edge functions espelhando o padrão TikTok: `bling-oauth-start`, `bling-oauth-callback`, `bling-test`, `bling-sync-product`, `bling-flush-queue` (cron), `bling-pull-orders` (cron), `bling-push-order`, `bling-webhook` (callbacks de estoque/pedido do Bling).
- Shared em `supabase/functions/_shared/bling.ts` com `getConfig`, `assertAdmin`, `callBling` (refresh automático + tratamento de rate limit 3 req/s), `logSync`.
- Triggers `bling_enqueue_product` / `bling_enqueue_stock` em `products` e `product_variants`, condicionados às chaves de sincronização, seguindo o modelo Shopify/TikTok.
- Pedidos importados entram em `orders` com `source = 'bling:<canal>'` e vínculo em `bling_order_links` para evitar duplicidade.
- Frontend: `src/components/admin/integrations/BlingTab.tsx`, hook `useBling`, guia em `providerGuides.ts`, aba registrada em `src/pages/admin/Settings.tsx`.

## O que vou precisar de você depois

Criar a conta no Bling num plano que libere a API v3 e cadastrar o aplicativo lá — eu te passo a URL de retorno exata quando a parte técnica estiver pronta.
