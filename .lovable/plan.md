# Produtos e notas fiscais corretas por plataforma

## Resultado esperado
- Cada linha da tela de pedidos mostrará todos os produtos daquele pedido, com foto quando disponível, nome, variação, SKU, quantidade e valor.
- A origem continuará identificada como Site Garimpo da Madame, TikTok Shop, Mercado Livre, Shopee, Magalu, Amazon ou loja correspondente.
- A área fiscal exibirá somente o DANFE oficial autorizado, com botão claro para abrir e imprimir.

## Produtos na lista
- Adicionar uma área de produtos dentro de cada linha do pedido, adaptada para computador e celular.
- Mostrar todos os itens sem esconder produtos; quando a foto do item estiver vazia, buscar a imagem cadastrada no produto e usar um estado neutro se ela também não existir.
- Exibir nome, variação, SKU, quantidade e preço, preservando a abertura dos detalhes completos do pedido.
- Manter filtros, paginação e ações atuais sem alterar o fluxo dos pedidos.

## Nota fiscal por origem
### TikTok Shop e demais marketplaces conectados pelo Bling
- Não criar uma segunda nota fiscal.
- Consultar no Bling a nota já vinculada ao pedido da plataforma, recuperar situação, número, série, chave, DANFE e XML.
- Mostrar **Buscar nota da plataforma** quando ainda não houver documento local.
- Liberar **Imprimir DANFE** somente após a nota estar autorizada e o link oficial existir.
- Informar claramente quando a plataforma/Bling ainda não tiver emitido a nota, sem oferecer emissão duplicada.

### Pedidos do site Garimpo da Madame
- Manter validação de cliente, endereço, pagamento, produtos e cadastro fiscal.
- Permitir emissão manual pelo Bling somente após pagamento confirmado e sem nota existente.
- Depois da autorização, recuperar e mostrar DANFE e XML oficiais para impressão.

## Segurança fiscal
- Separar as ações conforme a origem no servidor, sem confiar apenas no que aparece na tela.
- Impedir emissão de nova NF-e para pedidos importados de marketplace.
- Antes de qualquer emissão do site, procurar uma nota já vinculada para evitar duplicidade.
- Registrar consultas, emissões, retornos, erros e alterações no histórico fiscal.
- Renomear o recibo interno para **Imprimir pedido**, evitando apresentá-lo como nota fiscal.

## Situação real confirmada
- Existem três pedidos recentes do TikTok Shop, cada um com um item importado e vínculo com pedido no Bling.
- Nenhum deles possui DANFE/XML salvo; somente um tem validação fiscal pendente.
- A configuração fiscal da empresa ainda não foi preenchida no sistema. Por isso, pedidos do site continuarão bloqueados para emissão até os dados legais reais serem cadastrados e homologados.
- Não serão inventados CNPJ, NCM, CFOP, série, natureza de operação ou regras tributárias.

## Validação
- Conferir a lista em computador e celular com produtos visíveis em cada pedido.
- Testar a recuperação das notas dos três pedidos reais do TikTok sem emitir novas notas.
- Confirmar que marketplace nunca exibe ação de emissão e que pedido do site pago exibe apenas após passar na validação.
- Confirmar abertura e impressão do DANFE oficial, além do acesso ao XML.
- Verificar que filtros, detalhes, status e demais ações atuais continuam funcionando.
