# Liberar o cadastro sem email de verificação

Você não tem um domínio próprio para esta loja, e sem domínio não é possível enviar emails com sua marca. A solução escolhida: desligar a exigência de confirmação por email, para que os clientes consigam criar conta e entrar na hora.

## O que vai mudar

- Ao criar conta, o cliente entra direto na loja — sem esperar link de verificação.
- Nenhum email de confirmação é mais necessário para o cadastro funcionar.
- Login, pedidos e checkout seguem funcionando normalmente.

## O que fica de fora (por enquanto)

- Recuperação de senha por email continua indisponível enquanto não houver um domínio de envio. Se um cliente esquecer a senha, será preciso ajudar manualmente pelo painel.
- Quando você tiver um domínio (comprado em Configurações do Projeto → Domínios, ou em qualquer registrador), dá para ligar os emails com sua marca e reativar a confirmação.

## Limpeza necessária

O sistema de envio de emails do projeto original foi removido no remix, e restou um pedaço que tenta enfileirar emails num processador que não existe mais. Ele será removido para não gerar erros silenciosos no cadastro.

## Detalhes técnicos

1. `supabase--configure_auth` com `auto_confirm_email: true` (mantendo signup habilitado, sem usuários anônimos).
2. Remover a função `auth-email-hook`, que depende do RPC `enqueue_email` e do processador de fila ausente — enquanto ela estiver registrada e falhando, emails de auth ficam quebrados.
3. Verificar que o cadastro pela tela de criação de conta conclui e já autentica o usuário.
4. Não criar nenhuma tabela ou fila de email; as tabelas de log existentes ficam intactas.
