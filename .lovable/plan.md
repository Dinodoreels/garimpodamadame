# Botão para confirmar e fechar o aviso legal

## Objetivo
Adicionar ao final do aviso um botão visível **“Confirmar e continuar”**.

## Comportamento
- O botão ficará desativado até a pessoa marcar a caixa de aceite.
- Ao clicar, o aceite será registrado com a versão atual dos Termos e da Política de Privacidade.
- Após o registro ser concluído, o aviso será fechado automaticamente e a pessoa continuará na página onde estava.
- Se o registro falhar, o aviso permanecerá aberto e mostrará uma mensagem para tentar novamente.
- Durante o registro, o botão mostrará o carregamento e impedirá cliques repetidos.

## Ajuste visual
- Manter o botão sempre visível na parte inferior do aviso, inclusive em telas menores.
- Permitir rolagem apenas no conteúdo quando o espaço vertical for reduzido, sem esconder a ação de confirmação.

## Validação
- Confirmar que o botão começa desativado, é liberado ao marcar a caixa e fecha o aviso somente após salvar o aceite.
- Conferir o resultado em computador e celular.
