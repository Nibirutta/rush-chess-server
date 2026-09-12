import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { MatchRepository } from '../match.repository';
import { BaseSocket, InteractionNotAllowedException } from '@app/common';

@Injectable()
export class ExitMatchGuard implements CanActivate {
  constructor(private readonly matchRepository: MatchRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<BaseSocket>();
    const { playerID } = client.data;
    const matchID = client.handshake.query.matchID as string;

    const ongoingMatch = await this.matchRepository.get(matchID);

    if (!ongoingMatch) {
      return true;
    }

    const { playerWhiteID, playerBlackID } = ongoingMatch;

    if (playerWhiteID === playerID || playerBlackID === playerID)
      throw new InteractionNotAllowedException(
        'Match ongoing, try surrender instead',
      );

    return true;
  }
}
