import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
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
  OnMatchAbandoned,
  OnMatchStartOrRestart as OnMatchStart,
  OnOpponentDisconnection,
  OnPlayerInCheck,
  OnThreefoldRepetition,
  OnMatchExpired,
} from 'src/common/event/domain.events';
import {
  MakeMoveDTO,
  RequestDrawDTO,
  AvailableMovesDTO,
  RequestSurrenderDTO,
} from '../dto/match.dto';
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

    const matchData =
      typeof matchID === 'string'
        ? await this.chessService.connectToMatch(matchID, playerData.ID)
        : undefined;

    if (!matchData) {
      client.emit(OUTGOING_MESSAGES.NOTIFY_INVALID_MATCH);

      client.disconnect();

      return;
    }

    await client.join(matchData.ongoingMatch.matchID);

    client.emit(OUTGOING_MESSAGES.NOTIFY_LOAD_MATCH, {
      match: matchData,
    });
  }

  handleDisconnect(client: Socket) {
    const matchID = client.handshake.query.matchID;
    const playerData = client.data as PlayerSocketData;

    if (!(typeof matchID === 'string')) return;

    this.chessService.disconnectFromMatch(matchID, playerData.ID);
  }

  @SubscribeMessage(INCOMING_MESSAGES.GET_AVAILABLE_MOVES)
  getAvailableMoves(
    @ConnectedSocket() client: Socket,
    @MessageBody() availableMovesDTO: AvailableMovesDTO,
  ) {
    const availableMoves = this.chessService.getAvailableMoves(
      availableMovesDTO.matchID,
      availableMovesDTO.piecePosition,
    );

    client.emit(OUTGOING_MESSAGES.NOTIFY_AVAILABLE_MOVES, availableMoves);
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
  async requestDraw(@MessageBody() requestDrawDTO: RequestDrawDTO) {
    const matchID = requestDrawDTO.matchID;
    const drawBy: DrawType = 'Draw by threefold repetition';

    await this.chessService.requestDraw(matchID);

    this.server.to(matchID).emit(OUTGOING_MESSAGES.NOTIFY_DRAW, {
      drawBy: drawBy,
    });
  }

  @SubscribeMessage(INCOMING_MESSAGES.REQUEST_SURRENDER)
  async requestSurrender(
    @MessageBody() requestSurrenderDTO: RequestSurrenderDTO,
    @ConnectedSocket() client: Socket,
  ) {
    const playerData = client.data as PlayerSocketData;
    const matchID = requestSurrenderDTO.matchID;

    const updatedMatch = await this.chessService.requestSurrender(
      matchID,
      playerData.ID,
    );

    this.server.to(matchID).emit(OUTGOING_MESSAGES.NOTIFY_SURRENDER, {
      winner: updatedMatch.winnerID,
      loser: updatedMatch.loserID,
    });
  }

  @SubscribeMessage(INCOMING_MESSAGES.LEAVE_MATCH)
  requestLeave(@ConnectedSocket() client: Socket) {
    const matchID = client.handshake.query.matchID;
    const playerData = client.data as PlayerSocketData;

    const canLeave =
      typeof matchID === 'string'
        ? this.chessService.canLeave(matchID, playerData.ID)
        : true;

    if (canLeave) {
      client.disconnect();
    }

    client.emit(OUTGOING_MESSAGES.NOTIFY_CAN_NOT_LEAVE_FROM_ONGOING_MATCH);
  }

  // Events

  @OnDomainEvents(DOMAIN_EVENTS_PATTERN.ON_MATCH_EXPIRED)
  notifyMissingOpponent(payload: OnMatchExpired) {
    this.server.in(payload.matchID);
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
  notifyStartMatch(payload: OnMatchStart) {
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
  notifyMatchRestart(payload: OnMatchStart) {
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
  notifyAbandonedMatch(payload: OnMatchAbandoned) {
    this.server
      .in(payload.matchID)
      .emit(OUTGOING_MESSAGES.NOTIFY_MATCH_ABANDONED);
  }
}
