# Validação completa da Fase 2 — Inbound e Garimpo Scan

## Situação confirmada

- As telas de Recebimentos, Lotes, Garimpo Scan, Pendências, Equipe e acesso do galpão estão conectadas às rotas atuais.
- A base operacional está limpa: não há recebimentos, lotes, peças, pendências, operadores ou sessões ativos.
- Existe somente um evento de auditoria de um teste anterior; o histórico é intencionalmente imutável.
- Há uma conta real com perfil Administrador, que pode executar e conferir todo o fluxo.
- O catálogo ainda não possui produtos ou variações. Portanto, o reaproveitamento de SKU não pode ser comprovado com um SKU real neste momento sem criar um produto temporário.
- A IA já respondeu com sucesso em uma chamada real usando `openai/gpt-6-astra`.

## Plano de testes

### 1. Verificar acesso e telas vazias

- Conferir Dashboard, Recebimentos, Lotes, Scan, Pendências e Equipe como administrador.
- Confirmar mensagens vazias, navegação, carregamento e ausência de erros visuais.
- Verificar o acesso público `/galpao`: sem sessão, o operador não entra no Scan.
- Validar as telas em desktop, tablet e celular.

### 2. Criar uma operação temporária controlada

- Criar um recebimento marcado claramente como teste, com lote automático e pequena quantidade.
- Confirmar a numeração automática, exibição no Dashboard, lista de recebimentos, detalhe e lista de lotes.
- Anexar uma imagem e um documento temporários, abrir ambos pela URL protegida e removê-los depois.
- Confirmar que criação, anexos e alterações aparecem no histórico correto.

### 3. Testar Equipe e login do galpão

- Criar um operador temporário de Entrada com código e PIN de teste.
- Validar PIN incorreto, PIN correto, sessão ativa, saída e bloqueio após desativação.
- Confirmar que o operador vê somente a tela do galpão e não recebe acesso ao painel administrativo.
- Verificar criação, troca de PIN, ativação, desativação e remoção do operador.

### 4. Testar Garimpo Scan

- Selecionar o lote temporário e conferir os contadores iniciais.
- Validar código digitado, tentativa sem código/foto e alternativa manual quando a câmera não está disponível.
- Fazer uma identificação real pela IA, conferir nome, marca, categoria, condição, preço sugerido e confiança.
- Gravar uma peça e confirmar atualização do lote, contador, estado da peça e evento de auditoria.
- Forçar um resultado de baixa confiança para confirmar entrada em Pendências; resolver manualmente e validar a mudança para Identificado.
- Confirmar que uma falha da IA não bloqueia o preenchimento manual.

### 5. Validar permissões e segurança

- Conferir no servidor a matriz efetiva: Administrador/Gestor gerenciam tudo; Entrada cadastra e escaneia; Qualidade resolve pendências; Estoque e Comercial apenas atuam nas etapas previstas para seus perfis.
- Testar chamadas sem autenticação, com sessão inválida e com operador desativado.
- Confirmar que PINs e tokens ficam somente em formato protegido e que sessões expiradas ou revogadas são recusadas.
- Verificar que fotos e documentos continuam privados.

### 6. Corrigir falhas encontradas e repetir os testes

- Corrigir somente problemas reproduzidos na Fase 2, sem alterar loja, pedidos, catálogo ou integrações existentes.
- Incluir os avisos de referência já observados na tela administrativa na revisão, caso afetem a experiência.
- Reexecutar os testes afetados após cada correção e verificar a integridade dos registros.

### 7. Limpeza e relatório final

- Remover operador, sessão, anexos, peça, pendência, lote e recebimento temporários.
- Confirmar que nenhuma fila de integração externa recebeu dados de teste.
- Manter apenas os eventos de auditoria que o sistema não permite apagar, identificados como teste.
- Entregar um resumo com: aprovado, corrigido, bloqueado e o passo necessário para comprovar o reaproveitamento de SKU quando existir o primeiro produto real.

## Limite do teste de SKU

Como o catálogo está vazio, não será criado um produto fictício automaticamente: isso poderia acionar Bling, Shopify ou TikTok. O caminho “código encontrado → mesmo SKU reaproveitado” será validado por inspeção e ficará para confirmação prática assim que houver um produto real cadastrado, salvo se você autorizar depois um produto temporário isolado.

## Detalhes técnicos

- Testes de interface serão feitos no navegador com sessão administrativa e nos tamanhos desktop, tablet e celular.
- Funções `operator-auth`, `inbound-identify` e `inbound-scan` serão chamadas diretamente para conferir respostas e bloqueios.
- Os registros serão comparados antes e depois nos dados de recebimentos, lotes, itens, pendências, operadores, sessões e eventos.
- A chamada de IA será conferida também no histórico da AI Gateway, incluindo status e modelo usado.
