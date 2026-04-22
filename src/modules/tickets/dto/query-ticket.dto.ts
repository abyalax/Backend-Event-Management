import { Exclude } from 'class-transformer';
import { MetaRequestDto } from '~/common/dto/meta-request.dto';

@Exclude()
export class QueryTicketDto extends MetaRequestDto {}
