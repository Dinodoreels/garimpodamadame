# Trazer produtos e estoque do Bling para o nosso sistema

## Resultado
Aplicar os 52 produtos reais da prévia do Bling diretamente no cadastro **Produtos** do nosso sistema, junto com suas quantidades de estoque.

## Aplicação
- Processar os 52 produtos em dois lotes seguros, sem criar duplicidades.
- Criar cada item em **Produtos** como **Rascunho**, mantendo-o invisível para os clientes até aprovação.
- Criar a variação com o mesmo SKU já salvo no Bling.
- Trazer para a coluna **Estoque** a quantidade informada pelo Bling, conforme a configuração atual “O Bling manda”.
- Trazer os demais dados reais disponíveis: nome, descrição, preço, custo, peso, dimensões e imagens.
- Não criar entradas no módulo Inbound/Galpão, pois a escolha foi **Produtos e estoque**.

## Onde conferir
- **Painel → Produtos:** cadastro, situação Rascunho, preço e estoque.
- Clique na quantidade da coluna **Estoque:** detalhes e ajuste do saldo do produto.
- **Configurações → Bling → Produtos vinculados:** vínculo do SKU com o produto no Bling.

## Validação
- Confirmar 52 itens processados e 52 vínculos, sem conflitos ou SKUs duplicados.
- Confirmar que as quantidades exibidas em Produtos correspondem à prévia real do Bling.
- Confirmar que todos continuam ocultos na loja pública.
- Registrar falhas individuais e repetir somente os itens que falharem.
