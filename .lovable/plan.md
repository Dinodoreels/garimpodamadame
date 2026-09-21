# Restaurar produtos e pedidos no painel

## Objetivo
Fazer os dados existentes voltarem a aparecer no painel administrativo e manter a loja mostrando somente produtos ativos.

## Situação confirmada
- Nenhum produto ou pedido foi apagado.
- Existem **55 produtos**: 5 ativos e 50 inativos.
- Existem **35 pedidos** com seus estados atuais preservados.
- As consultas de produtos e pedidos estão falhando com resposta 403 porque regras de acesso chamam funções auxiliares sem permissão de execução.
- A lista administrativa já busca produtos ativos e inativos; portanto, ela deve voltar a mostrar os 55 após a correção das permissões.

## Implementação
1. Restaurar o funcionamento das funções auxiliares usadas pelas regras de acesso de produtos, pedidos, itens, lojas, consignação e operação Inbound.
2. Preservar a proteção implantada anteriormente:
   - lógica privilegiada permanece isolada na área privada do banco;
   - funções públicas serão apenas pontos de entrada restritos para as regras de acesso;
   - nenhuma função administrativa geral será reaberta para clientes ou visitantes.
3. Conceder somente as permissões mínimas exigidas para cada tipo de usuário:
   - usuário autenticado para funções usadas por regras autenticadas;
   - visitante apenas quando uma regra pública realmente precisar avaliar o acesso;
   - operações administrativas continuam exigindo perfil autorizado.
4. Manter os 50 produtos inativos como inativos:
   - visíveis no painel administrativo;
   - ocultos da loja pública;
   - sem publicação automática ou alteração de estoque.
5. Melhorar a tela administrativa para exibir uma mensagem clara se uma consulta for recusada, evitando que uma falha pareça que os registros foram apagados.

## Validação
- Confirmar que o painel mostra 55 produtos e diferencia 5 ativos de 50 inativos.
- Confirmar que a loja pública mostra somente os 5 ativos.
- Confirmar que o painel de pedidos carrega os 35 pedidos e seus itens.
- Verificar produtos, pedidos, imagens, variantes e opções sem respostas 403.
- Testar como administrador, cliente autenticado e visitante para garantir que cada perfil veja somente o permitido.
- Executar a verificação de segurança após a correção e confirmar que as proteções anteriores não foram reabertas.

## Não será alterado
- Nenhum pedido, produto, preço, estoque ou estado será recriado ou modificado.
- Os 50 produtos inativos não serão reativados.
- Não haverá publicação no Bling ou em canais de venda durante esta correção.
