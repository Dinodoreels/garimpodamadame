# Finalizar a importação dos produtos e estoques do Bling

## Objetivo
Concluir a importação real dos 52 produtos para **Produtos e estoque** do nosso sistema, sem duplicar os 51 rascunhos já criados e sem publicar nada automaticamente.

## Situação confirmada
- 51 produtos já existem no painel como **Rascunho** e estão ocultos da loja pública.
- Cada um desses 51 produtos já possui uma variação e um SKU.
- O vínculo com o Bling falhou depois da criação dos produtos, por isso a execução registrou erro nos 52 itens.
- Falta criar um único produto; os vínculos ainda não foram gravados.
- O Bling informou saldo igual ou menor que zero para todos os 52 itens nessa prévia; no sistema, o estoque ficará em zero, sem transformar saldo negativo em estoque vendável.

## Implementação
1. Corrigir o vínculo com o Bling para usar a chave única aceita pela tabela atual.
2. Tornar a aplicação retomável:
   - localizar primeiro o produto já criado pelo identificador do Bling e pelo SKU;
   - reutilizar os 51 rascunhos existentes;
   - criar somente o produto realmente ausente;
   - nunca criar uma segunda cópia ao repetir a operação.
3. Melhorar o registro de erros para mostrar mensagens legíveis, em vez de `[object Object]`.
4. Reprocessar somente os 52 itens com erro da execução atual.
5. Manter todos os novos produtos como **Rascunho**, ocultos dos clientes.
6. Não criar entradas no módulo Inbound/Galpão e não apagar produtos, pedidos ou históricos.

## Validação
- Confirmar exatamente 52 produtos importados e 52 SKUs únicos.
- Confirmar exatamente 52 vínculos com o Bling.
- Confirmar que todos permanecem como rascunho e invisíveis na loja pública.
- Confirmar estoque zero para os itens cujo saldo real do Bling é zero ou negativo.
- Repetir a aplicação para provar que nenhum produto ou vínculo é duplicado.
- Conferir no painel: **Produtos** e **Configurações → Bling → Produtos vinculados**.

## Detalhes técnicos
A correção ficará na função de aplicação da importação. Ela fará recuperação idempotente pelos identificadores já existentes, gravará o vínculo sem depender do índice por expressão que causou a falha e serializará corretamente erros retornados pelo banco.
