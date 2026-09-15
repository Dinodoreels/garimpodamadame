# Mercado Pago e nota fiscal pelo Bling

## Resultado
- Ativar Mercado Pago no checkout com PIX, cartão de crédito e cartão de débito; boleto continuará desativado.
- Emitir a nota fiscal pelo Bling em nome do cliente final e disponibilizá-la no pedido para o centro de distribuição imprimir e despachar.
- Não emitir nota com dados incompletos ou inventados: o painel mostrará exatamente o que falta corrigir.

## Pagamento
- Guardar o Access Token do Mercado Pago apenas no cofre seguro do projeto; a chave não ficará visível no painel nem salva nas configurações comuns.
- Validar a credencial, distinguir teste de produção e ativar o Mercado Pago somente após a conexão funcionar.
- Criar a cobrança com os itens reais do pedido, frete, desconto, cliente e endereço; confirmar o pagamento pelo aviso oficial do Mercado Pago.
- Registrar código da cobrança, forma de pagamento e histórico, com proteção contra avisos repetidos ou valores divergentes.

## Nota fiscal e centro de distribuição
- Criar uma área “Fiscal” nas configurações para razão social, CNPJ, inscrição estadual, regime tributário, endereço de emissão, série e natureza da operação.
- Validar no pedido os dados obrigatórios do cliente final: nome, CPF/CNPJ e endereço completo.
- Quando o pagamento for aprovado, preparar o pedido para emissão fiscal no Bling; a emissão automática só ficará disponível depois que os dados fiscais, impostos dos produtos e certificado/configuração fiscal do Bling estiverem válidos.
- No pedido, mostrar situação da nota, motivo de pendência/erro, número, chave de acesso, DANFE/XML e ações de emitir novamente ou consultar.
- Criar uma visão operacional para o centro de distribuição com pedido, itens, endereço, DANFE e impressão, sem permitir alterar dados fiscais.
- Manter histórico completo de cada tentativa, retorno e mudança da nota, sem apagar registros anteriores.

## Segurança e regras
- Somente administrador configura dados fiscais e solicita emissão ou cancelamento.
- O centro de distribuição apenas consulta e imprime documentos já autorizados.
- Notas só serão emitidas para pedidos pagos, com valor e itens conferidos.
- Pedidos dos marketplaces não serão duplicados; quando já tiverem nota no Bling, o sistema apenas sincronizará os dados.
- Nenhuma nota fiscal será apresentada como válida antes da autorização da SEFAZ retornada pelo Bling.

## Validação
- Testar uma cobrança de teste e confirmar que o pedido muda de situação uma única vez.
- Validar um pedido completo e outro com CPF/CNPJ ou endereço ausente, mostrando bloqueio claro.
- Consultar uma nota pelo Bling, confirmar número/chave/DANFE/XML no painel e testar a impressão do centro de distribuição.
- Confirmar que boleto não aparece e que nenhuma credencial fica visível no navegador.
