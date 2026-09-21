# Corrigir gargalos da jornada de compra

## Objetivo
Deixar a compra clara e contínua desde a vitrine até o redirecionamento seguro para pagamento, sem executar cobrança ou comprar etiqueta durante os testes.

## Alterações
- Corrigir o carregamento do detalhe do produto e evitar uma espera indefinida.
- Selecionar automaticamente o endereço padrão no carrinho e calcular o frete sem exigir uma descoberta manual.
- Manter “Finalizar compra” acionável para explicar exatamente o que falta, em vez de deixá-lo apenas apagado.
- Criar páginas de entrada para `/cart` e `/carrinho` que abram a loja com o carrinho, evitando erro 404 em links externos e recuperação de carrinho.
- Trocar consultas opcionais que retornam erro quando ainda não existe configuração por respostas vazias tratadas normalmente.
- Corrigir os avisos de referência dos elementos gerais da página.
- Remover depoimentos fictícios exibidos por padrão, preservando depoimentos reais que forem cadastrados no painel.
- Corrigir a exibição truncada do nome “O Garimpo Digital” no rodapé.

## Validação
- Repetir a jornada autenticada: abrir vitrine, pesquisar, abrir produto, adicionar ao carrinho, carregar endereço, cotar PAC/SEDEX e liberar o botão de compra.
- Confirmar `/cart` e `/carrinho` sem 404.
- Conferir mensagens para perfil/endereço/frete pendentes.
- Conferir celular e computador.
- Parar antes do pagamento; não criar cobrança, pedido pago ou etiqueta.
