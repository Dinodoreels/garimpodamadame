# Fase 2 — Garimpo Scan, IA de identificação e acesso do galpão

Continuação do módulo Inbound. Nada do que já existe (loja, pedidos, catálogo, Bling, TikTok, financeiro) é alterado ou removido.

## 1. Garimpo Scan — tela rápida de tablet

Nova tela em Inbound → Garimpo Scan, desenhada para uso em pé, com o dedo:

- Passo 1: escolher o lote aberto (lista grande, um toque).
- Passo 2: bipar o código de barras pela câmera do tablet, ou digitar, ou tirar foto do produto quando não houver código.
- Passo 3: a IA devolve o que identificou (nome, marca, categoria sugerida, características) e a foto fica salva junto.
- Passo 4: o operador confirma condição (novo lacrado, caixa aberta, usado, defeito…), quantidade, e grava.
- Cada peça gravada recebe o SKU já existente no sistema quando o código de barras casar com um produto do catálogo; quando não casar, entra como pendência com o resultado da IA anexado.
- Contador do lote na tela: quanto já foi bipado, quanto falta, tempo médio por peça.
- Botão grande "Próxima peça" — o operador nunca precisa voltar ao menu.

Se a IA não tiver certeza, a peça vai para **Pendências** (nunca é aceita no chute), conforme você escolheu.

## 2. Identificação automática por IA

- Uma função no servidor recebe o código de barras e/ou a foto e devolve identificação estruturada, com um grau de confiança.
- Alta confiança → preenche a tela e o operador só confirma.
- Baixa confiança ou produto desconhecido → vai para Pendências com as sugestões, para decisão humana.
- Cada chamada fica registrada no histórico do item (o que a IA respondeu e quem confirmou), sem sobrescrever a decisão da pessoa.
- Se a IA falhar ou os créditos acabarem, a tela avisa em português e o operador segue no modo manual — o galpão nunca trava.

## 3. Perfis e permissões (modo teste com uma pessoa)

Como combinado, por enquanto só a sua conta de administrador existe. Então:

- Sua conta recebe todos os perfis do CD, para você abrir e testar cada tela.
- Uma nova tela **Inbound → Equipe** lista as pessoas e seus perfis, com botão para conceder/remover perfil quando você for cadastrar a equipe de verdade.
- Um seletor "ver como" no topo do Inbound permite que você, administrador, veja a tela exatamente como um operador, qualidade, estoque ou comercial veria — sem sair da sua conta.

Quem pode o quê:

| Ação | Admin | Gestor CD | Entrada (Inbound) | Qualidade (QC) | Estoque | Comercial |
| --- | --- | --- | --- | --- | --- | --- |
| Cadastrar recebimento e lote | sim | sim | sim | não | não | não |
| Bipar / identificar peça no Scan | sim | sim | sim | não | não | não |
| Aprovar condição e qualidade | sim | sim | não | sim | não | não |
| Endereçar e movimentar estoque | sim | sim | não | não | sim | não |
| Liberar para venda / canais | sim | sim | não | não | não | sim |
| Só visualizar | sim | sim | sim | sim | sim | sim |

Essas regras valem tanto na tela quanto no banco (não adianta burlar pelo navegador).

## 4. Recebimento real com fotos e documentos

Não vou inventar nada. Vou deixar o caminho pronto e testado:

- Anexo de fotos pela câmera do tablet/celular e de documentos (nota fiscal, romaneio) já funciona na tela do recebimento.
- Ao final, te mando o passo a passo curto para você registrar a carreta real.
- Assim que você gravar, o recebimento aparece automaticamente no Dashboard do Inbound (carretas do dia, unidades previstas, valor) e no Histórico, com quem fez e quando.
- Nenhum registro de exemplo será criado no seu banco.

## 5. Login rápido para operadores do galpão

- Nova página de acesso do galpão: **código do operador + PIN** de 4 a 6 dígitos, teclado grande na tela, sem digitar email.
- Você cria os operadores na tela Equipe (nome, código, PIN inicial) e pode desativar ou trocar o PIN a qualquer momento.
- Quem entra por lá só enxerga Inbound e Garimpo Scan — nada de pedidos, financeiro, clientes ou configurações.
- Sessão do galpão expira sozinha depois de um período de inatividade, para o tablet não ficar aberto.

## Detalhes técnicos

- Novas tabelas: `inbound_items` (peça/unidade com estado, condição, lote, SKU vinculado, dados da IA e confiança), `inbound_pendings` (fila de decisão humana), `operators` (código, PIN em hash, perfil, ativo) e `operator_sessions`. Todas com RLS por perfil e GRANTs explícitos, mais registro imutável em `inbound_events`.
- Estados seguem a máquina de estados já definida em `src/services/inbound/types.ts` (RECEIVED → TRIAGE → SCAN_PENDING → IDENTIFIED → …), com transição validada no banco.
- Identificação por IA em nova edge function via Lovable AI Gateway, modelo `openai/gpt-6-astra` com saída estruturada; foto enviada por URL assinada do bucket privado `inbound-docs`. Erros 402/403/429 tratados e exibidos, sem retry infinito.
- Login de operador por edge function: valida código + PIN (hash com salt), cria sessão de curta duração e devolve um token restrito ao módulo Inbound; PIN nunca trafega nem é guardado em texto.
- Reuso total do design system, sidebar, React Query, hooks e services já criados na Fase 1; leitura de código de barras pela câmera com biblioteca web leve, com digitação manual como alternativa.
- Nova rota pública `/galpao` (login do operador) e `/galpao/scan`, além das telas dentro de `/admin/inbound/*`.
