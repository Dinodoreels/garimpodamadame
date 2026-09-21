export const CURRENT_LEGAL_VERSION = '2026.09.20-1';
export const CURRENT_COOKIE_VERSION = '2026.09.20-1';

export interface LegalSection {
  title: string;
  content: string;
}

export interface LegalDocument {
  page_title: string;
  subtitle: string;
  version: string;
  effective_at: string;
  last_updated: string;
  review_notice: string;
  sections: LegalSection[];
}

export interface LegalEntity {
  trade_name: string;
  legal_name: string;
  tax_id: string;
  address: string;
  privacy_email: string;
  legal_email: string;
  dpo_name: string;
}

export const EMPTY_LEGAL_ENTITY: LegalEntity = {
  trade_name: 'O Garimpo Digital',
  legal_name: '',
  tax_id: '',
  address: '',
  privacy_email: '',
  legal_email: '',
  dpo_name: '',
};

const common = {
  subtitle: 'O Garimpo Digital',
  version: CURRENT_LEGAL_VERSION,
  effective_at: '20/09/2026',
  last_updated: '20/09/2026',
  review_notice: 'Base informativa preparada conforme as funcionalidades atuais da loja. Deve ser revisada por profissional jurídico antes da publicação definitiva.',
};

export const DEFAULT_TERMS: LegalDocument = {
  ...common,
  page_title: 'Termos de Uso e Condições de Compra',
  sections: [
    { title: '1. Identificação e aplicação', content: 'Estes Termos regulam o acesso, o cadastro e as compras realizadas nos canais oficiais de O Garimpo Digital. Os dados jurídicos completos da responsável pela loja — razão social, CPF ou CNPJ, endereço e contato legal — serão exibidos neste documento assim que forem preenchidos pela administração e revisados juridicamente.\n\nAo criar uma conta, a pessoa confirma que leu e aceitou a versão indicada neste documento. O aceite é registrado com data, hora, versão e informações técnicas mínimas para comprovação.' },
    { title: '2. Cadastro e segurança da conta', content: 'A pessoa usuária deve informar dados verdadeiros, completos e atualizados, manter sua senha em sigilo e comunicar qualquer uso indevido da conta. O cadastro pode utilizar email e senha ou acesso pelo Google.\n\nNome, CPF e data de nascimento podem ser bloqueados para edição depois de preenchidos, especialmente quando vinculados a pedidos ou documentos fiscais. Pedidos de correção poderão exigir comprovação da identidade.' },
    { title: '3. Produtos, disponibilidade e preços', content: 'As características, imagens, condições e preços apresentados devem corresponder ao cadastro vigente do produto. Produtos sem estoque permanecem visíveis como esgotados ou sob encomenda, sem promessa de disponibilidade imediata.\n\nErros evidentes de preço, descrição ou disponibilidade serão analisados de boa-fé. Antes do pagamento, a loja confere preço e saldo. A compra somente é confirmada após a aprovação do pagamento e a confirmação do pedido.' },
    { title: '4. Pedidos e pagamentos', content: 'Os pedidos podem ser originados no site ou em marketplaces conectados. No site, os meios previstos são cartão de crédito, cartão de débito e Pix, conforme disponibilidade do Mercado Pago. Não há boleto bancário. No cartão de crédito, a compra pode ser dividida em até 12 parcelas. De 2x a 12x, os juros e o valor final são calculados pelo Mercado Pago e pagos pela pessoa compradora, com as condições apresentadas antes da confirmação do pagamento. Pix e cartão de débito não são parcelados.\n\nPedidos não pagos podem ser cancelados automaticamente após 30 minutos. Dados de pagamento são processados pelo provedor responsável; a loja recebe somente as informações necessárias para conciliar e atender o pedido.' },
    { title: '5. Entrega e retirada', content: 'No site, prazos e valores de frete são calculados com os dados reais informados e podem utilizar o Melhor Envio e suas transportadoras. Marketplaces utilizam seus próprios fretes e etiquetas oficiais. Quando disponível, a retirada em loja seguirá o local e o horário confirmados no pedido.\n\nA pessoa compradora é responsável por informar endereço correto, completo e acessível. Reentregas causadas por dados incorretos poderão gerar novo custo, respeitados os direitos legais.' },
    { title: '6. Trocas, devoluções e arrependimento', content: 'Nas compras realizadas fora do estabelecimento comercial, a pessoa consumidora pode exercer o direito de arrependimento no prazo legal de 7 dias corridos a partir do recebimento, conforme o Código de Defesa do Consumidor.\n\nO produto deverá ser devolvido com seus acessórios e, quando aplicável, embalagem e sinais compatíveis apenas com a verificação necessária. Produtos com defeito seguirão os prazos e garantias legais. Regras específicas não podem reduzir direitos assegurados por lei.' },
    { title: '7. Cupons, promoções e fidelidade', content: 'Cupons, ofertas e pontos podem possuir período de validade, limite de uso, produtos elegíveis e valor mínimo. Pontos de fidelidade expiram após 6 meses, conforme regra vigente da loja, e estatísticas consideram apenas pedidos pagos. Benefícios não são convertidos em dinheiro, salvo obrigação legal.' },
    { title: '8. Propriedade intelectual e uso permitido', content: 'Marca, identidade visual, textos, fotos próprias, organização do catálogo e demais conteúdos protegidos não podem ser copiados ou explorados comercialmente sem autorização. É proibido usar o site para fraude, invasão, automação abusiva, violação de direitos ou interferência em sua operação.' },
    { title: '9. Responsabilidades e disponibilidade', content: 'A loja mantém medidas razoáveis de segurança e continuidade, mas serviços podem ficar temporariamente indisponíveis por manutenção, falhas de terceiros ou eventos fora de seu controle. Nada nestes Termos exclui responsabilidades que não possam ser afastadas pelo Código de Defesa do Consumidor.' },
    { title: '10. Privacidade, comunicações e documentos fiscais', content: 'O tratamento de dados pessoais segue a Política de Privacidade. Comunicações operacionais sobre conta, pagamento, pedido, entrega, segurança e obrigações fiscais podem ser enviadas independentemente de autorização para marketing. Mensagens promocionais admitem cancelamento.\n\nA emissão fiscal depende de dados reais do pedido e da configuração fiscal regular da empresa. A loja não emitirá documentos com informações inventadas.' },
    { title: '11. Alterações e novo aceite', content: 'Quando houver mudança relevante, uma nova versão será publicada. Usuários cadastrados deverão confirmar a versão vigente no próximo acesso. Versões e aceites anteriores permanecem registrados para auditoria.' },
    { title: '12. Lei aplicável e atendimento', content: 'Aplicam-se as leis brasileiras, especialmente o Código de Defesa do Consumidor, o Marco Civil da Internet e a Lei Geral de Proteção de Dados. Fica preservado o foro legalmente assegurado à pessoa consumidora. Solicitações devem ser encaminhadas ao contato oficial informado pela loja.' },
  ],
};

