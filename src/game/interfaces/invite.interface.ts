export interface InviteSession {
  timeout: NodeJS.Timeout;
  challengerID: string;
  opponentID: string;
}

export interface InviteTicket {
  waitRoomID: string;
  opponentSocketID: string;
}
