# Acréscimo fixo no valor do frete

## Painel administrativo
- Adicionar em **Administração → Configurações de Frete** um controle para ativar ou desativar o acréscimo.
- Adicionar o campo **Acréscimo no frete (R$)**, aceitando apenas valor válido, positivo e com duas casas decimais.
- Salvar junto às configurações atuais de frete e mostrar um exemplo simples do valor final.

## Regra de cálculo
- Somar o valor fixo configurado a todas as cotações de entrega, tanto do Melhor Envio quanto dos Correios e dos valores de contingência.
- Exibir ao cliente somente o preço final já somado, como preço normal do frete, sem linha separada ou menção ao acréscimo.
- Manter internamente o custo original da transportadora para conferência administrativa.
- Aplicar a regra antes de ordenar as opções pelo menor preço.
- Quando o pedido atingir a regra de **frete grátis**, zerar também o acréscimo e mostrar **Grátis / R$ 0**.

## Proteção do checkout
- Recalcular e validar o frete no servidor ao criar o pedido, usando endereço, itens e configuração vigente.
- Não confiar apenas no preço enviado pelo navegador, evitando alteração manual ou uso de uma cotação antiga.
- Salvar no pedido o preço final cobrado do cliente e o custo original da transportadora separadamente.

## Compatibilidade
- O acréscimo valerá nas páginas de produto, carrinho, compra imediata e checkout, pois todas usam o mesmo cálculo central.
- A compra da etiqueta do Melhor Envio continuará pelo custo real retornado pela transportadora.
- Pedidos antigos não serão alterados.

## Validação
- Testar cotação normal com acréscimo ativo e inativo.
- Testar Melhor Envio e valor de contingência.
- Testar frete grátis, confirmando total igual a zero.
- Confirmar que o checkout rejeita preço adulterado ou desatualizado.
- Conferir o valor final no carrinho, pedido e pagamento, sem mostrar o acréscimo separadamente ao cliente.
