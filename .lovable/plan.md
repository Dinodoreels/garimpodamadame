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
- Emitir automaticamente pelo Bling após pagamento confirmado, somente quando todas as validações fiscais estiverem completas e não existir nota vinculada.
- Quando faltar qualquer dado obrigatório, não emitir: deixar o pedido na fila de pendências com o motivo e o caminho para correção.
- Depois da autorização, recuperar e mostrar DANFE e XML oficiais para impressão.

## Publicação automática de produtos na loja
- Importar automaticamente os produtos já lançados nas plataformas por meio do Bling, preservando o SKU único e evitando duplicidades.
- Trazer título, descrição, preço, estoque, variações, peso, dimensões e todas as fotos reais disponíveis.
- Publicar automaticamente no site apenas produtos com SKU único, preço válido, estoque positivo, vínculo confirmado e pelo menos uma foto.
- Manter como rascunho qualquer produto incompleto ou conflitante, mostrando claramente o motivo para correção.
- Identificar no painel a plataforma de origem com nome e logotipo de TikTok Shop, Mercado Livre, Shopee, Magalu ou Amazon; os logotipos serão apenas informativos no painel, sem alterar a apresentação comercial do produto na vitrine.
- Atualizações posteriores de estoque, preço e imagens seguirão a autoridade já configurada, sem recriar produtos ou anúncios.

## Segurança fiscal
- Separar as ações conforme a origem no servidor, sem confiar apenas no que aparece na tela.
- Impedir emissão de nova NF-e para pedidos importados de marketplace.
- Antes de qualquer emissão do site, procurar uma nota já vinculada para evitar duplicidade.
- Processar emissão automática com trava e idempotência, para que reenvios e webhooks repetidos nunca criem duas notas.
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
- Confirmar que marketplace nunca emite outra nota e que pedido do site pago dispara emissão automática somente após passar na validação.
- Confirmar abertura e impressão do DANFE oficial, além do acesso ao XML.
- Importar novamente o catálogo e confirmar publicação dos produtos completos com fotos e plataforma; itens incompletos devem permanecer em rascunho.
- Repetir importação, atualização de pagamento e processamento fiscal para confirmar que produtos, anúncios e notas não são duplicados.
- Verificar que filtros, detalhes, status e demais ações atuais continuam funcionando.
