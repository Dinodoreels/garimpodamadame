# Verificar cartão de débito de outros bancos

## Situação confirmada
- A loja envia ao Mercado Pago todas as formas disponíveis e bloqueia somente boleto.
- O checkout permite até 12 parcelas e não contém bloqueio para cartão de débito.
- Na compra mostrada, o próprio Mercado Pago ofereceu apenas **Cartão de Débito Virtual CAIXA**; as demais opções exibidas são crédito, pré-pago e Pix.

## Plano
1. Consultar, com a credencial ativa da loja, quais cartões e tipos de débito o Mercado Pago disponibiliza para essa conta.
2. Conferir se Visa Débito, Mastercard Débito ou outros bancos estão indisponíveis por regra da conta, do comprador ou do Checkout Pro.
3. Ajustar a preferência de pagamento somente se a API do Mercado Pago indicar uma configuração compatível para habilitar débito comum, preservando Pix, crédito em até 12x e boleto desativado.
4. Testar uma nova compra no checkout real e registrar exatamente quais opções de débito aparecem.
5. Se o Mercado Pago não oferecer débito comum nesse modelo, manter o checkout correto e apresentar no painel administrativo uma orientação clara sobre a limitação da conta, sem prometer uma forma indisponível.

## Resultado esperado
Outros cartões de débito serão exibidos quando forem aceitos pela conta e pelo Mercado Pago; caso a limitação seja do provedor, o painel informará isso claramente e indicará a configuração necessária na conta Mercado Pago.
