# Mostrar a plataforma real do pedido e levá-la à NF-e

## Objetivo
Trocar o rótulo genérico “Site” pela origem real da venda e registrar essa informação como complemento da nota fiscal, sem alterar impostos nem o fluxo atual dos pedidos.

## Alterações

### 1. Identificar a origem correta
- Tratar separadamente: site Garimpo da Madame, WhatsApp, loja física e pedidos recebidos pelo Bling.
- Para pedidos do Bling, resolver a loja/canal pelo identificador recebido e mostrar o nome real, como TikTok Shop, Mercado Livre, Shopee, Amazon ou Magalu.
- Quando o Bling não fornecer um nome reconhecível, mostrar “Bling — canal [identificador]” em vez de classificar incorretamente como “Site”.
- Preservar o identificador e o nome do canal no vínculo do pedido para histórico e futuras sincronizações.

### 2. Exibir no painel
- Substituir “Origem” por “Plataforma” nos detalhes do pedido.
- Mostrar também “Loja / e-commerce” quando houver uma loja específica vinculada.
- Aplicar o mesmo nome real na coluna de origem da lista de pedidos.
- Usar ícones e rótulos próprios para site, WhatsApp, loja física e marketplaces.

### 3. Levar a origem à nota fiscal
- Incluir uma informação complementar fiscal clara, por exemplo: “Venda realizada pela plataforma TikTok Shop — pedido externo 123”.
- Para o site próprio, registrar “Venda realizada no site Garimpo da Madame”.
- Para loja física, registrar o nome da unidade cadastrada.
- Não usar a plataforma para definir NCM, CFOP, impostos, série ou natureza da operação.
- Manter a emissão bloqueada enquanto os demais dados fiscais obrigatórios estiverem pendentes.

### 4. Sincronização e histórico
- Atualizar a importação de pedidos para resolver automaticamente os nomes dos canais do Bling.
- Atualizar pedidos já importados que hoje aparecem como “canal 206287908”, sem recriar pedidos nem itens.
- Registrar no histórico fiscal a plataforma usada na preparação da nota.

## Validação
- Conferir no painel pedidos do site, Bling e loja física, quando existirem.
- Validar que os pedidos atuais deixam de aparecer incorretamente como “Site”.
- Preparar a validação fiscal de um pedido sem emitir NF-e e confirmar que a plataforma aparece no complemento e no histórico.
- Confirmar que nenhuma nota real é transmitida durante os testes.

## Detalhes técnicos
- Reutilizar `orders.source`, `orders.store_id`, `stores` e `bling_order_links.channel/raw_payload`.
- Consultar as lojas/canais do Bling quando o pedido trouxer apenas o identificador do canal.
- Ajustar a carga administrativa para trazer o vínculo Bling e a loja física junto com cada pedido.
- Acrescentar a origem resolvida ao snapshot e aos eventos fiscais; antes de transmitir, usar somente o campo de observação complementar aceito pela API atual do Bling.