export const DEFAULT_PRIVACY: LegalDocument = {
  ...common,
  page_title: 'Política de Privacidade e Proteção de Dados',
  sections: [
    { title: '1. Controladora e escopo', content: 'Esta Política explica como O Garimpo Digital trata dados pessoais no site, no atendimento, nas compras e nas integrações operacionais. Razão social, CPF ou CNPJ, endereço, email de privacidade e encarregado serão exibidos após preenchimento oficial e revisão jurídica.' },
    { title: '2. Dados tratados', content: 'Podemos tratar: nome, email, telefone, senha protegida pelo serviço de autenticação, CPF, data de nascimento; destinatário e endereço de entrega; produtos, valores, cupons e histórico de pedidos; situação e identificadores de pagamento; documentos fiscais; rastreio, transportadora e comprovantes; favoritos, avaliações, fidelidade e atendimento; preferências de comunicação; endereço de rede, navegador, dispositivo, páginas acessadas, origem da visita e identificadores de sessão e cookies.\n\nEm pedidos de marketplaces, recebemos os dados necessários fornecidos pelo respectivo canal para processar venda, estoque, entrega e obrigações fiscais.' },
    { title: '3. Finalidades', content: 'Usamos os dados para criar e proteger contas; autenticar acessos; concluir compras e pagamentos; separar, entregar e rastrear pedidos; emitir documentos fiscais; prevenir fraude; prestar suporte; cumprir obrigações legais; administrar trocas, devoluções e garantias; operar fidelidade, cupons e comunicações; melhorar a loja e medir resultados; manter registros de aceite e defender direitos.' },
    { title: '4. Bases legais sugeridas', content: 'Conforme o caso, o tratamento pode se apoiar na execução de contrato e procedimentos preliminares; cumprimento de obrigação legal ou regulatória; exercício regular de direitos; legítimo interesse, após avaliação de necessidade e impacto; proteção do crédito; e consentimento, especialmente para cookies opcionais e determinadas comunicações de marketing.\n\nA base aplicável deve ser validada pela responsável jurídica da empresa em seu registro de operações.' },
    { title: '5. Compartilhamento e operadores', content: 'Os dados necessários podem ser compartilhados com a infraestrutura da loja; Google no acesso social; Mercado Pago no pagamento; Melhor Envio e transportadoras nas vendas do site; Bling para gestão, pedidos, estoque e documentos fiscais; e marketplaces conectados, como Mercado Livre, Shopee, Magalu, Amazon, TikTok Shop e Shopify, quando o pedido ou anúncio for processado nesses canais.\n\nCom autorização de cookies, também podem atuar Meta, Google Analytics, Google Tag Manager e TikTok para análise e publicidade. Prestadores de email e recursos de inteligência artificial podem processar somente os dados necessários à função utilizada. Cada terceiro também aplica seus próprios termos e políticas.' },
    { title: '6. Cookies e dados de navegação', content: 'Cookies essenciais viabilizam sessão, segurança, carrinho e preferências básicas. Dados analíticos e pixels de marketing somente devem ser ativados após escolha expressa. A pessoa pode recusar os opcionais ou alterar sua decisão a qualquer momento em “Preferências de cookies”. Consulte a Política de Cookies para detalhes.' },
    { title: '7. Armazenamento, segurança e transferências', content: 'Os dados são mantidos em infraestrutura de banco, autenticação, funções e armazenamento da plataforma da loja, com controles de acesso por função, registros de atividade e conexões protegidas. Integrações podem envolver processamento fora do Brasil; a responsável deverá confirmar países, garantias contratuais e localização dos fornecedores antes da aprovação jurídica final.' },
    { title: '8. Retenção e eliminação', content: 'Os dados devem ser mantidos apenas pelo período necessário às finalidades, aos prazos legais, fiscais, consumeristas, antifraude e ao exercício de direitos. Os prazos específicos de cadastro, pedidos, notas, comprovantes, atendimento, marketing, navegação e logs ainda devem ser aprovados pela responsável e pelo jurídico.\n\nApós o prazo aplicável, os dados serão eliminados ou anonimizados, salvo hipótese legal de conservação.' },
    { title: '9. Direitos da pessoa titular', content: 'A pessoa titular pode solicitar confirmação e acesso; correção; anonimização, bloqueio ou eliminação quando cabível; portabilidade; informação sobre compartilhamentos; informação e revisão de decisões automatizadas; oposição; revogação do consentimento; e informação sobre consequências da negativa.\n\nPara proteger a conta, a loja poderá pedir confirmação de identidade. Alguns dados não poderão ser apagados imediatamente quando houver dever legal de conservação ou necessidade de defesa de direitos.' },
    { title: '10. Crianças e adolescentes', content: 'A loja não direciona deliberadamente seus serviços a crianças. Compras e cadastros de menores devem observar representação ou assistência responsável e as regras legais aplicáveis. Caso seja identificado tratamento inadequado, o responsável poderá solicitar análise e providências.' },
    { title: '11. Segurança e incidentes', content: 'São adotadas medidas técnicas e administrativas compatíveis com os riscos. Nenhum ambiente é totalmente imune. Incidentes relevantes serão avaliados, contidos, documentados e comunicados às pessoas afetadas e à Autoridade Nacional de Proteção de Dados quando exigido.' },
    { title: '12. Solicitações e contato', content: 'Solicitações de privacidade deverão ser enviadas ao email oficial de privacidade que será preenchido pela administração. A identidade e os dados jurídicos da controladora precisam constar neste documento antes da aprovação final.' },
  ],
};

