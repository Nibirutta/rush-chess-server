import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
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
  OnMatchExpired,
  OnPlayerInCheck,
  OnThreefoldRepetition,
} from 'src/common/event/domain.events';
import { MakeMoveDTO, SearchMatchDTO, RequestDrawDTO } from '../dto/match.dto';
import { DrawType } from 'src/common/types/draw.types';

@WebSocketGateway({
  namespace: 'chess',
})
@UsePipes(new ValidationPipe(ValidationOptions))
@UseFilters(new WsDomainExceptionFilter())
export class ChessGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly chessService: ChessService) {}

  @SubscribeMessage(INCOMING_MESSAGES.TESTING)
  testing(@MessageBody() data: string) {
    return data;
  }

  @SubscribeMessage(INCOMING_MESSAGES.JOIN_MATCH)
  async joinMatch(
    @MessageBody() searchMatchDTO: SearchMatchDTO,
    @ConnectedSocket() client: Socket,
  ) {
    const matchID = searchMatchDTO.matchID;

    const isMatchActive = await this.chessService.loadMatchIfActive(matchID);

    if (!isMatchActive) {
      client.emit(OUTGOING_MESSAGES.NOTIFY_INVALID_MATCH);

      client.disconnect(true);

      return;
    }

    await client.join(matchID);

    await this.initiateMatchCountdown(matchID);
  }

  private async initiateMatchCountdown(matchID: string) {
    const countdownInMilliseconds = 3000;

    const amountOfPlayers = await this.getAmountOfConnectedSockets(matchID);

    if (amountOfPlayers == 2) {
      const startedMatch = this.chessService.startMatch(matchID);

      this.server.in(matchID).emit(OUTGOING_MESSAGES.NOTIFY_MATCH_COUNTDOWN, {
        countdownInMS: countdownInMilliseconds,
        matchData: startedMatch,
      });

      setTimeout(() => {
        this.server.in(matchID).emit(OUTGOING_MESSAGES.NOTIFY_START_MATCH);
      }, countdownInMilliseconds);
    }
  }

  private async getAmountOfConnectedSockets(room: string) {
    const connectedSockets = await this.server.in(room).fetchSockets();

    return connectedSockets.length;
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
  deleteExpiredRoom(payload: OnMatchExpired) {
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
}
