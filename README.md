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

## Publicação na Hostinger

Este projeto deve ser publicado como uma aplicação Node.js, não como um site estático.

1. No hPanel, crie primeiro um banco em **Databases → MySQL Databases** e guarde host, nome, usuário e senha.
2. Vá a **Websites → Add Website → Node.js Web App** e importe este repositório ou envie um arquivo ZIP.
3. Selecione **Express.js** (ou **Other**, se necessário), Node.js 22 e informe `server.js` como arquivo de entrada. Não há diretório de build.
4. Nas variáveis de ambiente da aplicação, configure:

```env
NODE_ENV=production
DB_HOST=localhost
DB_PORT=3306
DB_USER=USUARIO_MYSQL_DA_HOSTINGER
DB_PASSWORD=SENHA_MYSQL_DA_HOSTINGER
DB_NAME=NOME_DO_BANCO_DA_HOSTINGER
ADMIN_USER=DEV
ADMIN_PASSWORD=352155++
AUTH_SECRET=SEGREDO_ALEATORIO_EXCLUSIVO_COM_PELO_MENOS_32_CARACTERES
TRUST_PROXY=1
```

Não configure `PORT` no hPanel: a plataforma fornece essa variável automaticamente. Não envie o arquivo `.env` ao GitHub ou no ZIP de produção.

5. Faça o deploy. O servidor cria e atualiza as tabelas automaticamente.
6. Confirme que `https://SEU-DOMINIO/api/health` responde com `{"status":"ok"}` e então entre pelo domínio.

Se alterar qualquer variável no hPanel, reinicie a aplicação pelo dashboard da Hostinger.
