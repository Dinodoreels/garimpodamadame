# Baixa automática e segura das vendas do TikTok

## Objetivo
Quando uma venda do TikTok chegar pelo Bling, registrar o pedido uma única vez, baixar o estoque oficial da Vanguard Store somente uma vez e devolver a quantidade somente uma vez se houver cancelamento. Depois, enviar o saldo atualizado ao Bling e aos canais vinculados.

## Situação confirmada
- A integração ativa traz os pedidos do TikTok pelo Bling; há 20 pedidos TikTok já importados dessa forma.
- O estoque oficial está configurado como sendo o da loja e suas alterações já alimentam a fila de sincronização com o Bling.
- A importação direta do TikTok não está configurada no momento.
- O caminho direto já reduz estoque ao criar um pedido, mas não devolve no cancelamento; o caminho via Bling importa e atualiza pedidos, mas não registra a baixa central.
- Alguns pedidos antigos têm itens sem vínculo com uma variante local. Esses itens não podem alterar estoque até serem identificados com segurança.

## Implementação
1. **Criar um registro único de movimentações por pedido e variante**
   - Guardar baixa, devolução, quantidade, origem e horário.
   - Impedir no banco duas baixas ou duas devoluções da mesma venda.
   - Usar operação atômica para evitar concorrência entre aviso automático e busca periódica.

2. **Centralizar a regra de estoque**
   - Ao entrar em `pago`, `processando`, `enviado` ou `entregue`, baixar a quantidade ainda não contabilizada.
   - Ao entrar em `cancelado`, devolver apenas a quantidade anteriormente baixada.
   - Se um cancelamento voltar para um estado válido de venda, permitir nova baixa controlada, mantendo todo o histórico.
   - Nunca deixar o saldo abaixo de zero; falta de saldo vira pendência administrativa e log, sem ajuste silencioso.

3. **Aplicar a regra ao fluxo real do TikTok via Bling**
   - Identificar cada item por vínculo Bling, SKU ou GTIN confirmado.
   - Criar os itens antes da movimentação e aplicar a baixa/devolução após cada criação ou mudança de situação.
   - Manter pedidos e etiquetas oficiais recebidos do Bling.

4. **Proteger contra pedido duplicado**
   - Usar o código externo do pedido TikTok, recebido no Bling, como chave única do canal.
   - Se futuramente a conexão direta do TikTok for ativada, vinculá-la ao mesmo pedido já existente em vez de criar outro ou baixar novamente.
   - Manter os vínculos Bling e TikTok no mesmo pedido local.

5. **Propagar o saldo oficial**
   - Toda baixa ou devolução atualizará a variante central.
   - Os gatilhos existentes colocarão o novo saldo na fila do Bling; o Bling distribuirá aos canais conectados.
   - Registrar sucesso, falha e nova tentativa sem repetir a movimentação de estoque.

6. **Tratar o histórico sem alterar saldo às cegas**
   - Não baixar novamente os pedidos antigos apenas por já estarem pagos.
   - Criar uma reconciliação que compare pedidos, vínculos e movimentos existentes.
   - Marcar itens antigos sem variante ou sem prova de baixa para revisão; somente diferenças comprovadas serão corrigidas.

## Validação
- Simular uma venda TikTok paga: um pedido, uma baixa e saldo enviado ao Bling.
- Reprocessar o mesmo aviso e a mesma busca: nenhuma segunda baixa.
- Cancelar: uma devolução; repetir o cancelamento: nenhuma segunda devolução.
- Reativar uma venda cancelada: uma nova baixa controlada.
- Receber o mesmo pedido pelo TikTok e pelo Bling: um único pedido e uma única movimentação.
- Confirmar que item sem vínculo não altera saldo e aparece como pendência clara.
- Verificar logs, histórico do pedido e fila de sincronização.

## Detalhes técnicos
- Nova tabela protegida por acesso administrativo para o livro de movimentos por pedido/variante, com chaves únicas idempotentes e permissões explícitas.
- Função transacional no banco para bloquear a variante, calcular a diferença já contabilizada e atualizar o saldo com segurança.
- Função compartilhada usada pelas importações Bling e TikTok para evitar regras divergentes.
- O fluxo principal continuará sendo TikTok → Bling → Vanguard Store; a integração direta ficará apenas como caminho compatível e deduplicado.
