# Aplicar agora a importação automática do Bling

## Resultado
Aplicar os 52 produtos da prévia atual, usando os SKUs já gravados no Bling e mantendo todos os novos produtos ocultos para revisão antes de aparecerem na loja.

## Execução
- Processar os 52 produtos em lotes seguros, com retomada sem duplicação caso algum lote falhe.
- Criar cada produto como rascunho indisponível e vinculá-lo ao mesmo SKU do Bling.
- Trazer título, descrição, preço, custo, peso, dimensões e imagens disponíveis, sem inventar informações ausentes.
- Respeitar a configuração atual sobre quem controla preço e estoque.
- Impedir que a importação gere uma atualização de volta ao Bling para o mesmo produto.

## Onde aparecerão
- No painel: **Produtos**, identificados como **Rascunho** e localizáveis pelo nome ou SKU.
- No estoque: na coluna **Estoque** e ao abrir o controle de estoque do produto; a configuração atual traz a quantidade do Bling.
- Na integração: **Configurações → Bling → Produtos vinculados**, com o mesmo SKU gravado no Bling.
- Antes da aplicação, os 52 itens existem somente na prévia do Bling e ainda não aparecem na lista de produtos.

## Validação
- Confirmar 52 itens processados, zero conflitos e nenhum SKU duplicado.
- Confirmar que todos os novos produtos permanecem ocultos aos clientes.
- Confirmar os vínculos entre loja e Bling e registrar qualquer falha individual para nova tentativa.
- Conferir o resultado de pedidos e os canais realmente disponíveis na conta; validar cada marketplace somente quando houver pedido real desse canal.

## Segurança
- Não apagar produtos, pedidos ou históricos existentes.
- Não publicar automaticamente nenhum produto novo.
- Não fabricar pedidos, fotos, estoque ou dados de marketplace para testes.
