export class CheckInResponseDto {
  status: 'VALID' | 'ALREADY_USED' | 'INVALID';
  valid: boolean;
  ticketId?: string;
  eventId?: string;
}
