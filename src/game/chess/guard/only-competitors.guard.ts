import { Injectable, ExecutionContext, CanActivate } from '@nestjs/common';
import { MatchRepository } from '../match.repository';
import {
  BaseSocket,
  InteractionNotAllowedException,
  MatchNotFoundException,
} from '@app/common';

@Injectable()
export class OnlyCompetitorsGuard implements CanActivate {
  constructor(private readonly matchRepository: MatchRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<BaseSocket>();
    const { playerID } = client.data;
    const matchID = client.handshake.query.matchID as string;
    const foundMatch = await this.matchRepository.get(matchID);

    if (!foundMatch) {
      throw new MatchNotFoundException('Match not found');
    }

    const { playerWhiteID, playerBlackID } = foundMatch;
    const isCompetitor =
      playerBlackID === playerID || playerWhiteID === playerID;

    if (!isCompetitor) {
      throw new InteractionNotAllowedException('Interaction not allowed');
    }

    return true;
  }
}
