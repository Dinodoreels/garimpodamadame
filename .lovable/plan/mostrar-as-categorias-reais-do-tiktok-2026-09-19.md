# Mostrar as categorias reais do TikTok

## Objetivo
Exibir no cadastro do produto todas as categorias reais disponíveis no TikTok Shop conectado pelo Bling, permitindo pesquisar, selecionar e confirmar a categoria correta.

## Implementação
1. Ajustar a consulta ao endpoint oficial de categorias de anúncios do Bling, enviando também o tipo do produto quando necessário.
2. Buscar a árvore completa por níveis: carregar categorias principais e consultar as subcategorias até chegar às categorias finais aceitas para publicação.
3. Normalizar os diferentes formatos retornados pelo Bling sem descartar categorias válidas e eliminar duplicidades pelo código da categoria.
4. Mostrar as categorias hierarquicamente na busca, por exemplo: `Beleza > Perfumes > Body Splash`.
5. Exibir mensagens distintas para: canal desconectado, permissão ausente, falha do Bling e nenhuma categoria retornada.
6. Manter a validação atual: somente categorias realmente devolvidas pelo TikTok via Bling poderão ser confirmadas; nenhuma categoria será inventada.
7. Após a escolha, carregar os atributos obrigatórios reais da categoria e liberar a publicação automática somente quando todos estiverem preenchidos.

## Validação
- Testar a busca usando o canal TikTok real “Garimpo da Madame”.
- Confirmar que a lista aparece no cadastro e pode ser pesquisada.
- Validar o Body Splash até a etapa de seleção, sem publicar durante o teste.
- Confirmar que o código, nome completo e atributos da categoria selecionada ficam registrados no produto.
