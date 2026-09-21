# Nova navegação, busca e banners da loja

## Resultado esperado
- Cabeçalho público no estilo **Elite Boutique** escolhido: faixa escura, botão de menu, logo do O Garimpo Digital, busca larga e ações de conta/carrinho.
- Menu lateral deslizante com somente as páginas ativas, além de conta, favoritos, administração quando autorizada e documentos legais.
- Página **Início desativada inicialmente**; o endereço principal abrirá **Lançamentos**.
- Banners horizontais largos imediatamente abaixo do cabeçalho, no local hoje ocupado pelo bloco escuro “Lançamentos”, conforme a nova referência.
- Administração poderá ativar ou desativar Início, Lançamentos, Catálogo, Lotes, Sobre e Contato.

## Implementação
1. Criar uma configuração central de navegação com nome, endereço, situação ativa e destino principal quando Início estiver desativado.
2. Refazer o cabeçalho para desktop e celular preservando a identidade, logo e cores atuais do O Garimpo Digital.
3. Transformar a navegação principal em menu lateral recolhível, com destaque da página atual e busca também acessível no celular.
4. Manter a busca sempre visível e ampla no cabeçalho, levando os termos pesquisados ao catálogo.
5. Adicionar ao painel **Conteúdo → Navegação** controles simples para mostrar ou ocultar cada página e escolher qual página abre no endereço principal.
6. Bloquear o acesso público às páginas desativadas e redirecionar para a primeira página habilitada, sem excluir conteúdo.
7. Adaptar a navegação inferior do celular para não oferecer páginas desativadas.
8. Reutilizar os banners reais já cadastrados, em carrossel horizontal responsivo diretamente abaixo do cabeçalho de Lançamentos; não criar imagens ou textos fictícios.
9. Ajustar o formato do banner para manter proporção ampla no computador e enquadramento próprio no celular, respeitando as imagens desktop/mobile e posições já cadastradas.
10. Registrar a tarefa no roteiro do projeto e validar busca, menu, redirecionamentos, controles administrativos e banners em computador e celular.

## Detalhes técnicos
- A configuração será persistida nas configurações existentes da loja, sem nova base externa.
- O carrossel continuará usando os banners, links, vídeos, ordem, ativação e imagens móveis já gerenciados no painel.
- Páginas ocultas continuarão editáveis pela administração e poderão ser reativadas sem perda de conteúdo.
- Os estilos usarão os tokens do design atual; as imagens enviadas servem apenas como referência visual.
