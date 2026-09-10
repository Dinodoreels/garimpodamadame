# Próximos passos no Bling (a partir da tela inicial)

Você já criou a conta (plano Cobalto em teste). A partir dessa tela, o caminho é:

## 1. Criar o aplicativo de API
1. Clique na **engrenagem (⚙️)** no canto superior direito → **Todas as configurações**.
2. Procure **Integrações → API para desenvolvedores** (ou "Cadastrar aplicativo").
3. Clique em **Criar novo aplicativo**:
   - **Nome:** Loja (ex.: "Garimpo da Madame")
   - **URL de redirecionamento (callback):** copie da tela **Configurações → Bling** do painel da loja e cole aqui — precisa ser exatamente igual.
   - **Escopos/permissões:** marque Produtos, Estoques, Pedidos de venda e Contatos.
4. Salve e copie o **Client ID** e o **Client Secret** gerados.

## 2. Verificar o plano
- A API v3 pode exigir plano pago. Se o menu de API não aparecer ou bloquear no plano Cobalto de teste, será preciso ativar um plano com API (o próprio Bling avisa na tela).

## 3. Conectar na loja
- No painel da loja: **Configurações → Bling** → cole Client ID e Secret → **Conectar com o Bling** → autorize → **Testar conexão**.

## 4. Conectar os marketplaces (depois)
- No menu **Cadastros → Canais de venda** (ou **Configurações → Integrações de lojas virtuais/marketplaces**): conecte Mercado Livre, Shopee, Magalu, Amazon e TikTok Shop.

## Observação
Sem alterações de código nesta etapa — é só configuração dentro do Bling. A loja já está pronta esperando as credenciais.
