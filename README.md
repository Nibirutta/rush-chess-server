# Rush Chess Server

API do servidor do Rush Chess.

## Rotas HTTP

As rotas abaixo não incluem um prefixo global. Por padrão, a aplicação escuta
na porta `3000` e aceita credenciais (cookies) nas requisições.

### Autenticação de jogadores

#### `POST /player/register`

Cria uma conta e inicia a sessão do jogador. Não envie uma conta já autenticada
com o cookie `session_token`.

**Corpo da requisição:**

```json
{
  "nickname": "Jogador",
  "username": "jogador123",
  "password": "SenhaForte1!"
}
```

Regras de validação:

- `nickname`: texto obrigatório com 2 a 20 caracteres.
- `username`: texto obrigatório com 4 a 20 caracteres.
- `password`: texto obrigatório, com senha forte, de até 20 caracteres.

**Resposta `201 Created`:**

O perfil é retornado no corpo e os tokens são gerenciados pela aplicação:

```json
{
  "profile": {
    "id": "uuid",
    "nickname": "Jogador",
    "username": "jogador123",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  },
  "access_token": "token-de-acesso"
}
```

O cookie `session_token` é criado como `HttpOnly`, `Secure`, `SameSite=None`
e não aparece no corpo da resposta.

#### `POST /player/login`

Autentica um jogador. Não envie uma conta já autenticada com o cookie
`session_token`.

**Corpo da requisição:**

```json
{
  "username": "jogador123",
  "password": "SenhaForte1!"
}
```

**Resposta `201 Created`:** possui o mesmo formato de `/player/register`,
incluindo o perfil, o `access_token` no corpo e o `session_token` em cookie.

#### `GET /player/refresh`

Renova a sessão usando o cookie `session_token`. O cookie deve ser enviado
com a requisição.

**Resposta `200 OK`:**

```json
{
  "profile": {
    "id": "uuid",
    "nickname": "Jogador",
    "username": "jogador123",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  },
  "access_token": "novo-token-de-acesso"
}
```

O cookie `session_token` anterior é invalidado, um novo é criado e enviado na
resposta.

#### `GET /player/logout`

Encerra a sessão atual, invalida o `session_token` quando ele estiver
presente e limpa o cookie.

**Resposta `204 No Content`:** não possui corpo.

### Lobby

#### `GET /lobby/messages`

Retorna as mensagens do lobby mais recentes primeiro. A rota recebe os
parâmetros de paginação no corpo JSON da requisição.

**Corpo da requisição (opcional):**

```json
{
  "skip": 0,
  "amount": 50
}
```

- `skip`: quantidade de mensagens a ignorar. Padrão: `0`.
- `amount`: quantidade máxima de mensagens retornadas. Padrão: `50`.

**Resposta `200 OK`:**

```json
[
  "[Jogador] - Olá!",
  "[OutroJogador] - Boa partida!"
]
```

## WebSocket

As mensagens e eventos WebSocket serão documentados em uma seção própria
posteriormente.
