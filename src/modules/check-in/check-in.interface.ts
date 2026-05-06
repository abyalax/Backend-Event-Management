export class CheckInResponse {
  status: 'VALID' | 'ALREADY_USED' | 'INVALID';
  valid: boolean;
  ticketId?: string;
  eventId?: string;
}
