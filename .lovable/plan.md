# Confirmação e categoria TikTok dentro do sistema

## Objetivo
Permitir que o administrador conclua, no próprio cadastro do produto, as duas pendências que hoje impedem o envio ao TikTok Shop pelo Bling.

## Experiência no cadastro do produto
- Criar uma seção **Publicação no TikTok Shop** dentro de **Editar Produto**.
- Mostrar uma revisão clara dos dados que serão enviados: título, descrição, marca, preço, estoque, fotos e informações fiscais/comerciais existentes.
- Manter a confirmação explícita **“Revisei e confirmo os dados”**, registrando quem confirmou e quando.
- Mostrar a situação da categoria TikTok: selecionada, faltando ou precisando de atributos.
- Permitir pesquisar e escolher somente categorias reais disponíveis para o canal TikTok conectado no Bling.
- Exibir os atributos obrigatórios da categoria escolhida e impedir publicação enquanto algum obrigatório estiver vazio.
- Adicionar a ação **Confirmar e publicar no TikTok**, com retorno real: publicado, aguardando, ou problema informado pelo Bling/TikTok.

## Regras
- Somente administrador poderá confirmar dados, escolher categoria e publicar.
- Nenhuma categoria, atributo legal ou dado comercial será inventado automaticamente.
- O vínculo será salvo por tipo de produto para poder reaproveitar a categoria confirmada em outros produtos equivalentes, sempre permitindo revisão.
- A publicação continuará sem duplicidade: se já existir anúncio, o sistema apenas consultará/atualizará sua situação.
- Estoque, preço, fotos e produto continuarão usando o cadastro central e o vínculo existente com o Bling.

## Integração técnica
- Adaptar a busca de categorias para o canal TikTok ativo no Bling, sem exigir uma segunda conexão direta com o TikTok.
- Usar o registro já existente de canais e mapeamentos de categorias; alinhar a tela antiga de categorias com o mesmo registro para evitar dois cadastros diferentes.
- Salvar confirmação, categoria, atributos obrigatórios e histórico da decisão.
- Chamar a publicação oficial já preparada somente após todas as validações.
- Traduzir os erros retornados pelo Bling/TikTok para mensagens simples no produto.

## Validação
- Testar primeiro com o produto real **Body Splash Sociedade das Vilas Elixir Noturno DKA 200 ml**.
- Confirmar que a categoria escolhida é real, que os campos obrigatórios aparecem e que não há anúncio duplicado.
- Validar no painel o status final e o código do anúncio retornado.
