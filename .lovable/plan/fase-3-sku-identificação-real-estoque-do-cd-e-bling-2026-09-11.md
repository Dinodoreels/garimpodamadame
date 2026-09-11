# Fase 3 — SKU, identificação real, estoque do CD e Bling

## Resultado esperado

Transformar cada peça recebida em um SKU rastreável até a venda: fotos reais, evidências, identificação por fontes externas, conferência de QC, preço Vanguard, endereço físico, entrada no estoque disponível e sincronização com o Bling. Todas as ações terão histórico de autor, data, origem, alteração e resultado.

## 1. Identificação real por código e foto

- Substituir a identificação generativa da Fase 2 por uma esteira de fontes reais:
  1. catálogo Vanguard por SKU/EAN;
  2. base brasileira de GTIN/EAN para ficha do produto;
  3. busca visual na web para candidatos, referências e preços;
  4. revisão humana obrigatória quando não houver correspondência segura.
- Usar cache por código e imagem para evitar consultas repetidas e controlar custos.
- Salvar fonte, consulta, candidatos, confiança, resposta resumida e decisão humana.
- Mostrar ao operador “identificado”, “candidato para confirmar” ou “não encontrado”; nunca apresentar uma sugestão visual como certeza.
- Remover a dependência do Lovable AI Gateway deste fluxo de identificação.
- Tratar falhas e limites das APIs sem perder o scan: a peça segue para Pendências.

**Dependências externas:** a implementação usará uma base brasileira de código de barras e uma busca visual real. Após aprovação, verificarei conexões existentes e abrirei o cadastro seguro das credenciais necessárias. Nenhuma chave ficará no navegador ou no código.

## 2. Fotos reais da carreta e evidências

- Manter o cadastro pelo sistema e permitir que você também envie fotos e documentos reais.
- Criar galeria privada por recebimento e por peça, com categorias: carreta, documento, produto, avaria, etiqueta e QC.
- Permitir câmera e upload no tablet/celular, pré-visualização, legenda e exclusão autorizada.
- Não criar fotos, documentos ou recebimentos fictícios.

## 3. Tela completa de SKU

Criar uma página de detalhe para cada peça/SKU com:

- dados do recebimento, lote, EAN, SKU, condição e quantidade;
- fotos principais e fotos de evidência;
- candidatos encontrados e fonte de cada identificação;
- referências reais de mercado com título, loja, preço, link e data da consulta;
- custo, preço sugerido, preço Vanguard aprovado e margem estimada;
- checklist e decisão do QC, incluindo reprovação e motivo;
- endereço físico no CD;
- vínculo com produto e variação do catálogo;
- situação de publicação e sincronização com Bling/canais;
- linha do tempo completa de movimentações e alterações.

## 4. Fluxo por responsabilidade

- **Inbound:** cadastra recebimento/lote, fotografa, escaneia e confirma quantidade e condição inicial.
- **QC:** confere identidade, evidências e estado; aprova ou devolve com motivo.
- **Estoque:** atribui endereço, confirma armazenagem e movimentações físicas.
- **Comercial:** revisa referências, define o preço Vanguard e libera para venda.
- **Gestor/Admin:** acompanha e pode atuar em todas as etapas.

As transições seguirão a máquina de estados já existente e serão executadas no backend, impedindo atalhos por gravações diretas.

## 5. Usuários reais e acesso

- Consultar os usuários reais cadastrados e atribuir um perfil operacional por pessoa.
- Exibir no painel uma matriz simples mostrando quem pode cadastrar, aprovar QC, endereçar e liberar.
- Manter o acesso do operador por código/PIN limitado ao galpão.
- Não criar contas ou nomes fictícios.

**Informação ainda necessária:** nome e email de cada pessoa para Inbound, QC, Estoque e Comercial. O “sim” informado não identifica os quatro usuários; as atribuições ficam pendentes até esses dados serem fornecidos.

## 6. Estoque do CD e Bling

- Separar quantidade em triagem da quantidade vendável; scan não aumenta estoque disponível.
- Somente a liberação final cria ou vincula o produto/variação, registra a entrada de estoque uma única vez e atualiza o catálogo central.
- Reaproveitar a fila Bling existente: a atualização da variação gera sincronização de produto, preço e estoque para o depósito configurado.
- Registrar pedidos importados e enviados com vínculo idempotente.
- Corrigir riscos atuais de duplicidade: normalização de SKU, trava única por pedido e cobertura de novas variações.
- Evitar ciclos Bling ↔ loja respeitando a autoridade configurada para estoque e preço.
- Mostrar falhas, tentativas, itens parados e opção de reprocessar no painel.

## 7. Auditoria e logs

- Reaproveitar `inbound_events` para registrar antes/depois, ator, perfil, origem e horário de cada ação.
- Registrar identificação, upload/exclusão de evidência, QC, preço, endereçamento, movimentação, liberação e reversão.
- Relacionar os eventos do SKU aos logs e à fila do Bling para rastreamento ponta a ponta.
- Criar telas filtráveis de histórico do SKU e log operacional geral, com detalhes de erro sem expor credenciais.
- Manter eventos de auditoria imutáveis e aplicar retenção apenas a respostas técnicas volumosas das APIs.

## Estrutura técnica

- Novas estruturas para fotos múltiplas, referências de mercado, histórico de preços, inspeções de QC, endereços do CD, movimentações de estoque, resultados de identificação e controle idempotente de liberação.
- Todas as novas tabelas terão GRANTs explícitos, RLS por perfil, índices e políticas sem acesso público.
- Funções de backend validarão arquivos, estados, permissões, quantidades e transições; o navegador não decidirá confiança nem estoque.
- Armazenamento privado para fotos/documentos, com links temporários para usuários autorizados.
- Serviços e telas modulares, reutilizando layout, componentes, React Query e padrões atuais.

## Validação

- Testar em desktop, tablet e celular os fluxos Inbound → QC → Estoque → Comercial.
- Testar EAN conhecido, EAN desconhecido, busca visual com foto real, indisponibilidade das APIs e envio para Pendências.
- Provar que scan/QC não altera estoque vendável e que a liberação altera exatamente uma vez.
- Fazer uma chamada real a cada API configurada e validar os erros exibidos.
- Validar produto, estoque e pedido no Bling, incluindo repetição segura e falha/reprocessamento.
- Testar cada perfil com acesso permitido e negado.
- Usar apenas dados e fotos reais fornecidos por você; remover qualquer registro técnico temporário ao final.
