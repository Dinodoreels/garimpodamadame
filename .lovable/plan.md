# Corrigir o botão de pagamento por PIX

## Objetivo
Fazer a opção PIX avançar até a geração do QR Code, mantendo cartão e o fluxo atual do Mercado Pago funcionando.

## Situação confirmada
- O checkout cria preferências reais no Mercado Pago e as duas tentativas mais recentes retornaram sucesso ao sistema.
- A preferência não bloqueia PIX; somente boleto está excluído.
- Os dois pedidos recentes ficaram pendentes e ainda não receberam método de pagamento, indicando que a tentativa não chegou à confirmação do PIX.
- O texto sobre “Compra Garantida” é um aviso do próprio Mercado Pago e não deveria impedir o pagamento.

## Implementação
1. Reproduzir a tentativa com o cadastro real, abrir o checkout criado e registrar o que acontece ao clicar em PIX, incluindo a resposta da página do Mercado Pago.
2. Conferir a preferência usada na tentativa e os dados obrigatórios enviados para o pagador, sem expor credenciais ou dados pessoais.
3. Corrigir a criação da preferência conforme o erro confirmado, incluindo os dados válidos de identificação do comprador quando exigidos e mantendo PIX habilitado explicitamente.
4. Melhorar o retorno no carrinho para mostrar a mensagem real caso o Mercado Pago não consiga iniciar o pagamento, evitando botão sem resposta.
5. Revisar a tentativa de pagamento de pedido pendente para usar a mesma configuração corrigida e remover a marca antiga ainda presente nesse fluxo.
6. Publicar as funções de pagamento alteradas e testar: criação do pedido, seleção do PIX, geração do QR Code, retorno pendente e atualização pelo aviso de pagamento.

## Limites de segurança
- Não será realizado pagamento real durante o teste.
- Nenhum dado ou credencial será inventado ou exibido.
- A correção não mudará preços, frete, estoque ou outras formas de pagamento.
