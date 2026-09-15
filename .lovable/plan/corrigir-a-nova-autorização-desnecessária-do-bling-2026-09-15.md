# Corrigir a nova autorização desnecessária do Bling

## Estado confirmado

- O login da loja está funcionando normalmente.
- A conexão atual com o Bling está válida para **eduardo simoes de lima**: há autorização ativa, o teste de conexão terminou com sucesso e a busca de pedidos também terminou sem erro.
- A tela da imagem é uma nova tentativa de autorização rejeitada pelo Bling; ela não representa perda da conexão que já está ativa.
- Essa tentativa deixou uma autorização pendente registrada, embora a conexão existente continue saudável.

## Alterações

1. **Não abrir o Bling quando a conexão já estiver saudável**
   - O botão principal continuará sendo **Testar conexão**.
   - Uma tentativa de reconectar com as mesmas credenciais primeiro testará a conexão atual; se estiver válida, manterá a conta conectada e não abrirá outra janela do Bling.

2. **Separar troca de credenciais de nova autorização**
   - A troca de conta exigirá uma ação explícita e confirmação clara.
   - Somente credenciais realmente alteradas ou uma conexão comprovadamente expirada iniciarão uma nova autorização.
   - Cancelar ou fechar a janela não apagará uma conexão válida.

3. **Limpar tentativas pendentes sem afetar a conexão ativa**
   - Remover o estado pendente deixado pela janela rejeitada.
   - Se o painel detectar uma conexão válida enquanto mostra **Aguardando autorização**, encerrar automaticamente a espera e reativar os botões.
   - Não depender apenas do fechamento da janela externa para atualizar a tela.
   - Preservar produtos, estoque, preços, pedidos, histórico e os tokens atuais que já passaram no teste.

4. **Exibir o resultado correto no painel**
   - Mostrar **Bling conectado — eduardo simoes de lima** após um teste real bem-sucedido.
   - Mostrar erro de Client ID apenas quando a autorização realmente for necessária e tiver falhado, sem trocar o painel saudável por um falso estado de desconexão.

## Validação

- Testar a conexão atual e confirmar sucesso.
- Clicar na ação de reconexão com as mesmas credenciais e confirmar que nenhuma janela desnecessária é aberta.
- Confirmar que o aviso **Aguardando autorização** desaparece e o botão deixa de ficar bloqueado quando a conexão já estiver válida.
- Confirmar que fechar/cancelar uma nova autorização não derruba a conexão válida.
- Confirmar no histórico um único teste bem-sucedido, sem callbacks duplicados.
- Conferir o painel em computador e celular.

## Observação técnica

A correção será limitada ao fluxo de conexão OAuth e à apresentação do estado do Bling; nenhuma informação comercial ou operacional será alterada.
