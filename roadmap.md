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
- [ ] Corrigir a atualização de estoque por depósito e importar imagens dos 52 produtos vinculados
- [x] Importar e atualizar pedidos reais dos marketplaces via Bling, com cliente, itens, frete, situação e histórico
- [x] Exigir aprovação por lote com motivo e histórico antes de aplicar produtos e estoque
- [x] Sincronizar o estoque no Bling e no painel imediatamente após aplicar o lote
- [x] Mostrar fotos importadas e acesso direto aos produtos vinculados no painel

# Mercado Pago e Fiscal

- [x] Proteger a credencial do Mercado Pago fora das configurações visíveis
- [x] Conferir preço, disponibilidade e valor pago antes de confirmar o pedido
- [x] Criar dados fiscais, documentos e histórico com acessos por função
- [x] Criar configuração fiscal e situação da nota dentro de cada pedido
- [x] Preparar emissão e consulta da NF-e pelo Bling para o cliente final
- [ ] Cadastrar a credencial segura do Mercado Pago (aguardando preenchimento do administrador)
- [ ] Preencher os dados fiscais reais e validar impostos/certificado no Bling
