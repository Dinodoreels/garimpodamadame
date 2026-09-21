# Reembolso completo e seguro

## Resultado
O administrador poderá solicitar, revisar e aprovar um reembolso pelo pedido. A aprovação enviará o estorno ao Mercado Pago e o pedido só será concluído como reembolsado após a confirmação do pagamento.

## Fluxo
1. Validar pedido, pagamento, valor solicitado e reembolsos anteriores.
2. Registrar a solicitação como pendente, sem alterar estoque ou pedido.
3. Ao aprovar, solicitar o estorno total ou parcial ao Mercado Pago com proteção contra repetição.
4. Confirmar o resultado pela resposta do Mercado Pago e também pelo aviso automático do pagamento.
5. Em reembolso total confirmado:
   - marcar o pedido como reembolsado;
   - devolver o estoque uma única vez;
   - colocar os saldos atualizados na sincronização do Bling;
   - tentar cancelar o envio do Melhor Envio quando ainda for permitido;
   - registrar cada resultado no histórico;
   - enviar aviso por e-mail ao cliente.
6. Em reembolso parcial confirmado, manter o pedido e registrar o valor reembolsado, sem devolver automaticamente todos os itens ao estoque.
7. Se alguma etapa secundária falhar, preservar o estorno confirmado e mostrar a pendência para correção, sem repetir o dinheiro ou o estoque.

## Painel administrativo
- Trocar a aprovação local por uma ação segura de “Aprovar e estornar”.
- Mostrar estados claros: pendente, processando, concluído, parcial, rejeitado e falha.
- Exibir retorno do Mercado Pago, estoque, Bling, envio e aviso ao cliente.
- Validar valor maior que zero e limitar ao saldo ainda reembolsável.
- Exigir confirmação antes de movimentar dinheiro.

## Detalhes técnicos
- Criar uma função protegida, disponível somente para administradores, para orquestrar o reembolso.
- Ampliar o registro de reembolsos com identificador do Mercado Pago, valor confirmado, tipo, erros e resultados das etapas.
- Reutilizar o controle idempotente já existente de movimentação de estoque.
- Atualizar o aviso do Mercado Pago para finalizar reembolsos iniciados fora ou dentro do painel.
- Adicionar a automação transacional de e-mail de reembolso, sem exigir consentimento de marketing.
- Manter histórico auditável e não criar pedidos, pagamentos ou dados fictícios durante a validação.

## Validação
- Verificar permissões e regras de acesso.
- Testar entradas inválidas e chamada sem autorização, sem executar estorno real.
- Validar o painel no computador e no celular.
- Publicar as funções alteradas e conferir seus retornos.
