# BRICKSCORE Football — V0.1

Primeira versão do BRICKSCORE para **Futebol, Futsal e Society**.

## Recursos desta versão
- Futebol, Futsal e Society
- Formatos configuráveis por modalidade
- Cadastro de jogadores com foto
- Montagem automática dos times usando o histórico
- Gols, assistências, cartões amarelos e vermelhos
- Placar automático pela soma dos gols, com edição manual
- MVP automático
- Perfil individual e ranking
- Temporadas
- Backup e restauração
- PWA instalável

## Como rodar
1. Crie um banco MySQL/MariaDB e rode `schema.sql` (ou apenas inicie o servidor; `database.js` cria/atualiza as tabelas).
2. Copie `.env.example` para `.env` e informe as credenciais do banco.
3. Defina `ADMIN_USER`, uma senha forte em `ADMIN_PASSWORD` e um `AUTH_SECRET` aleatório com pelo menos 32 caracteres.
4. Execute `npm install`.
5. Execute `npm start`.
6. Acesse a porta configurada, por padrão `http://localhost:3000`, e entre com o usuário administrativo.

Esta versão é separada do BRICKSCORE de basquete.
