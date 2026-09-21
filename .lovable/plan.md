# Exibir o acréscimo na tela correta de frete

## Correção
- Adicionar o controle **Acréscimo fixo no valor do frete** diretamente na aba **Administração → Configurações → Frete**, logo abaixo de **Ponto de distribuição**.
- Incluir opção para ativar/desativar, campo **Acréscimo no frete (R$)**, exemplo do preço final e botão **Salvar acréscimo**.
- Aceitar somente valor positivo com duas casas decimais e manter o campo desativado quando a opção estiver desligada.
- Salvar nas mesmas configurações já usadas pelo cálculo central.

## Funcionamento mantido
- O cliente continuará vendo apenas o valor final do frete, sem indicação do acréscimo.
- Frete grátis continuará em R$ 0,00.
- O custo original da transportadora continuará guardado separadamente.
- Melhor Envio, Correios e contingência continuarão usando a mesma regra protegida no checkout.

## Validação
- Confirmar visualmente que o novo bloco aparece entre **Ponto de distribuição** e **Conta Melhor Envio**.
- Ativar, informar um valor, salvar e recarregar a página para confirmar a permanência.
- Conferir que a cotação exibe somente o preço final ao cliente.

## Detalhe técnico
A aba atual é renderizada pelo `ShippingTab` dentro da página de configurações. Existe também uma página separada de frete que já recebeu o controle, mas ela não é a tela mostrada no painel atual; o mesmo controle será conectado à tela efetivamente utilizada.
