# Corrigir estoque e imagens dos produtos do Bling

## Situação confirmada
- Os 52 produtos foram importados e vinculados corretamente.
- A prévia recebida do Bling informou saldo entre **-4 e 0**; por segurança, o sistema transformou saldos negativos em zero.
- Nenhuma imagem foi recebida na lista de imagens dos 52 produtos, por isso os produtos ficaram sem foto.
- O depósito do Bling ainda não está selecionado no painel.

## Ajuste
1. Consultar os depósitos do Bling e exigir a escolha do depósito que representa o estoque disponível para venda.
2. Buscar o saldo real de cada produto nesse depósito, em vez de depender apenas do saldo resumido do cadastro.
3. Buscar as imagens no detalhe completo e na mídia do produto do Bling, aceitando os formatos reais retornados pela API.
4. Atualizar os 52 produtos já vinculados, sem recriar produtos, variações ou SKUs.
5. Manter todos como **Rascunho** e ocultos da loja pública.
6. Mostrar no painel uma mensagem clara quando o Bling realmente tiver saldo zero ou quando um produto realmente não possuir imagem.

## Validação
- Comparar o saldo do depósito escolhido no Bling com a coluna **Estoque** do nosso sistema.
- Confirmar quantos dos 52 produtos possuem imagens no Bling e quantos foram atualizados no sistema.
- Repetir a atualização e confirmar que não há duplicidade de produtos, imagens ou vínculos.
- Não apagar produtos, pedidos ou históricos existentes.

## Detalhes técnicos
A atualização reutilizará os vínculos já gravados pelo identificador do produto e SKU. O estoque será consultado no endpoint de saldos por depósito; as imagens serão normalizadas a partir das estruturas de mídia retornadas pelo detalhe do produto. A aplicação continuará idempotente e limitará saldo negativo a zero.
