# Compra híbrida de etiquetas do Melhor Envio

## Objetivo
Exigir cadastro completo antes da compra e gerar automaticamente a etiqueta oficial dos pedidos pagos e completos do site. Pedidos com qualquer divergência ficam bloqueados para revisão, sem cobrança.

## Implementação

### 1. Regras de segurança e validação
- Exigir que a pessoa esteja cadastrada e autenticada para iniciar o checkout.
- Bloquear o avanço do checkout enquanto nome completo, CPF/CNPJ válido, telefone, e-mail e endereço completo não estiverem salvos no cadastro.
- Mostrar exatamente quais dados faltam e oferecer acesso direto para completá-los, sem apagar o carrinho.
- Considerar somente pedidos do site com pagamento confirmado.
- Validar destinatário, CPF/CNPJ, telefone, e-mail, endereço, serviço escolhido, itens, peso e dimensões.
- Exigir documento fiscal válido antes da compra quando o envio for comercial.
- Conferir conexão ativa do Melhor Envio e impedir nova compra quando o pedido já possuir etiqueta.
- Registrar separadamente os estados: aguardando dados, aguardando documento fiscal, pronto para compra, comprando, comprado, etiqueta pronta e erro.

### 2. Automação híbrida
- Após a confirmação do pagamento, executar a conferência automática.
- Se tudo estiver correto: preparar, comprar e solicitar a geração da etiqueta oficial.
- Se algo estiver ausente ou divergente: não comprar e enviar o pedido para revisão.
- Usar trava de processamento e identificador único por pedido para evitar cobrança duplicada, inclusive em notificações repetidas do pagamento.
- Se o Melhor Envio recusar a compra ou faltar saldo, manter o pedido em revisão com o motivo real.

### 3. Painel administrativo
- Adicionar nas configurações de frete o modo “Híbrido” e mostrar que ele está ativo.
- Mostrar quantos pedidos estão prontos, em revisão e com etiqueta pronta.
- No pedido, exibir a lista exata de pendências e oferecer “Conferir novamente”.
- Manter a compra manual com confirmação para pedidos revisados pelo administrador.
- Liberar impressão somente após o PDF oficial estar disponível.

### 4. Histórico e operação
- Registrar cada conferência, bloqueio, tentativa de compra, compra e geração da etiqueta.
- Não alterar nem comprar etiquetas de pedidos dos marketplaces.
- Não realizar compras reais durante validação técnica.

## Validação
- Testar pessoa sem cadastro, cadastro incompleto e cadastro completo, confirmando que apenas o último consegue avançar ao pagamento.
- Testar pedido incompleto e confirmar que nenhuma compra acontece.
- Testar repetição da confirmação de pagamento e confirmar que não duplica a operação.
- Validar os tipos, o painel e os retornos de erro.
- Publicar as funções necessárias somente após as verificações locais.
