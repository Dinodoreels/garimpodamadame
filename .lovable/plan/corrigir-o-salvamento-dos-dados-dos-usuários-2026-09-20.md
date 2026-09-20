# Corrigir o salvamento dos dados dos usuários

## Situação confirmada
- A conta mostrada existe, mas não possui um cadastro correspondente; por isso nome, telefone, CPF e nascimento aparecem vazios.
- Os quatro usuários atuais estão sem cadastro na tabela de perfis.
- A rotina que deveria criar o cadastro existe, porém não está ligada à criação de novas contas.
- A tela apenas atualiza cadastros existentes; quando a linha não existe, a operação termina sem erro, mas não salva nada.
- As permissões explícitas necessárias para leitura e gravação dos próprios dados também não estão registradas.

## Alterações
1. Restaurar a criação automática do cadastro para toda nova conta, preenchendo somente dados reais recebidos no cadastro.
2. Criar os cadastros ausentes dos quatro usuários atuais, aproveitando apenas nome e telefone já presentes na conta e mantendo CPF/nascimento vazios quando não existirem.
3. Garantir permissão para cada usuário ler, criar e atualizar somente o próprio cadastro, preservando as regras de privacidade atuais.
4. Alterar o salvamento da página da conta para criar o cadastro quando ele estiver ausente e atualizar quando já existir.
5. Tratar atualização sem linha afetada como falha, para nunca mais mostrar “Perfil atualizado” quando nada foi gravado.
6. Após salvar, buscar novamente os dados gravados e atualizar imediatamente a página e a validação do carrinho.

## Validação
- Entrar com a conta afetada e confirmar que o cadastro ausente foi criado.
- Preencher nome, telefone, CPF e nascimento, salvar, recarregar a página e confirmar que continuam visíveis.
- Confirmar diretamente no banco que os quatro campos foram persistidos para o usuário correto.
- Abrir o carrinho e confirmar que a compra reconhece o cadastro completo.
- Confirmar que um usuário não consegue ler nem alterar o cadastro de outro.
- Criar uma nova conta de teste real e confirmar que o perfil passa a nascer automaticamente.

## Detalhes técnicos
- Aplicar uma migração segura para restaurar o gatilho de criação de perfil, os `GRANTs` e o preenchimento dos perfis ausentes.
- Manter as políticas por `auth.uid()` e não tornar os dados pessoais públicos.
- Usar salvamento idempotente vinculado exclusivamente ao usuário autenticado.
