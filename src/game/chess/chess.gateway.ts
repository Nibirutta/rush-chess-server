import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { ValidationPipe, UsePipes, UseFilters } from '@nestjs/common';
import { ValidationOptions } from 'src/common/options/validation.options';
import {
  INCOMING_MESSAGES,
  OUTGOING_MESSAGES,
} from '../messages/messages.pattern';
import { ChessService } from './chess.service';
import { Server, Socket } from 'socket.io';
import { WsDomainExceptionFilter } from 'src/common/filters/ws-domain-exception.filter';
import { OnDomainEvents } from 'src/common/event/on-domain-events.decorator';
import { DOMAIN_EVENTS_PATTERN } from 'src/common/event/domain-events.pattern';
import {
  OnCheckmate,
  OnDraw,
  OnMatchTerminated,
  OnMatchStartOrRestart,
  OnOpponentDisconnection,
  OnPlayerInCheck,
  OnThreefoldRepetition,
} from 'src/common/event/domain.events';
import { MakeMoveDTO, RequestDrawDTO } from '../dto/match.dto';
import { DrawType } from 'src/common/types/draw.types';
import { PlayerSocketData } from 'src/common/interfaces/socket-data.interface';

@WebSocketGateway({
  namespace: 'chess',
})
@UsePipes(new ValidationPipe(ValidationOptions))
@UseFilters(new WsDomainExceptionFilter())
export class ChessGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly chessService: ChessService) {}

  async handleConnection(client: Socket) {
    const matchID = client.handshake.query.matchID;
    const playerData = client.data as PlayerSocketData;

    const ongoingMatch =
      typeof matchID === 'string'
        ? await this.chessService.connectToMatch(matchID, playerData.ID)
        : undefined;

    if (!ongoingMatch) {
      client.emit(OUTGOING_MESSAGES.NOTIFY_INVALID_MATCH);

      client.disconnect(true);

      return;
    }

    await client.join(ongoingMatch.matchID);

    client.emit(OUTGOING_MESSAGES.NOTIFY_LOAD_MATCH, {
      match: ongoingMatch,
    });
  }

  async handleDisconnect(client: Socket) {
    const matchID = client.handshake.query.matchID;
    const playerData = client.data as PlayerSocketData;

    if (!(typeof matchID === 'string')) return;

    await this.chessService.disconnectFromMatch(matchID, playerData.ID);
  }

  @SubscribeMessage(INCOMING_MESSAGES.TESTING)
  testing(@MessageBody() data: string) {
    return data;
  }

  @SubscribeMessage(INCOMING_MESSAGES.MAKE_MOVE)
  async makeMove(@MessageBody() makeMoveDTO: MakeMoveDTO) {
    const { matchID, from, to, promotion } = makeMoveDTO;

    const newMatchData = await this.chessService.makeMove(
      matchID,
      from,
      to,
      promotion,
    );

    this.server.to(matchID).emit(OUTGOING_MESSAGES.NOTIFY_NEW_MATCH_STATE, {
      matchData: newMatchData,
    });

    this.chessService.verifyMatchCurrentState(newMatchData);
  }

  @SubscribeMessage(INCOMING_MESSAGES.REQUEST_DRAW)
  requestDraw(@MessageBody() requestDrawDTO: RequestDrawDTO) {
    const matchID = requestDrawDTO.matchID;
    const drawBy: DrawType = 'Draw by threefold repetition';

    this.chessService.requestDraw(matchID);

    this.server.to(matchID).emit(OUTGOING_MESSAGES.NOTIFY_DRAW, {
      drawBy: drawBy,
    });
  }

  // Events

  @OnDomainEvents(DOMAIN_EVENTS_PATTERN.ON_MATCH_EXPIRED)
  deleteExpiredMatch(payload: OnMatchTerminated) {
    this.server.in(payload.matchID).disconnectSockets();
  }

  @OnDomainEvents(DOMAIN_EVENTS_PATTERN.ON_PLAYER_IN_CHECK)
  notifyPlayerInCheck(payload: OnPlayerInCheck) {
    this.server
      .to(payload.playerID)
      .emit(OUTGOING_MESSAGES.NOTIFY_PLAYER_IN_CHECK);
  }

  @OnDomainEvents(DOMAIN_EVENTS_PATTERN.ON_THREEFOLD_REPETITION)
  notifyThreefoldRepetition(payload: OnThreefoldRepetition) {
    this.server
      .in(payload.matchID)
      .emit(OUTGOING_MESSAGES.NOTIFY_DRAW_CLAIM_AVAILABLE);
  }

  @OnDomainEvents(DOMAIN_EVENTS_PATTERN.ON_DRAW)
  notifyDraw(payload: OnDraw) {
    this.server.in(payload.matchID).emit(OUTGOING_MESSAGES.NOTIFY_DRAW, {
      drawBy: payload.drawType,
    });
  }

  @OnDomainEvents(DOMAIN_EVENTS_PATTERN.ON_CHECKMATE)
  notifyCheckmate(payload: OnCheckmate) {
    this.server.in(payload.matchID).emit(OUTGOING_MESSAGES.NOTIFY_CHECKMATE, {
      winner: payload.winnerID,
      loser: payload.loserID,
    });
  }

  @OnDomainEvents(DOMAIN_EVENTS_PATTERN.ON_MATCH_START)
  notifyStartMatch(payload: OnMatchStartOrRestart) {
    const countdownInMilliseconds = 3000;

    this.server
      .in(payload.matchID)
      .emit(OUTGOING_MESSAGES.NOTIFY_MATCH_COUNTDOWN, {
        countdownInMS: countdownInMilliseconds,
      });

    setTimeout(() => {
      this.server
        .in(payload.matchID)
        .emit(OUTGOING_MESSAGES.NOTIFY_START_MATCH);
    }, countdownInMilliseconds);
  }

  @OnDomainEvents(DOMAIN_EVENTS_PATTERN.ON_MATCH_RESTART)
  notifyMatchRestart(payload: OnMatchStartOrRestart) {
    this.server
      .in(payload.matchID)
      .emit(OUTGOING_MESSAGES.NOTIFY_RESTART_MATCH);
  }

  @OnDomainEvents(DOMAIN_EVENTS_PATTERN.ON_OPPONENT_DISCONNECTION)
  notifyOpponentDisconnection(payload: OnOpponentDisconnection) {
    this.server
      .in(payload.matchID)
      .emit(OUTGOING_MESSAGES.NOTIFY_OPPONENT_DISCONNECTION, {
        playerDisconnected: payload.disconnectedPlayer,
      });
  }

  @OnDomainEvents(DOMAIN_EVENTS_PATTERN.ON_MATCH_ABANDONED)
  notifyAbandonedMatch(payload: OnMatchTerminated) {
    this.server
      .in(payload.matchID)
      .emit(OUTGOING_MESSAGES.NOTIFY_MATCH_ABANDONED);
  }
}
