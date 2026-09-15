# Conectar o aplicativo do Melhor Envio com OAuth

## Objetivo
Cadastrar o aplicativo “Garimpo da Madame” no Melhor Envio e conectar a conta de produção com renovação automática, sem expor credenciais e sem afetar os pedidos importados do Bling.

## Preenchimento do formulário
- **Nome da plataforma:** Garimpo da Madame
- **Site da plataforma:** `https://ogarimpodigital.com.br`
- **E-mail de contato:** o e-mail administrativo real que você acompanha
- **E-mail do suporte técnico:** pode usar o mesmo e-mail administrativo
- **URL do ambiente para testes:** `https://ogarimpodigital.com.br/integracoes/melhor-envio/callback`
- **URL de redirecionamento após autorização:** `https://ogarimpodigital.com.br/integracoes/melhor-envio/callback`
- **Descrição:** `Integração da loja Garimpo da Madame com o Melhor Envio para cotação de frete, compra e impressão de etiquetas, rastreamento e atualização dos pedidos feitos no site.`

Não cadastrar ainda: a página de redirecionamento precisa existir primeiro e a URL deve ser idêntica no cadastro e na autorização, conforme a documentação do Melhor Envio.

## Implementação
1. **Retorno seguro da autorização**
   - Criar a página pública de retorno no domínio da loja.
   - Validar o código e o estado da autorização no servidor.
   - Mostrar sucesso ou erro e voltar ao painel administrativo.

2. **Credenciais protegidas**
   - Após o cadastro, solicitar Client ID e Client Secret em formulário seguro, nunca no chat ou no navegador.
   - Guardar tokens somente no cofre do sistema.
   - Implementar renovação automática antes do vencimento.

3. **Conexão no painel**
   - Adicionar “Conectar com Melhor Envio” nas configurações.
   - Abrir a autorização oficial, confirmar a conta conectada e permitir reconectar.
   - Exibir estado da conexão sem mostrar segredos.

4. **Preservar a regra dos pedidos**
   - Cotação, etiqueta, impressão e rastreio somente para pedidos com origem real `website`.
   - Pedidos vindos do Bling e marketplaces continuam fora do Melhor Envio.
   - O estoque permanece compartilhado.

5. **Validação segura**
   - Testar autorização, cotação e leitura da conta sem comprar etiqueta.
   - Validar o retorno no domínio publicado e no celular.
   - Manter compra de etiqueta dependente de confirmação administrativa.

## Situação confirmada
- A tela enviada é o cadastro oficial de aplicativo do Melhor Envio.
- A integração atual já possui cotação e operações de envio, mas ainda espera um token fixo e não possui o retorno OAuth desse novo aplicativo.
- O Melhor Envio fornece Client ID e Client Secret após o cadastro; o token será obtido pela autorização e renovado pelo sistema.

## Critérios de aceite
- O formulário do Melhor Envio aceita a URL sem erro de callback.
- A conta conecta pelo painel sem copiar token manualmente.
- As credenciais não aparecem no código nem na tela.
- A conexão se mantém após a renovação do token.
- Nenhuma etiqueta é comprada durante os testes.
