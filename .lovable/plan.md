# Corrigir a experiência de conexão com o Bling

## Situação confirmada
- O Bling está conectado e o teste retornou sucesso.
- A empresa autorizada aparece como **eduardo simoes de lima**.
- As tentativas recentes de reconexão também foram concluídas com sucesso, mas a janela fecha ao terminar e o painel continua exibindo o mesmo botão, dando a impressão de que nada aconteceu.

## Alterações
1. Quando a conexão estiver ativa, substituir o destaque de “Reconectar com o Bling” por uma confirmação clara: **Bling conectado**, com o nome da empresa e a última verificação.
2. Manter **Testar conexão** como ação principal para confirmar que produtos, estoque e pedidos continuam acessíveis.
3. Mover a reconexão para uma ação secundária chamada **Trocar ou autorizar novamente a conta**, com confirmação antes de abrir o Bling.
4. Durante a autorização, mostrar o estado **Aguardando autorização no Bling** e atualizar automaticamente o painel quando a janela fechar ou retornar.
5. Exibir uma mensagem final clara informando qual empresa ficou conectada, evitando cliques repetidos.
6. Preservar as configurações atuais de produtos, estoque, preços, pedidos e histórico.

## Validação
- Confirmar no computador e no celular que o estado conectado aparece corretamente.
- Testar a verificação da conexão atual.
- Testar uma reautorização completa e confirmar que o painel retorna com o nome da empresa conectada.
