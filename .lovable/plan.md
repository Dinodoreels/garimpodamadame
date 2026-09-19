# Plano: corrigir categorias e publicação dos produtos novos

## Diagnóstico confirmado
- O produto novo **Body Splash Espelho, Espelho Meu** está salvo e ativo no catálogo, com 6 imagens e 6 variações.
- Ele já foi criado no Bling com sucesso e recebeu o vínculo `16707910171`.
- Existem várias cópias do mesmo envio aguardando na fila; isso gera atraso e sensação de que o produto não foi enviado.
- A publicação no TikTok ficou pendente somente por **peso e medidas** ausentes. Esses valores não serão inventados.
- No cadastro local existe apenas a categoria **Perfumaria**; por isso as demais categorias não aparecem no campo “Tipo”.
- A lista de categorias reais do TikTok não aparece porque o próprio Bling está recusando essa consulta com “Grpc client not found”. A loja está conectada, mas esse catálogo externo não está sendo liberado pelo Bling.

## Correções
1. Cadastrar as categorias amplas aprovadas no catálogo: Beleza e Cuidados Pessoais, Informática e Componentes, Games e Acessórios, Áudio/Vídeo/Streaming, Câmeras e Fotografia, Casa e Utilidades, Automotivo, Ferramentas e Elétrica, Brinquedos e Hobby e Saúde e Bem-estar; manter Perfumaria.
2. Fazer essas categorias aparecerem imediatamente no cadastro e na edição dos produtos.
3. Evitar envios duplicados na fila do Bling para o mesmo produto e manter apenas um envio pendente por vez.
4. Após salvar um produto, atualizar a lista imediatamente e mostrar separadamente:
   - salvo no catálogo;
   - enviado ao Bling;
   - aguardando dados para TikTok;
   - publicado ou em análise.
5. Exibir em português os dados que impedem a publicação. Para o produto novo, mostrar claramente **Peso** e **Comprimento, largura e altura**.
6. Manter a publicação automática pelo Bling quando todos os dados reais estiverem completos, sem depender da lista externa de categorias do TikTok que hoje está bloqueada.
7. No campo “Categoria real no TikTok”, mostrar o bloqueio do Bling em vez de uma lista vazia e orientar que a categoria ampla do produto será enviada ao Bling automaticamente.

## Segurança dos dados
- Não preencher peso, medidas, atributos ou categoria oficial do TikTok por suposição.
- Não duplicar anúncios nem produtos no Bling.
- Preservar fotos, estoque, preço, SKU e vínculos já existentes.

## Validação
- Confirmar que todas as categorias amplas aparecem no campo “Tipo”.
- Criar/editar um produto e confirmar que aparece imediatamente na lista.
- Confirmar apenas um envio pendente por produto na fila do Bling.
- Verificar o vínculo do produto novo no Bling.
- Confirmar que o painel informa peso e medidas como pendências do TikTok até os valores reais serem preenchidos.
