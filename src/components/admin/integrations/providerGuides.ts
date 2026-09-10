import type { ProviderGuide } from './ProviderSetupGuide';

// ============= WHATSAPP =============
export const WHATSAPP_GUIDES: Record<string, ProviderGuide> = {
  evolution: {
    intro: 'Evolution API é open-source. Você precisa de um servidor próprio (VPS) ou um provedor que hospeda para você.',
    steps: [
      { text: 'Contrate um servidor que hospeda Evolution API (ou instale na sua VPS).', link: { label: 'Instalar Evolution API', url: 'https://doc.evolution-api.com/v1/pt/install/docker' } },
      { text: 'Acesse o painel do seu servidor e crie uma nova instância (ex: "minha-loja").' },
      { text: 'Copie a URL Base do servidor (ex: https://api.seudominio.com).' },
      { text: 'Copie o nome da instância criada e cole no campo "Instância".' },
      { text: 'Copie a API Key da instância (geralmente está em Configurações > Auth) e cole em "API Key".' },
      { text: 'Escaneie o QR Code com o WhatsApp do celular para conectar a instância.' },
    ],
    docsUrl: 'https://doc.evolution-api.com',
  },
  zapi: {
    intro: 'Z-API é uma API brasileira paga, fácil de configurar.',
    steps: [
      { text: 'Crie uma conta na Z-API e acesse o painel.', link: { label: 'Criar conta na Z-API', url: 'https://app.z-api.io/register' } },
      { text: 'Crie uma nova instância em "Instâncias > Nova Instância".' },
      { text: 'Copie o Instance ID exibido no painel da instância.' },
      { text: 'Copie o Token (Security Token) na mesma tela.' },
      { text: 'Conecte seu WhatsApp escaneando o QR Code dentro da Z-API.' },
    ],
    docsUrl: 'https://developer.z-api.io/',
  },
  wppconnect: {
    intro: 'WPPConnect é open-source. Você precisa hospedar o servidor.',
    steps: [
      { text: 'Instale o WPPConnect Server na sua VPS via Docker.', link: { label: 'Guia de instalação', url: 'https://github.com/wppconnect-team/wppconnect-server' } },
      { text: 'Defina uma SECRET_KEY ao iniciar o servidor (variável de ambiente).' },
      { text: 'Cole a URL Base (ex: https://wpp.seudominio.com) no campo correspondente.' },
      { text: 'Crie uma sessão (POST /api/{session}/start-session) e cole o nome no campo "Session".' },
      { text: 'Cole a SECRET_KEY definida no servidor no campo "Secret Key".' },
    ],
    docsUrl: 'https://wppconnect.io/docs',
  },
  uazapi: {
    intro: 'UAZAPI é um gateway brasileiro de WhatsApp (não-oficial) com plano gratuito e painel próprio. Excelente para começar rápido sem hospedar servidor.',
    steps: [
      { text: 'Acesse o site da UAZAPI e crie uma conta gratuita.', link: { label: 'Abrir UAZAPI', url: 'https://uazapi.com' } },
      { text: 'Acesse o painel free (ou seu painel pago) para gerenciar instâncias.', link: { label: 'Painel Free UAZAPI', url: 'https://free.uazapi.com' } },
      { text: 'Clique em "Criar instância" e dê um nome (ex: "minha-loja").' },
      { text: 'Escaneie o QR Code com o WhatsApp do celular para conectar.' },
      { text: 'Na tela da instância, copie o "Token da Instância" e cole no campo correspondente.' },
      { text: 'Mantenha a URL Base como https://free.uazapi.com (plano free) ou troque pelo seu domínio se for plano pago.' },
      { text: 'Se aparecer "WhatsApp disconnected: session is not reconnectable" no teste, sua instância caiu — abra o painel da UAZAPI, entre na instância e leia o QR Code de novo para reconectar.' },
    ],
    docsUrl: 'https://docs.uazapi.com',
  },
  twilio: {
    intro: 'API oficial via Twilio. Para produção exige aprovação do número no WhatsApp Business.',
    steps: [
      { text: 'Crie uma conta na Twilio.', link: { label: 'Cadastro Twilio', url: 'https://www.twilio.com/try-twilio' } },
      { text: 'No console, vá em "Account > API keys & tokens" e copie o Account SID.', link: { label: 'Console Twilio', url: 'https://console.twilio.com/' } },
      { text: 'Na mesma tela, copie o Auth Token (clique no olho para revelar).' },
      { text: 'Para testar, ative o Sandbox em "Messaging > Try it out > Send a WhatsApp message".', link: { label: 'WhatsApp Sandbox', url: 'https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn' } },
      { text: 'Use o número exibido (ex: +14155238886) no campo "Número WhatsApp" no formato whatsapp:+1XXXXXXXXXX.' },
    ],
    docsUrl: 'https://www.twilio.com/docs/whatsapp',
  },
  meta: {
    intro: 'API oficial do WhatsApp Business via Meta. Requer verificação de negócio.',
    steps: [
      { text: 'Acesse o Meta for Developers e crie um app do tipo Business.', link: { label: 'Meta for Developers', url: 'https://developers.facebook.com/apps/' } },
      { text: 'Adicione o produto "WhatsApp" ao seu app.' },
      { text: 'Em "WhatsApp > API Setup" copie o Phone Number ID.', link: { label: 'WhatsApp API Setup', url: 'https://developers.facebook.com/docs/whatsapp/cloud-api/get-started' } },
      { text: 'Gere um Access Token permanente em "System Users > Generate New Token" no Meta Business.', link: { label: 'Meta Business Settings', url: 'https://business.facebook.com/settings/system-users' } },
      { text: 'Defina um Verify Token qualquer (string secreta sua) — usado pelo webhook de confirmação.' },
    ],
    docsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api',
  },
  webhook: {
    intro: 'Envie as mensagens para sua URL (n8n, Make, Zapier, sistema próprio). Útil quando você já tem um sistema processando WhatsApp.',
    steps: [
      { text: 'Crie um workflow no seu sistema (ex: n8n) que recebe POST e dispara a mensagem no WhatsApp.', link: { label: 'Criar webhook no n8n', url: 'https://n8n.io/integrations/webhook/' } },
      { text: 'Copie a URL pública do webhook e cole no campo "URL do Webhook".' },
      { text: 'Escolha o método HTTP (geralmente POST).' },
      { text: '(Opcional) Defina um Bearer Token ou Header customizado para autenticar as requisições.' },
      { text: 'O sistema enviará JSON com: phone, message, event, customer_name, order_number, timestamp.' },
    ],
  },
};

