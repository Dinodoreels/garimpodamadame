# Trocar as credenciais e a conta do Bling

## Objetivo
Permitir que o administrador substitua o Client ID e o Client Secret atuais e autorize uma nova conta do Bling, sem apagar produtos, pedidos, estoque, vínculos ou histórico da loja.

## Mudanças
1. Transformar **Trocar conta do Bling** em um fluxo explícito de troca de credenciais, separado do teste da conexão atual.
2. Ao iniciar a troca, mostrar campos limpos para o novo Client ID e Client Secret, a URL de retorno que deve estar cadastrada no novo aplicativo e as opções **Cancelar** e **Continuar**.
3. Antes de continuar, pedir uma confirmação clara de que a conta atual será desconectada após salvar as novas credenciais.
4. Salvar as novas credenciais, invalidar somente a autorização da conta Bling anterior e abrir a autorização do novo aplicativo.
5. Se a janela for fechada, bloqueada ou a autorização falhar, mostrar o motivo e manter a tela em estado **Não conectado**, pronta para tentar novamente com as novas credenciais.
6. Mostrar **Conectado — nome da empresa** somente após o retorno do Bling e um teste real bem-sucedido.
7. Registrar no histórico o início, sucesso ou falha da troca, sem registrar Client Secret ou tokens.

## O que será preservado
- Produtos, SKUs, preços e estoque da Vanguard Store.
- Pedidos e histórico de sincronizações.
- Vínculos existentes com o Bling; eles poderão ser revisados ou refeitos depois da nova conexão, se a nova conta usar outros IDs.
- Configurações de quais informações sincronizar.

## Validação
- Trocar para credenciais válidas e concluir a autorização da nova empresa.
- Confirmar que a empresa exibida mudou e que **Testar conexão** funciona.
- Testar cancelamento, janela bloqueada, Client ID inválido e credenciais incorretas.
- Confirmar que nenhum dado operacional da loja foi excluído durante a troca.
