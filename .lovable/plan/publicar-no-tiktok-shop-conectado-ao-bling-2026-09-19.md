# Publicar no TikTok Shop conectado ao Bling

## Por que não publicou
O produto está sincronizado no Bling pelo SKU `BODYSPLA-5SB1-200ml`, mas não houve nenhuma tentativa de anúncio no TikTok. Hoje o sistema envia somente cadastro, preço e estoque ao Bling; a rotina de anúncios do canal conectado ao Bling ainda não é chamada.

Além disso, o produto ainda aguarda confirmação dos dados sugeridos. Não há anúncio, fila ou retorno do TikTok registrado para ele.

## Resultado esperado
Usar a conta TikTok Shop já conectada dentro do Bling para criar e acompanhar o anúncio, sem exigir uma segunda conexão direta no painel e sem duplicar o produto.

## Etapas
1. Consultar no Bling as lojas e integrações disponíveis e identificar com segurança a loja TikTok Shop real.
2. Consultar o anúncio pelo produto do Bling e pelo SKU antes de criar qualquer registro.
3. Mostrar no produto as pendências exigidas pelo canal, incluindo confirmação dos dados, categoria e atributos obrigatórios.
4. Adicionar uma ação administrativa para confirmar os dados e solicitar a publicação pelo Bling.
5. Criar ou atualizar o anúncio vinculado à loja TikTok, usando as fotos, descrição, preço e estoque já sincronizados.
6. Solicitar a publicação e salvar o identificador real retornado pelo Bling.
7. Exibir no painel os estados “Publicado”, “Em análise” ou “Com pendência”, com a mensagem real do canal.
8. Tornar o reprocessamento seguro: o mesmo SKU e anúncio serão atualizados, nunca recriados em duplicidade.

## Regras
- O Bling será a ponte para o TikTok Shop já conectado nele.
- Nenhum produto será marcado como publicado sem confirmação real do Bling.
- Categoria e atributos ausentes não serão inventados; o painel pedirá confirmação.
- O estoque principal continuará sendo o painel, sincronizado com o Bling antes do anúncio.
- Falhas de custo no cadastro do Bling não impedirão o anúncio quando preço, estoque e dados obrigatórios estiverem válidos; a pendência de custo ficará informada separadamente.

## Detalhes técnicos
- Ampliar a integração Bling para consultar lojas, anúncios e publicação do anúncio, além dos recursos atuais de produtos e estoque.
- Persistir vínculo por produto, variante, loja e anúncio, com histórico de requisições e respostas.
- Proteger criação, confirmação e publicação para administradores.
- Validar o produto específico até obter o identificador real do anúncio ou uma pendência explícita devolvida pelo TikTok/Bling.