export const DEFAULT_COOKIES: LegalDocument = {
  ...common,
  version: CURRENT_COOKIE_VERSION,
  page_title: 'Política de Cookies',
  sections: [
    { title: '1. O que são cookies', content: 'Cookies e tecnologias semelhantes são pequenos registros usados pelo navegador para manter sessões, lembrar escolhas, medir uso e, quando autorizado, apoiar publicidade. Também utilizamos armazenamento local e de sessão para finalidades equivalentes.' },
    { title: '2. Categorias utilizadas', content: 'Essenciais: autenticação, segurança, carrinho, preferência de tema, funcionamento do painel e manutenção da escolha de cookies. Não podem ser desligados pelo gerenciador porque o site depende deles.\n\nAnalíticos: páginas visitadas, origem da visita, campanhas, navegador e tipo de dispositivo, usados para medir e melhorar a loja.\n\nMarketing: pixels e identificadores usados para medir anúncios e criar públicos, quando configurados, incluindo tecnologias da Meta, Google e TikTok.' },
    { title: '3. Tecnologias e terceiros', content: 'A loja pode utilizar identificadores próprios de sessão e preferência. Após autorização, pode ativar Google Analytics, Google Tag Manager, Meta Pixel, TikTok Pixel e scripts de medição configurados pela administração. A lista efetiva depende das integrações ativadas no momento.' },
    { title: '4. Sua escolha', content: 'Na primeira visita, cookies analíticos e de marketing ficam desligados até sua decisão. Você pode aceitar todos, recusar os opcionais ou personalizar. Recusar não impede o uso das funções essenciais da loja.' },
    { title: '5. Como alterar ou retirar o consentimento', content: 'Use o botão “Preferências de cookies” disponível nesta página e no rodapé. A nova escolha passa a valer para os próximos acessos e é registrada com versão, data, hora e identificação técnica mínima. Também é possível apagar cookies no navegador, o que poderá encerrar sessões e restaurar preferências.' },
    { title: '6. Prazo e atualização', content: 'A duração técnica varia conforme a finalidade e o fornecedor. Os prazos exatos de cada tecnologia devem ser confirmados no inventário de cookies antes da revisão jurídica final. Mudanças relevantes geram nova versão e nova solicitação de escolha.' },
  ],
};

export const DOCUMENT_DEFAULTS = {
  legal_terms: DEFAULT_TERMS,
  legal_privacy: DEFAULT_PRIVACY,
  legal_cookies: DEFAULT_COOKIES,
} as const;