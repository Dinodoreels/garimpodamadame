# Exclusão de recebimentos somente por administrador

## O que será feito
- Remover o recebimento `REC-2026-00001` mostrado na tela, incluindo o lote vinculado, após conferir todos os vínculos para não deixar dados órfãos.
- Adicionar uma ação de exclusão na lista de Recebimentos e manter a ação na página de detalhes.
- Mostrar essas ações apenas para administradores, sempre com confirmação clara antes de excluir.
- Reforçar a proteção no banco de dados para que funções de Inbound, QC, Estoque, Comercial e Gestor do CD não consigam excluir recebimentos mesmo tentando fora da tela.
- Atualizar automaticamente a lista e o painel após a exclusão.

## Segurança e validação
- Separar as permissões atuais: equipe autorizada continua podendo consultar/cadastrar/editar conforme suas funções, mas `DELETE` será exclusivo do papel `admin`.
- Testar como administrador que a exclusão funciona e como perfil não administrador que ela é bloqueada.
- Confirmar que `REC-2026-00001` e seu lote vinculado foram removidos e que a tela não apresenta erro.

## Detalhes técnicos
- Reutilizar o reconhecimento de administrador e a janela de confirmação já existentes no painel.
- Ajustar as políticas de acesso de `truck_receipts` no banco, não apenas esconder o botão.
- Tratar o clique da lixeira sem abrir acidentalmente os detalhes do recebimento.
