import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import {
  ValidationPipe,
  UsePipes,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { MatchService } from './match.service';
import { Server } from 'socket.io';
import {
  OnDomainEvents,
  DOMAIN_EVENTS_PATTERN,
  OnPlayerInCheck,
  WsDomainExceptionFilter,
  ValidationOptions,
  OnFinishedMatch,
  BaseSocket,
  MATCH_EVENTS,
  MATCH_MESSAGES,
  OngoingMatchData as OnMatchUpdate,
  MatchNamespace,
} from '@app/common';
import { MakeMoveDTO, AvailableMovesDTO } from '../dto/match.dto';
import { OnlyCompetitorsGuard } from './guard/only-competitors.guard';
import { PlayerTurnGuard } from './guard/player-turn.guard';
import { ExitMatchGuard } from './guard/exit-match.guard';

@WebSocketGateway({
  namespace: MatchNamespace,
})
@UsePipes(new ValidationPipe(ValidationOptions))
@UseFilters(new WsDomainExceptionFilter())
export class MatchGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly matchService: MatchService) {}

  async handleConnection(client: BaseSocket): Promise<void> {
    const matchID = client.handshake.query.matchID;
    const { playerID } = client.data;

    const ongoingMatch =
      typeof matchID === 'string'
        ? await this.matchService.connectToMatch(matchID, playerID)
        : undefined;

    if (!ongoingMatch) {
      client.emit(MATCH_EVENTS.INVALID_MATCH);

      client.disconnect();

      return;
    }

    await client.join(ongoingMatch.matchID);

    client.emit(MATCH_EVENTS.LOAD_MATCH, {
      match: ongoingMatch,
    });
  }

  async handleDisconnect(client: BaseSocket): Promise<void> {
    const matchID = client.handshake.query.matchID;
    const { playerID } = client.data;

    if (!(typeof matchID === 'string')) return;

    await this.matchService.disconnectFromMatch(matchID, playerID);
  }

  @SubscribeMessage(MATCH_MESSAGES.GET_AVAILABLE_MOVES)
  async getAvailableMoves(
    @ConnectedSocket() client: BaseSocket,
    @MessageBody() availableMovesDTO: AvailableMovesDTO,
  ): Promise<void> {
    const matchID = client.handshake.query.matchID as string;
    const { piecePosition } = availableMovesDTO;

    const availableMoves = await this.matchService.getAvailableMoves(
      matchID,
      piecePosition,
    );

    client.emit(MATCH_EVENTS.AVAILABLE_MOVES, availableMoves);
  }

  @UseGuards(PlayerTurnGuard)
  @SubscribeMessage(MATCH_MESSAGES.MAKE_MOVE)
  async makeMove(
    @ConnectedSocket() client: BaseSocket,
    @MessageBody() makeMoveDTO: MakeMoveDTO,
  ) {
    const matchID = client.handshake.query.matchID as string;
    const { from, to, promotion } = makeMoveDTO;

    await this.matchService.makeMove(matchID, from, to, promotion);
  }

  @UseGuards(OnlyCompetitorsGuard)
  @SubscribeMessage(MATCH_MESSAGES.REQUEST_DRAW)
  async requestDraw(@ConnectedSocket() client: BaseSocket) {
    const matchID = client.handshake.query.matchID as string;

    await this.matchService.requestDraw(matchID);
  }

  @UseGuards(OnlyCompetitorsGuard)
  @SubscribeMessage(MATCH_MESSAGES.REQUEST_SURRENDER)
  async requestSurrender(@ConnectedSocket() client: BaseSocket) {
    const matchID = client.handshake.query.matchID as string;
    const { playerID } = client.data;

    await this.matchService.requestSurrender(matchID, playerID);
  }

  @UseGuards(ExitMatchGuard)
  @SubscribeMessage(MATCH_MESSAGES.LEAVE_MATCH)
  requestLeave(@ConnectedSocket() client: BaseSocket) {
    client.disconnect();
  }

  // Events

  @OnDomainEvents(DOMAIN_EVENTS_PATTERN.ON_MATCH_UPDATE)
  notifyUpdatedMatch(payload: OnMatchUpdate) {
    const { matchID } = payload;

    this.server.in(matchID).emit(MATCH_EVENTS.MATCH_UPDATE, payload);
  }

  @OnDomainEvents(DOMAIN_EVENTS_PATTERN.ON_FINISHED_MATCH)
  notifyFinishedMatch(payload: OnFinishedMatch) {
    const { matchID } = payload;

    this.server.in(matchID).emit(MATCH_EVENTS.FINISHED_MATCH, {
      payload,
    });

    this.server.in(matchID).disconnectSockets();
  }

  @OnDomainEvents(DOMAIN_EVENTS_PATTERN.ON_PLAYER_IN_CHECK)
  notifyPlayerInCheck(payload: OnPlayerInCheck) {
    const { matchID, attackers } = payload;

    this.server.in(matchID).emit(MATCH_EVENTS.PLAYER_IN_CHECK, attackers);
  }
}