// ============= EMAIL =============
export const EMAIL_GUIDES: Record<string, ProviderGuide> = {
  smtp: {
    intro: 'Use SMTP do Gmail (limite de ~500 emails/dia). Para volume alto prefira Resend ou SendGrid.',
    steps: [
      { text: 'Acesse sua Conta Google e ative a Verificação em duas etapas.', link: { label: 'Ativar 2FA Google', url: 'https://myaccount.google.com/security' } },
      { text: 'Crie uma "Senha de App" específica para envio de emails.', link: { label: 'Criar Senha de App', url: 'https://myaccount.google.com/apppasswords' } },
      { text: 'Selecione "App: Outro" e nomeie como "Loja". Copie a senha de 16 caracteres gerada.' },
      { text: 'Use host: smtp.gmail.com, porta: 587, usuário: seu email completo, senha: a senha de app gerada.' },
    ],
    docsUrl: 'https://support.google.com/mail/answer/185833',
  },
  resend: {
    intro: 'Resend é moderno, fácil e tem 3.000 emails/mês grátis.',
    steps: [
      { text: 'Crie uma conta no Resend.', link: { label: 'Cadastro Resend', url: 'https://resend.com/signup' } },
      { text: 'Verifique seu domínio em "Domains > Add Domain" (adicione os registros DNS solicitados).', link: { label: 'Adicionar domínio', url: 'https://resend.com/domains' } },
      { text: 'Vá em "API Keys > Create API Key" e copie a chave (começa com re_).', link: { label: 'Criar API Key', url: 'https://resend.com/api-keys' } },
      { text: 'Cole a chave no campo "API Key" e configure o "From Email" usando seu domínio verificado.' },
    ],
    docsUrl: 'https://resend.com/docs',
  },
  sendgrid: {
    intro: 'SendGrid (da Twilio) tem 100 emails/dia grátis e escala para milhões.',
    steps: [
      { text: 'Crie uma conta no SendGrid.', link: { label: 'Cadastro SendGrid', url: 'https://signup.sendgrid.com/' } },
      { text: 'Verifique o remetente em "Settings > Sender Authentication" (Single Sender ou domínio).', link: { label: 'Sender Authentication', url: 'https://app.sendgrid.com/settings/sender_auth' } },
      { text: 'Vá em "Settings > API Keys > Create API Key" e escolha "Full Access".', link: { label: 'Criar API Key', url: 'https://app.sendgrid.com/settings/api_keys' } },
      { text: 'Copie a chave (começa com SG.) — ela só é exibida uma vez.' },
      { text: 'Cole no campo "API Key" e configure o "From Email" usando o remetente verificado.' },
    ],
    docsUrl: 'https://docs.sendgrid.com/for-developers/sending-email/api-getting-started',
  },
};

