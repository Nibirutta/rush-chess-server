export interface InviteSession {
  inviteID: string;
  challengerID: string;
  opponentID: string;
}

export interface InviteTicket {
  inviteID: string;
  challengerNickname: string;
  opponentSocketID: string;
}
