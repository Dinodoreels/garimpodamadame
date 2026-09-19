# Fase 3

- [x] Criar base de dados, permissões e fluxo seguro de SKU/QC/preço/endereço/liberação
- [x] Implementar identificação por catálogo, GTIN e busca visual com cache e logs
- [x] Criar telas de itens/SKU, QC, estoque, endereçamento e histórico
- [x] Integrar liberação ao catálogo, estoque e fila Bling com idempotência
- [x] Reforçar sincronização Bling contra duplicidades e exibir falhas
- [x] Validar fluxos, acessos e layouts sem criar registros operacionais fictícios
- [x] Deixar atribuição de usuários reais disponível ao administrador para preenchimento posterior
- [x] Permitir envio para análise manual quando não houver foto ou código
- [ ] Homologar com fotos reais (adiado pelo administrador até os arquivos estarem disponíveis)
- [x] Orientar o administrador com o link oficial para criar o aplicativo da API Bling
- [x] Impedir nova autorização desnecessária e limpar o estado preso do Bling sem derrubar a conexão válida
- [x] Permitir trocar imediatamente as credenciais e a conta do Bling sem apagar dados da loja
- [x] Criar prévia administrativa do catálogo Bling com comparação por SKU e conflitos bloqueados
- [x] Importar produtos revisados em lotes como rascunhos, respeitando a origem escolhida para preço e estoque
- [x] Reunir catálogo, estoque e pedidos na ação “Buscar tudo do Bling”, com histórico por conta autorizada
- [x] Gerar automaticamente SKUs ausentes no Bling e liberar os produtos na revisão
- [x] Exibir o padrão único de sincronização para TikTok Shop, Mercado Livre, Shopee e Amazon
- [x] Validar a automação com os produtos reais da conta conectada
- [x] Corrigir a atualização de estoque por depósito e importar imagens dos 52 produtos vinculados
- [x] Importar e atualizar pedidos reais dos marketplaces via Bling, com cliente, itens, frete, situação e histórico
- [x] Exigir aprovação por lote com motivo e histórico antes de aplicar produtos e estoque
- [x] Sincronizar o estoque no Bling e no painel imediatamente após aplicar o lote
- [x] Mostrar fotos importadas e acesso direto aos produtos vinculados no painel
- [x] Atualizar automaticamente catálogo, fotos e estoque vinculados do Bling em lotes seguros
- [x] Permitir que somente administradores excluam recebimentos, com confirmação e proteção no banco
- [x] Pesquisar 3 anúncios reais no Garimpo Scan, gerar identificação/preço/descrição/fotos e publicar o cadastro único na loja e no painel
- [x] Usar NVIDIA Vision como alternativa segura quando a análise visual do Gemini estiver temporariamente indisponível
- [ ] Validar três anúncios reais após a liberação da cota de pesquisa Google

# Mercado Pago e Fiscal

- [x] Proteger a credencial do Mercado Pago fora das configurações visíveis
- [x] Conferir preço, disponibilidade e valor pago antes de confirmar o pedido
- [x] Criar dados fiscais, documentos e histórico com acessos por função
- [x] Criar configuração fiscal e situação da nota dentro de cada pedido
- [x] Preparar emissão e consulta da NF-e pelo Bling para o cliente final
- [ ] Cadastrar a credencial segura do Mercado Pago (aguardando preenchimento do administrador)
- [ ] Preencher os dados fiscais reais e validar impostos/certificado no Bling
- [x] Bloquear emissão real e mostrar checklist fiscal por empresa, Bling, produtos, cliente, pedido e pagamento
- [x] Mostrar a plataforma real do pedido e registrar a origem no complemento fiscal
- [ ] Homologar regras tributárias com o contador e liberar produção explicitamente
- [x] Mostrar todos os produtos diretamente nas linhas dos pedidos
- [x] Recuperar no Bling o DANFE/XML já emitido para pedidos de marketplace, sem duplicar notas
- [x] Emitir automaticamente a NF-e de pedidos pagos do site somente após validação fiscal completa
- [x] Publicar automaticamente na loja os produtos importados completos, com foto, SKU, preço e estoque válido

# Melhor Envio

- [x] Conectar o Melhor Envio somente às vendas do site, mantendo fretes de marketplaces separados e estoque compartilhado
- [x] Cotação real e persistência da opção escolhida no pedido
- [x] Preparar compra manual de etiqueta, impressão, rastreio e histórico somente para pedidos do site
- [x] Criar retorno público, autorização segura e renovação automática da conexão
- [x] Guardar o Client ID e Client Secret recebidos no cofre seguro
- [ ] Autorizar a conta e validar em produção sem comprar etiqueta automaticamente

