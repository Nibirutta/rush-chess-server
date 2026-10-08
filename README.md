# Rush Chess Server

API do servidor do Rush Chess.

## Endereço da aplicação

```text
https://rushserver.nibirutta.me
```

## Rotas HTTP

As rotas abaixo não incluem um prefixo global. Por padrão, a aplicação escuta
em `https://rushserver.nibirutta.me` e aceita credenciais (cookies) nas
requisições.

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

A aplicação utiliza [Socket.IO](https://socket.io/) para as conexões
WebSocket. Os namespaces disponíveis são:

- `https://rushserver.nibirutta.me/lobby`
- `https://rushserver.nibirutta.me/match`

As conexões são autenticadas antes de serem estabelecidas. Envie o token de
acesso em `auth.access_token` (ou no parâmetro de query `access_token`) e o
cookie `session_token` nas credenciais da conexão. Os dois tokens precisam
pertencer ao mesmo jogador.

Exemplo de conexão:

```ts
import { io } from "socket.io-client";

const socket = io("https://rushserver.nibirutta.me/lobby", {
  withCredentials: true,
  auth: {
    access_token: "token-de-acesso"
  }
});
```

### Namespace `/lobby`

#### Mensagens enviadas pelo cliente

##### `send_message`

Envia uma mensagem para o lobby. O conteúdo deve ser um texto obrigatório com
no máximo 200 caracteres.

```json
{
  "content": "Boa partida!"
}
```

##### `send_invite`

Convida um jogador online para uma partida.

```json
{
  "opponentID": "uuid-do-oponente"
}
```

##### `invite_response`

Aceita ou recusa um convite recebido.

```json
{
  "inviteID": "uuid-do-convite",
  "accepted": true
}
```

##### `set_player_status`

Atualiza o status de disponibilidade do jogador. Com `ready: true`, o
jogador fica pronto para receber convites; com `ready: false`, fica indisponível.

```json
{
  "ready": true
}
```

#### Eventos recebidos pelo cliente

##### `notify_online_players`

Emitido na conexão e sempre que um jogador entra ou sai do lobby. O payload é
uma lista de jogadores online:

```json
[
  {
    "playerID": "uuid",
    "socketID": "socket-id",
    "nickname": "Jogador",
    "status": "Ready"
  }
]
```

Os valores possíveis de `status` são `READY`, `NOT_READY`, `AWAITING` e
`ON_BATTLE`.

##### `notify_message`

Emitido para todos os jogadores quando uma mensagem é criada:

```json
{
  "message": "[Jogador] - Boa partida!"
}
```

##### `notify_invite`

Enviado somente ao oponente convidado:

```json
{
  "inviteID": "uuid-do-convite",
  "challenger": "Nickname do desafiante"
}
```

##### `notify_invite_accepted`

Enviado aos participantes do convite quando ele é aceito:

```json
{
  "matchID": "uuid-da-partida"
}
```

##### `notify_invite_not_accepted`

Enviado aos participantes do convite quando ele é recusado. Esse evento não
possui payload.

##### `notify_invite_expired`

Enviado aos participantes quando o convite expira:

```json
{
  "message": "Invite expired"
}
```

##### `notify_player_update`

Emitido quando o status de um jogador muda:

```json
{
  "playerID": "uuid",
  "status": "READY"
}
```

### Namespace `/match`

Para conectar a uma partida, informe o identificador na query string
`matchID`:

```ts
const socket = io("https://rushserver.nibirutta.me/match", {
  withCredentials: true,
  query: {
    matchID: "uuid-da-partida"
  },
  auth: {
    access_token: "token-de-acesso"
  }
});
```

#### Mensagens enviadas pelo cliente

##### `get_available_moves`

Solicita os movimentos disponíveis para uma peça. `piecePosition` deve ser
uma casa válida do tabuleiro.

```json
{
  "piecePosition": "e2"
}
```

##### `make_move`

Realiza um movimento. `promotion` é opcional e deve ser usado quando houver
promoção de peão.

```json
{
  "from": "e2",
  "to": "e4",
  "promotion": "q"
}
```

##### `request_draw`

Solicita o empate quando a regra de três repetições estiver disponível. Não
possui payload.

##### `request_surrender`

Solicita a rendição do jogador. Não possui payload.

##### `leave_match`

Encerra a conexão do jogador com a partida, mas funciona somente se o jogador não estiver como participante ativo da partida. Não possui payload.

#### Eventos recebidos pelo cliente

##### `notify_load_match`

Enviado ao conectar com sucesso à partida:

```json
{
  "matchID": "uuid-da-partida",
  "matchState": "started",
  "turn": "w",
  "fenHistory": ["posição-FEN"],
  "playerWhiteID": "uuid-do-jogador-de-brancas",
  "isWhiteConnected": true,
  "playerBlackID": "uuid-do-jogador-de-pretas",
  "isBlackConnected": true,
  "spectators": [],
  "drawAvailable": false
}
```

`matchState` pode ser `waiting` ou `started`, e `turn` pode ser `w` ou `b`.

##### `notify_match_update`

Emitido aos participantes e espectadores quando o estado da partida é
atualizado. O payload possui o mesmo formato do objeto `match` acima.

##### `notify_available_moves`

Retorna a lista de movimentos disponíveis para a casa solicitada:

```json
["e3", "e4"]
```

##### `notify_player_in_check`

Retorna as casas das peças que estão atacando o rei em xeque:

```json
["d5", "f5"]
```

##### `notify_finished_match`

Notifica o encerramento da partida. O resultado é enviado dentro do campo
`payload`:

```json
{
  "payload": {
    "matchID": "uuid-da-partida",
    "reason": "Checkmate",
    "playerIDs": ["uuid-do-jogador-1", "uuid-do-jogador-2"],
    "winnerID": "uuid-do-vencedor",
    "loserID": "uuid-do-perdedor"
  }
}
```

`reason` pode ser `Abandoned`, `Expired`, `Draw`, `Checkmate` ou
`Surrendered`. Em empates, o payload também pode conter `drawType`, com
valores como `Draw by fifty moves`, `Draw by insufficient materials`,
`Draw by stalemate` ou `Draw by threefold repetition`.

##### `notify_invalid_match`

Emitido quando a partida não existe ou não pode ser acessada. Depois desse
evento, o servidor encerra a conexão. Esse evento não possui payload.

### Erros

Erros de domínio são enviados ao socket pelo evento `notify_exception`:

```json
{
  "message": "Mensagem do erro",
  "error": "NomeDoErro",
  "timestamp": "2026-01-01T00:00:00.000Z",
  "details": []
}
```

O campo `details` é opcional e aparece quando o erro contém informações
adicionais de validação.
