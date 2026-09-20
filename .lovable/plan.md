# Campanhas para grupos do WhatsApp

## Objetivo
Criar no painel administrativo uma área para divulgar lives, eventos, promoções e produtos em um ou vários grupos reais do WhatsApp, com envio imediato ou agendado.

## O que será criado
- Cadastro de grupos com nome, código real do grupo, provedor ativo e situação ativo/inativo.
- Criador de campanhas com título interno, texto personalizado, link, imagem ou vídeo, produtos reais da loja e cupom existente.
- Prévia da mensagem final antes da confirmação.
- Seleção de um, vários ou todos os grupos ativos.
- Botões para salvar rascunho, enviar agora ou agendar data e horário.
- Confirmação obrigatória antes do envio imediato.
- Histórico por campanha e por grupo, mostrando aguardando, enviada, falhou ou cancelada e o motivo real da falha.
- Ação para cancelar campanhas que ainda não foram enviadas.

## Segurança e regras
- Somente administradores poderão cadastrar grupos, criar campanhas e disparar mensagens.
- Nenhum grupo, produto, cupom ou dado promocional será inventado.
- A campanha usará apenas o provedor de WhatsApp já configurado que aceite grupos.
- O envio será idempotente: cada campanha será enviada uma única vez para cada grupo, mesmo se o processamento for repetido.
- Produtos terão estoque, preço, imagem e link consultados no momento do envio; produto indisponível bloqueará a campanha em vez de anunciar informação incorreta.
- Cupons serão validados novamente no envio; cupons vencidos ou inativos bloquearão a campanha.
- Imagem ou vídeo será opcional e armazenado na biblioteca existente da loja.

## Parte técnica
- Criar tabelas para grupos, campanhas, destinos e histórico, com permissões restritas a administradores e acesso de serviço para o processador.
- Criar uma função de envio que monte a mensagem, valide conteúdo real e envie para cada grupo pelo provedor configurado.
- Criar um processador de agendamentos executado periodicamente, com trava contra envio duplicado.
- Adicionar a nova área “Campanhas WhatsApp” nas Configurações, reutilizando produtos, cupons, biblioteca de mídia e componentes visuais existentes.
- Manter a atual área “Grupo VIP” funcionando sem alteração.

## Validação
- Verificar criação e edição de grupos, rascunho, prévia, agendamento, cancelamento e histórico.
- Testar bloqueios para grupo inválido, produto indisponível, cupom inválido e provedor incompatível.
- Confirmar no computador e no celular que os campos e ações permanecem legíveis e sem sobreposição.
