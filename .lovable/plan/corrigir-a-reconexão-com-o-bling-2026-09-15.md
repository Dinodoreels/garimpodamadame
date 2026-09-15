# Corrigir a reconexão com o Bling

## Diagnóstico confirmado
- O login da loja funcionou; a falha ocorre na autorização externa do Bling.
- O Bling recusou o **Client ID atual como inválido**.
- A conexão antiga ainda aparece como ativa porque existe um token salvo, porém o Bling também recusiu esse token como **inválido/expirado**.
- Portanto, o painel está misturando uma credencial nova ou incorreta com os dados da autorização anterior.

## Alterações
1. Ao alterar o Client ID ou Client Secret, invalidar localmente a autorização antiga para não mostrar “Conectado” com um token incompatível.
2. Considerar conectado somente após uma autorização concluída e um teste real bem-sucedido com o Bling.
3. Traduzir os retornos `client_id inválido` e `invalid_grant` em mensagens claras, indicando exatamente se é necessário corrigir as credenciais ou autorizar novamente.
4. Manter produtos, estoque, preços, pedidos e histórico existentes sem alterações.
5. Preservar a URL de retorno atual; o administrador deverá confirmar que essa mesma URL está cadastrada no aplicativo correto dentro do Bling.

## Validação
- Inserir o Client ID e o Client Secret do mesmo aplicativo cadastrado no Bling.
- Conferir no Bling a URL de retorno exibida no painel.
- Fazer uma nova autorização completa.
- Executar “Testar conexão” e somente então mostrar a empresa como conectada.
- Confirmar que fechar ou cancelar a janela não deixa um estado falso de conexão.

## Dependência externa
A correção da tela evita o estado enganoso, mas o Bling só permitirá a conexão quando o **Client ID e o Client Secret válidos do aplicativo** forem informados. O sistema não consegue gerar ou recuperar essas credenciais pelo Bling.