# Etiquetas de marketplaces e cadastro automático

- [x] Buscar automaticamente as etiquetas oficiais de todos os marketplaces conectados ao Bling, priorizando TikTok Shop
- [x] Permitir atualização automática e manual quando a plataforma ainda não liberar a etiqueta
- [x] Oferecer impressão de etiqueta por pedido e impressão em lote
- [x] Manter etiquetas de marketplaces separadas do Melhor Envio, que atende apenas vendas do site
- [x] Preencher automaticamente fotos, título, descrição, preço, custo disponível, marca, SKU, variações, dimensões e estoque dos produtos importados
- [x] Marcar como pendente qualquer dado ausente na origem, sem inventar informações
- [x] Publicar produtos do Bling com estoque zero como ESGOTADO, mantendo a compra bloqueada
- [x] Ler também fotos internas, miniaturas e fotos de variações retornadas pelo Bling
- [x] Rebuscar o catálogo real e republicar automaticamente os produtos que recuperarem fotos
- [x] Guardar as fotos recuperadas permanentemente para evitar links temporários do Bling
- [x] Exibir todos os produtos com SKU e preço, mesmo quando a plataforma não fornecer foto, mantendo estoque zerado como ESGOTADO

# Faturamento do Bling

- [x] Ampliar a busca manual para reconciliar todos os pedidos dos últimos 90 dias, com paginação e sem duplicações
- [x] Confirmar no painel o total real importado após executar a nova busca no Bling

# Cadastro completo e publicação multicanal

- [x] Criar campos de marca, fabricante, GTIN, dados fiscais, condição, garantia e atributos por canal
- [x] Criar vínculos de canais, categorias, publicações e histórico com acesso administrativo
- [x] Calcular preenchimento e pendências antes da publicação
- [x] Enriquecer o envio ao Bling e impedir dados físicos fictícios no TikTok
- [ ] Concluir a confirmação visual de sugestões e os campos novos na edição de produto
- [ ] Buscar lojas/categorias conectadas no Bling e publicar anúncios completos por canal
- [ ] Validar a automação em cada canal conectado com um produto real completo
- [x] Preencher o cadastro por foto, código de barras, catálogo e Bling/plataformas sem salvar antes da revisão

# Estoque em tempo real — outra página de vendas

- [x] Identificar a página VIP como entrada de ofertas, sem estoque próprio
- [x] Manter o Bling como fonte principal do saldo e impedir ciclos pela fila existente
- [x] Atualizar a loja em avisos do Bling e refletir o saldo nas campanhas VIP
- [x] Criar campanhas por SKU com desconto, cupom, foto, link e bloqueio sem estoque
- [x] Restringir o cupom VIP ao produto divulgado e recalcular o desconto no pagamento
- [x] Registrar envios, falhas, esgotamento e reposição sem duplicar a mesma oferta
- [x] Criar a área Grupo VIP no painel com prévia e configuração do envio
- [ ] Ativar envio real após configurar Evolution API, WPPConnect ou UAZAPI e o código do grupo
- [ ] Validar envio real após o Bling registrar saldo positivo em pelo menos um produto completo

# Entrada automática de produtos pelo Bling

- [x] Confirmar o Bling como entrada única de produtos vindos das plataformas
- [x] Aplicar automaticamente produtos novos com SKU, título, preço e foto reais
- [x] Manter produtos incompletos ou com conflito separados para revisão administrativa
- [x] Atualizar produtos vinculados e estoque sem criar ciclos de sincronização
- [x] Adicionar a ação “Atualizar do Bling agora” com resumo de aplicados, pendentes e erros
- [x] Validar com o produto real mais recente encontrado no Bling, mantido em revisão por falta de foto

# Estoque principal no painel e TikTok Shop

- [x] Definir o nosso sistema como fonte principal do estoque
- [x] Salvar corretamente o vínculo retornado pelo Bling antes de enviar o saldo
- [x] Enviar e confirmar as 1.000 unidades do produto real no depósito Geral
- [x] Manter a busca do Bling sem sobrescrever o estoque principal do painel
- [x] Reconhecer a conta TikTok Shop já conectada ao Bling
- [x] Permitir confirmar dados e escolher a categoria TikTok dentro do cadastro
- [ ] Validar categoria e atributos reais do TikTok Shop
- [ ] Publicar o produto e sincronizar o estoque no TikTok após escolher e confirmar a categoria real
- [ ] Manter o custo real do produto sincronizado no Bling junto com preço e estoque
- [x] Mostrar no cadastro a categoria, atributos, código do anúncio, situação e retorno exato recebido do TikTok via Bling
- [x] Publicar automaticamente no TikTok todos os produtos completos após receber categoria e atributos reais do Bling
