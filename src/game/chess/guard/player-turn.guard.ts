import {
  BaseSocket,
  InteractionNotAllowedException,
  MatchNotFoundException,
} from '@app/common';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { MatchRepository } from '../match.repository';

@Injectable()
export class PlayerTurnGuard implements CanActivate {
  constructor(private readonly matchRepository: MatchRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<BaseSocket>();
    const { playerID } = client.data;
    const matchID = client.handshake.query.matchID as string;

    const foundMatch = await this.matchRepository.get(matchID);

    if (!foundMatch) {
      throw new MatchNotFoundException('Match not found');
    }

    const canMakeAMove =
      foundMatch.turn === 'w'
        ? playerID === foundMatch.playerWhiteID
          ? true
          : false
        : playerID === foundMatch.playerBlackID
          ? true
          : false;

    if (!canMakeAMove) {
      throw new InteractionNotAllowedException('Interaction not allowed');
    }

    return true;
  }
}
