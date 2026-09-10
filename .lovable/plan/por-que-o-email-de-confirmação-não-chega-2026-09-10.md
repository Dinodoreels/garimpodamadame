# Por que o email de confirmação não chega

## O que está acontecendo

A confirmação por email foi desligada nesta loja (decisão anterior, já que não há domínio de envio próprio). Quando alguém cria a conta, ela já nasce **ativa e logada** — nenhum email de confirmação é gerado, então não há nada para chegar na caixa de entrada.

O problema é só a tela: depois do cadastro, a loja ainda mostra "Confirme seu email" e o botão "Reenviar email", como se o cliente precisasse esperar um link. O botão diz "Email reenviado!" mas nada é enviado.

Foi exatamente isso que aconteceu com a conta madamedoluar4@gmail.com: o cadastro funcionou e a sessão foi criada; só a mensagem na tela está errada.

## O que vou mudar

- Ao criar a conta, o cliente entra direto na loja, com uma mensagem de boas-vindas — sem a tela de "Confirme seu email".
- Remover o botão "Reenviar email" e o aviso de verificar a caixa de entrada/spam do fluxo de cadastro.
- Manter tudo o resto igual: login, recuperação de senha e a tela de conta continuam como estão.

## Sobre email no futuro

Para voltar a ter emails com a sua marca (confirmação de cadastro, redefinição de senha, avisos de pedido), é preciso um domínio próprio configurado para envio. Quando você tiver um, dá para ligar tudo e reativar a confirmação.

## Detalhes técnicos

- `src/pages/Auth.tsx`: em `handleSignup`, se a resposta trouxer sessão ativa, navegar para `/` com toast de sucesso em vez de `setShowEmailConfirmation(true)`; remover o bloco de UI de confirmação e `handleResendConfirmation`/`resendLoading`.
- Nenhuma mudança de banco, função de borda ou configuração de auth (`auto_confirm_email` permanece ativo).
