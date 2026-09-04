# Por que os emails de verificação não chegam

## O que foi verificado agora

1. **Este projeto não tem nenhum domínio de email configurado.** A estrutura de envio de emails ficou com o projeto de origem; aqui ela não existe ainda.
2. **O envio de emails de autenticação está quebrado no código.** O arquivo do email de confirmação de cadastro tem um erro de escrita (uma linha duplicada logo no começo do modelo) que impede o email de ser montado.
3. **O envio ainda usa a fila de emails antiga**, que foi removida junto com a infraestrutura do projeto de origem. Mesmo sem o erro acima, o email seria colocado numa fila que ninguém processa — ou seja, nunca sai.

Resultado: nenhum email de verificação é enviado.

## Como resolver

### Passo 1 — Configurar o domínio de envio
Você precisa de um domínio próprio (ex.: `seudominio.com.br`). Vou abrir a tela de configuração de email para você concluir esse passo. Sem isso, nenhum email sai do seu nome.

### Passo 2 — Recriar os emails de autenticação
Recriar os seis modelos de email (confirmação de cadastro, link mágico, redefinir senha, convite, troca de email, código de verificação) já ligados ao novo sistema de envio, corrigindo o erro do modelo de cadastro.

### Passo 3 — Aplicar a identidade da loja
Reaplicar cores, logo, textos em português e o bloco de cupom que os modelos atuais já tinham, para os emails continuarem com a cara da loja.

### Passo 4 — Publicar e testar
Publicar a função de email e enviar um teste de confirmação de cadastro. Os emails passam a chegar assim que o domínio for verificado (o DNS pode levar algumas horas).

## Detalhes técnicos

- `supabase/functions/auth-email-hook/index.ts` será substituído pelo scaffold gerenciado (`createAuthEmailHandler` de `@lovable.dev/email-js`), removendo a dependência de `enqueue_email` e da tabela `email_send_log`.
- `supabase/functions/_shared/email-templates/signup.tsx`: corrigir a assinatura duplicada do componente (`=> (` seguido de `=> {`).
- Manter `_shared/email-branding.ts` e `_components.tsx` (logo, cores, cupom) integrados aos novos modelos.
- Deploy de `auth-email-hook` após as alterações.
- Outras funções que ainda referenciam a fila antiga (`send-notification`, `notify-accounting-events`, `admin-store-report`, `test-message`) serão migradas em uma etapa seguinte, se você quiser — elas afetam emails do app, não o de verificação.

## Enquanto isso

Se você precisa liberar cadastros hoje, dá para desativar a confirmação por email (o usuário entra direto após se cadastrar). É menos seguro, mas destrava o acesso. Me diga se quer isso também.
