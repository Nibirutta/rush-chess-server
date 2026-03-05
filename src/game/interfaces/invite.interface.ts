export interface InviteSession {
  timeout: NodeJS.Timeout;
  challengerID: string;
  opponentID: string;
}
