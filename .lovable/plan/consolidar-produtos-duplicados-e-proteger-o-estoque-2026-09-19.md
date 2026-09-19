# Consolidar produtos duplicados e proteger o estoque

## Resultado
- Manter um único cadastro visível para cada produto real.
- Preservar todos os códigos vinculados no Bling, fotos e histórico.
- Usar somente o estoque da Vanguard Store como saldo oficial; nunca somar o saldo de cópias.

## Implementação
1. Reforçar a identificação automática na entrada do Bling, nesta ordem: código Bling já vinculado, GTIN, SKU e correspondência exata segura de título + marca.
2. Quando houver correspondência única, vincular o novo código Bling ao produto existente em vez de criar outro cadastro.
3. Quando houver ambiguidade, manter o item em revisão sem alterar produto ou estoque.
4. Permitir vários códigos Bling legítimos apontando para o mesmo produto/variante, sem substituir ou apagar vínculos anteriores.
5. Na atualização de estoque, sempre ler a quantidade da variante principal da Vanguard Store e enviá-la individualmente a cada vínculo; nunca somar quantidades importadas.
6. Consolidar automaticamente a duplicata confirmada do Body Splash no cadastro original: mover vínculo e fotos ausentes, atualizar históricos e remover apenas a cópia vazia com estoque zero.
7. Registrar a consolidação no histórico e adicionar proteção no banco para impedir o mesmo código Bling de ser vinculado mais de uma vez.

## Validação
- Confirmar que o Body Splash aparece uma vez com estoque 1.000.
- Confirmar que os dois códigos Bling continuam vinculados ao cadastro principal.
- Simular nova busca do Bling e verificar que nenhum cadastro duplicado é criado.
- Validar que produtos ambíguos ficam para revisão e não têm estoque somado.
