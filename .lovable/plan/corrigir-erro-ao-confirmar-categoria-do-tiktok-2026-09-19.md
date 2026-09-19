# Corrigir erro ao confirmar categoria do TikTok

## Resultado esperado
- A confirmação da categoria não exibirá mais o erro genérico “Edge Function returned a non-2xx status code”.
- O produto continuará protegido contra publicação com dados obrigatórios ausentes.
- Nenhuma categoria, atributo ou informação de produto será inventada.

## Implementação
1. Ajustar a consulta de atributos para aceitar como alternativa os atributos reais já retornados junto da categoria pelo Bling.
2. Quando o Bling recusar somente a consulta separada de atributos, tratar isso como indisponibilidade da integração, não como falha interna da função.
3. Validar normalmente todos os atributos obrigatórios que estiverem disponíveis; se a lista real não puder ser confirmada, manter a publicação pendente com uma mensagem clara em português.
4. Preservar o registro técnico da resposta do Bling para acompanhamento, sem expor o erro genérico no cadastro.
5. Validar o fluxo real de abrir o produto, carregar categorias, confirmar a seleção e tentar publicar, além da checagem das funções alteradas.

## Detalhes técnicos
- A falha atual ocorre em `getTikTokCategoryAttributes`: o endpoint do Bling responde 400 com “Não foi possível obter os atributos da categoria”, e essa resposta é transformada em erro 500 pela função de confirmação.
- A correção será concentrada na integração de categorias/atributos e na mensagem do cadastro, sem alterar estoque, preço, imagens ou vínculo do produto.
