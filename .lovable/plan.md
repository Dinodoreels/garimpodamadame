# Ativar os emails da loja

## Situação confirmada

- Não há domínio de envio configurado e não existem registros de envio nos últimos 14 dias.
- O cadastro entra direto, sem confirmação por email; as 3 contas atuais estão confirmadas.
- Recuperação de senha e convites dependem do envio básico de acesso.
- Recibos, avisos de pedidos e relatórios têm telas e regras prontas, mas nenhum serviço de envio está ativo.
- Boas-vindas, pedidos, aniversário, carrinho abandonado e demais automações estão desligados.
- Não há modelos de marketing cadastrados nem emails aguardando envio.

## O que será feito

1. Configurar um endereço de envio no domínio próprio `ogarimpodigital.com.br` e aguardar a validação do domínio.
2. Criar os emails com a identidade do O Garimpo Digital para:
   - recuperação de senha;
   - convite de cliente criado pelo administrativo;
   - boas-vindas;
   - pedido confirmado;
   - pedido enviado com rastreio;
   - pedido entregue;
   - comprovante de compra;
   - relatórios e alertas administrativos individuais.
3. Manter o cadastro sem confirmação obrigatória por email, como decidido anteriormente.
4. Ligar cada envio ao acontecimento correto e impedir emails repetidos quando houver nova tentativa.
5. Ativar no painel apenas as automações essenciais já preparadas e configurar os destinatários administrativos reais, sem inventar endereços.
6. Testar cadastro, recuperação de senha, convite, pedido e comprovante; conferir envios, recusas, bloqueios e devoluções no histórico.
7. Corrigir os textos antigos que ainda mostram outro nome ou outro endereço de loja.

## Campanhas e promoções

Emails em massa, carrinho abandonado, aniversário, cliente inativo, pedido de avaliação e campanhas promocionais não serão enviados pelo serviço de emails essenciais. Eles exigem uma ferramenta própria de marketing para proteger a reputação do domínio e administrar consentimento. A área atual será mantida desligada até essa ferramenta ser conectada.

## Dependência necessária

A configuração só poderá enviar depois que o domínio de email for validado. Durante a execução, será aberta a configuração do domínio para você confirmar o endereço de envio. Nenhum email, telefone ou dado comercial será inventado.

## Detalhes técnicos

- Usar o envio gerenciado do Lovable Cloud para emails de acesso e avisos individuais.
- Substituir chamadas antigas a provedores externos e filas ausentes pelo envio gerenciado síncrono.
- Criar modelos registrados e específicos para cada acontecimento, com chave de proteção contra duplicidade.
- Não criar fila, tabela ou agendamento próprio de entrega de emails.
- Publicar e validar todas as funções afetadas após a configuração do domínio.