// ============= PAYMENTS =============
export const PAYMENT_GUIDES: Record<string, ProviderGuide> = {
  mercadopago: {
    intro: 'Mercado Pago é o gateway mais usado no Brasil. Aceita Pix, cartão e débito.',
    steps: [
      { text: 'Acesse o painel de desenvolvedores do Mercado Pago (logado com sua conta).', link: { label: 'Painel Mercado Pago', url: 'https://www.mercadopago.com.br/developers/panel/app' } },
      { text: 'Clique em "Criar aplicação" → escolha "Pagamentos online" → "Marketplace? Não".' },
      { text: 'Acesse a aplicação criada e vá em "Credenciais de produção" no menu lateral.', link: { label: 'Credenciais', url: 'https://www.mercadopago.com.br/developers/panel/app' } },
      { text: 'Copie o Access Token (começa com APP_USR-) e cole no campo "Access Token".' },
      { text: 'Copie a Public Key (começa com APP_USR-) e cole no campo "Public Key".' },
      { text: 'Defina o tempo de expiração do Pix (recomendado: 30 minutos).' },
    ],
    docsUrl: 'https://www.mercadopago.com.br/developers/pt/docs',
  },
  pagseguro: {
    intro: 'PagBank (PagSeguro) — gateway brasileiro tradicional.',
    steps: [
      { text: 'Acesse o painel de desenvolvedores do PagBank.', link: { label: 'PagBank Developers', url: 'https://acesso.pagseguro.uol.com.br/' } },
      { text: 'Em "Integrações > Token de Segurança", gere um novo token.' },
      { text: 'Copie o token e cole no campo correspondente.' },
    ],
    docsUrl: 'https://dev.pagbank.uol.com.br/',
  },
  pagarme: {
    intro: 'Pagar.me — gateway da Stone com excelente performance.',
    steps: [
      { text: 'Crie uma conta no Pagar.me.', link: { label: 'Cadastro Pagar.me', url: 'https://pagar.me/' } },
      { text: 'Acesse a Dashboard → Configurações → Chaves de API.', link: { label: 'Dashboard', url: 'https://dashboard.pagar.me/' } },
      { text: 'Copie a Secret Key (chave de produção) e cole no campo "API Key".' },
    ],
    docsUrl: 'https://docs.pagar.me/',
  },
  cielo: {
    intro: 'Cielo — uma das maiores adquirentes do Brasil.',
    steps: [
      { text: 'Cadastre-se como desenvolvedor na Cielo.', link: { label: 'Cielo Developers', url: 'https://desenvolvedores.cielo.com.br/' } },
      { text: 'Crie uma loja de testes/produção e obtenha Merchant ID e Merchant Key.' },
      { text: 'Cole os valores nos campos correspondentes.' },
    ],
    docsUrl: 'https://developercielo.github.io/',
  },
  asaas: {
    intro: 'Asaas — gateway popular para pequenas e médias empresas, com Pix nativo.',
    steps: [
      { text: 'Crie uma conta no Asaas.', link: { label: 'Cadastro Asaas', url: 'https://www.asaas.com/' } },
      { text: 'Acesse "Integrações > API Asaas" no menu.', link: { label: 'API Asaas', url: 'https://www.asaas.com/customerApiAccessToken/index' } },
      { text: 'Gere uma nova chave de API e copie o valor.' },
    ],
    docsUrl: 'https://docs.asaas.com/',
  },
  efi: {
    intro: 'Efí (antiga Gerencianet) — Pix e boleto com taxas competitivas.',
    steps: [
      { text: 'Crie conta na Efí.', link: { label: 'Cadastro Efí', url: 'https://sso.efipay.com.br/' } },
      { text: 'Em "API > Minhas aplicações" crie uma aplicação Pix.', link: { label: 'Minhas aplicações', url: 'https://sejaefi.com.br/central/aplicacoes' } },
      { text: 'Copie Client ID e Client Secret de produção.' },
    ],
    docsUrl: 'https://dev.efipay.com.br/',
  },
  openpix: {
    intro: 'OpenPix — Pix com webhook e cobrança simples.',
    steps: [
      { text: 'Crie conta na OpenPix.', link: { label: 'Cadastro OpenPix', url: 'https://app.openpix.com.br/register' } },
      { text: 'Em "API > Minhas Apps", crie um App ID.', link: { label: 'API Apps', url: 'https://app.openpix.com.br/home/applications' } },
      { text: 'Copie o App ID e cole no campo correspondente.' },
    ],
    docsUrl: 'https://developers.openpix.com.br/',
  },
  stripe: {
    intro: 'Stripe — gateway internacional, ideal para vendas em moeda estrangeira.',
    steps: [
      { text: 'Crie conta na Stripe.', link: { label: 'Cadastro Stripe', url: 'https://dashboard.stripe.com/register' } },
      { text: 'Acesse "Developers > API keys" no Dashboard.', link: { label: 'API keys', url: 'https://dashboard.stripe.com/apikeys' } },
      { text: 'Copie a "Secret key" (sk_live_... para produção, sk_test_... para testes).' },
    ],
    docsUrl: 'https://stripe.com/docs/keys',
  },
};

