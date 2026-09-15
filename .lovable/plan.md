# Automação completa do Bling e marketplaces

## Resultado
Criar um padrão único e automático para TikTok Shop, Mercado Livre, Shopee e Amazon, usando o Bling como ponte e a Vanguard Store como controle central.

## 1. Padrão único de cadastro
- Usar o mesmo SKU na Vanguard Store, no Bling e em todos os marketplaces.
- Para produtos do Bling sem código, gerar um SKU estável no formato `GDM-BLG-<ID do produto>`.
- Salvar o código gerado no próprio produto do Bling e reutilizá-lo em todas as próximas sincronizações.
- Padronizar título, descrição, fotos, preço, custo, peso, dimensões e situação do anúncio sem apagar dados válidos.
- Manter produtos novos como rascunho oculto até a aprovação administrativa.

## 2. Estoque e preços
- Manter uma única origem de verdade conforme a configuração já disponível: loja manda, Bling manda ou somente aviso.
- Propagar mudanças de saldo e preço pelo vínculo do SKU, evitando atualizações em círculo.
- Usar o depósito padrão escolhido no Bling e impedir envio de estoque sem depósito configurado.
- Registrar divergências e falhas por produto e canal.

## 3. Pedidos e andamento
- Trazer pedidos de TikTok Shop, Mercado Livre, Shopee e Amazon recebidos pelo Bling.
- Sincronizar cliente, itens, quantidades, preços, frete, endereço, canal, pagamento, cancelamento, envio e rastreio.
- Evitar pedidos duplicados pelos identificadores do Bling e do marketplace.
- Devolver ao Bling as atualizações permitidas pela configuração da loja.

## 4. Automação segura
- Processar produtos em lotes limitados, com bloqueio contra duas execuções simultâneas e retomada sem duplicar trabalho.
- Repetir chamadas apenas em falhas temporárias e respeitar os limites do Bling.
- Parar e mostrar claramente erros de autorização, conta, depósito, canal ou dados obrigatórios.
- Manter conflitos reais bloqueados, como dois produtos diferentes usando o mesmo SKU.

## 5. Painel administrativo
- Mostrar o estado de cada canal: conectado pelo Bling, aguardando configuração, sincronizado ou com erro.
- Exibir os SKUs gerados automaticamente, estoque, preço, pedidos e última sincronização.
- Permitir buscar tudo, revisar rascunhos, aplicar lotes e tentar novamente somente os itens com erro.
- Disponibilizar histórico filtrável por produto, pedido, canal e operação.

## Validação com dados reais
- Executar uma nova busca e confirmar que os 37 produtos sem SKU recebem códigos no Bling e deixam de aparecer bloqueados.
- Repetir a busca e confirmar que os mesmos códigos são mantidos e nenhum cadastro é duplicado.
- Validar um produto e um pedido real de cada canal disponível na conta Bling.
- Confirmar estoque, preço, cancelamento, envio e rastreio de ponta a ponta.
- Confirmar que nenhum rascunho novo aparece aos clientes antes da aprovação.

## Detalhes técnicos
- Reutilizar a integração Bling API v3, vínculos, filas, logs, importação e configurações já existentes.
- Atualizar produtos sem SKU no Bling por ID antes de classificá-los na prévia; registrar o código gerado e a resposta da operação.
- Não criar conexões diretas paralelas com os marketplaces enquanto eles estiverem integrados pelo Bling.
- Não apagar produtos, pedidos ou históricos existentes.
