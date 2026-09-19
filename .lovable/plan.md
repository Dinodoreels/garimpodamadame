# Corrigir estoque no Bling e publicação no TikTok Shop

## Diagnóstico confirmado
- O produto **Body Splash Sociedade das Vilas Elixir Noturno DKA 200 ml** está com **1.000 unidades** no nosso painel.
- O cadastro do produto foi criado com sucesso no Bling, mas o vínculo retornado pelo Bling ainda não foi salvo em `bling_product_links`.
- A configuração atual define o **Bling como responsável pelo estoque** (`stock_authority = bling`). Nessa configuração, alterações feitas no nosso painel não geram envio de estoque.
- As filas recentes enviaram apenas o cadastro do produto; nenhuma fila de estoque foi criada para essa variante.
- O TikTok Shop não possui configuração ativa no banco atual; também não existe vínculo, fila ou histórico de publicação desse produto no TikTok.

## Correção
1. Alterar a responsabilidade do estoque para **Nosso sistema**, conforme escolhido.
2. Garantir que, após criar ou localizar um produto no Bling, o vínculo entre variante, SKU e produto do Bling seja salvo antes de sincronizar o estoque.
3. Enviar imediatamente o saldo atual da variante ao depósito **Geral** assim que o vínculo for confirmado, inclusive quando a alteração de estoque aconteceu antes da criação do vínculo.
4. Impedir que a busca automática do catálogo sobrescreva o estoque do painel quando o nosso sistema for o responsável.
5. Evitar duplicidade: consolidar filas repetidas do mesmo produto/variante e manter proteção contra ciclos entre painel e Bling.
6. Registrar no histórico o valor enviado, o depósito, a resposta do Bling e erros de tentativa.

## TikTok Shop
1. Conectar e validar a conta real do TikTok Shop antes de tentar publicar.
2. Confirmar a categoria e os atributos obrigatórios reais do produto, sem inventar informações.
3. Criar a publicação do mesmo SKU somente depois da confirmação administrativa exigida pelo fluxo atual.
4. Salvar o vínculo entre produto, variante e anúncio do TikTok para permitir futuras atualizações de estoque.
5. Enviar o saldo de 1.000 unidades após a publicação e manter as próximas alterações sincronizadas pelo nosso sistema.
6. Exibir no painel se o produto está pendente, publicado, sincronizado ou com erro no TikTok.

## Validação real
- Reprocessar o produto da imagem e confirmar o vínculo pelo SKU `BODYSPLA-K871-200ml`.
- Enviar as **1.000 unidades** para o depósito Geral do Bling.
- Consultar novamente o saldo no Bling e confirmar que painel e Bling mostram o mesmo valor.
- Alterar o estoque uma segunda vez no painel e confirmar a atualização automática, sem criar outro produto ou SKU.
- Confirmar que falhas ficam visíveis e entram em nova tentativa, sem apagar o saldo do painel.
- Confirmar que o TikTok recebe o produto e o estoque apenas depois da conexão, categoria e atributos reais estarem válidos.

## Resultado esperado
O nosso sistema passa a ser a fonte principal do estoque. Toda alteração feita no painel atualiza o mesmo SKU no Bling e, após a conexão e publicação válidas, também no TikTok Shop, sem duplicações nem retorno indevido para zero.