// ============= BLING (ERP) =============
export const BLING_GUIDE: ProviderGuide = {
  intro: 'O Bling é o ERP que conversa com Mercado Livre, Shopee, Magalu, Amazon e TikTok Shop. Você precisa de um plano do Bling que inclua acesso à API v3.',
  steps: [
    { text: 'Crie sua conta no Bling e escolha um plano com API (v3).', link: { label: 'Criar conta no Bling', url: 'https://www.bling.com.br/cadastro' } },
    { text: 'Dentro do Bling, abra Preferências → Integrações → API para desenvolvedores → Cadastrar aplicativo.', link: { label: 'Abrir o Bling', url: 'https://www.bling.com.br/login' } },
    { text: 'Dê um nome ao aplicativo (ex: "Minha Loja") e cole a URL de retorno mostrada nesta tela no campo "URL de redirecionamento".' },
    { text: 'Marque os escopos de produtos, estoques, pedidos de venda e contatos.' },
    { text: 'Salve e copie o Client ID e o Client Secret gerados; cole nos campos acima.' },
    { text: 'Clique em "Conectar com o Bling" e autorize a sua empresa na janela que abrir.' },
    { text: 'Depois, ligue as suas lojas de marketplace dentro do próprio Bling — a loja passa a receber esses pedidos automaticamente.', link: { label: 'Canais de venda no Bling', url: 'https://ajuda.bling.com.br/hc/pt-br/categories/360002518534' } },
  ],
  docsUrl: 'https://developer.bling.com.br/',
};
