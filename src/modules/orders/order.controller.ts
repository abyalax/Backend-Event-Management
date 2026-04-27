import { Controller, Get, Post, Body, Param, HttpCode, HttpStatus, UseGuards, Request, Query } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { OrderStatusResponseDto } from './dto/order-status-response.dto';
import { BuyTicketDto } from '../tickets/dto/buy-ticket.dto';
import { JwtGuard } from '~/common/guards/jwt.guard';
import '~/common/types/global';
import { TResponse } from '~/common/types/response';
import { QueryUserOrdersDto } from './dto/query-user-orders.dto';
import { Paginated } from '~/common/types/meta';

@Controller('orders')
@UseGuards(JwtGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createOrder(@Body() createOrderDto: CreateOrderDto, @Request() req: Request): Promise<OrderResponseDto> {
    const userId = req.user.id;
    const userEmail = req.user.email;
    return await this.orderService.createOrder(createOrderDto, userId, userEmail);
  }

  @Get(':id')
  async getOrderById(@Param('id') id: string, @Request() req: Request): Promise<OrderResponseDto> {
    const userId = req.user.id;
    return this.orderService.getOrderById(id, userId);
  }

  @Get(':id/status')
  async getOrderStatus(@Param('id') id: string, @Request() req: Request): Promise<OrderStatusResponseDto> {
    const userId = req.user.id;
    return this.orderService.getOrderStatus(id, userId);
  }

  @Get(':id/tickets')
  async getOrderTickets(@Param('id') id: string, @Request() req: Request) {
    const userId = req.user.id;
    return this.orderService.getOrderTickets(id, userId);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelOrder(@Param('id') id: string, @Request() req: Request): Promise<OrderResponseDto> {
    const userId = req.user.id;
    return this.orderService.cancelOrder(id, userId);
  }

  @Get('user/my-orders')
  async getUserOrders(@Request() req: Request, @Query() query: QueryUserOrdersDto): Promise<TResponse<Paginated<OrderResponseDto>>> {
    const userId = req.user.id;
    const data = await this.orderService.getUserOrders(userId, query);
    return {
      message: 'get user orders successfully',
      data,
    };
  }

  @Post('buy-ticket')
  @HttpCode(HttpStatus.CREATED)
  async buyTicket(@Body() buyTicketDto: BuyTicketDto, @Request() req: Request): Promise<TResponse<OrderResponseDto>> {
    const userId = req.user.id;
    const userEmail = req.user.email;

    // Convert BuyTicketDto to CreateOrderDto format
    const createOrderDto = {
      eventId: buyTicketDto.eventId,
      items: [
        {
          ticketId: buyTicketDto.ticketId,
          quantity: buyTicketDto.quantity,
        },
      ],
      description: buyTicketDto.description || `Purchase ticket: ${buyTicketDto.ticketId}`,
      successRedirectUrl: buyTicketDto.successRedirectUrl,
      failureRedirectUrl: buyTicketDto.failureRedirectUrl,
    };

    const data = await this.orderService.createOrder(createOrderDto, userId, userEmail);
    return {
      message: 'buy ticket succesfully',
      data,
    };
  }
}
