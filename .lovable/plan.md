# Plano: Corrigir tela do callback do Bling

## Situação atual
- A conexão OAuth com o Bling **deu certo** — o access token e refresh token foram gravados em `bling_config`.
- A tela feia (código-fonte em vez de página renderizada) acontece porque a versão **publicada** da função `bling-oauth-callback` devolve `content-type: text/plain` (confirmado com `curl -D -`).
- O código **local** já define o cabeçalho correto: `Content-Type: text/html; charset=utf-8` (linha 12 de `supabase/functions/bling-oauth-callback/index.ts`).

## O que fazer
1. Republicar a função `bling-oauth-callback` para que a versão publicada passe a devolver `Content-Type: text/html; charset=utf-8`.
2. Nenhuma mudança de código é necessária — o arquivo local já está correto.

## Para o usuário
- A conexão já funcionou. Feche a janela do navegador com o código-fonte.
- Volte em **Configurações → Bling** no painel e clique em **Testar conexão** para confirmar.
- Da próxima vez que alguém conectar, a tela de "Bling conectado" vai aparecer renderizada normalmente.

## Verificação
- Após republicar, `curl -s -o /dev/null -D - <callback-url>` deve mostrar `content-type: text/html; charset=utf-8`.
