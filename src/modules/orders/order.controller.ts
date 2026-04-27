import { Controller, Get, Post, Body, Param, HttpCode, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { OrderStatusResponseDto } from './dto/order-status-response.dto';
import { JwtGuard } from '~/common/guards/jwt.guard';

@ApiTags('orders')
@Controller('orders')
@UseGuards(JwtGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new order with ticket selection' })
  @ApiResponse({ status: 201, description: 'Order created successfully', type: OrderResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Ticket not found or insufficient quota' })
  async createOrder(@Body() createOrderDto: CreateOrderDto, @Request() req: any): Promise<OrderResponseDto> {
    const userId = req.user.id;
    const userEmail = req.user.email;
    return this.orderService.createOrder(createOrderDto, userId, userEmail);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order details by ID' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order details retrieved successfully', type: OrderResponseDto })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getOrderById(@Param('id') id: string, @Request() req: any): Promise<OrderResponseDto> {
    const userId = req.user.id;
    return this.orderService.getOrderById(id, userId);
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Check order status' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order status retrieved successfully', type: OrderStatusResponseDto })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getOrderStatus(@Param('id') id: string, @Request() req: any): Promise<OrderStatusResponseDto> {
    const userId = req.user.id;
    return this.orderService.getOrderStatus(id, userId);
  }

  @Get(':id/tickets')
  @ApiOperation({ summary: 'Retrieve generated tickets for a paid order' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Tickets retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Order not found or not paid' })
  async getOrderTickets(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.id;
    return this.orderService.getOrderTickets(id, userId);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a pending order' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Order cannot be cancelled' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async cancelOrder(@Param('id') id: string, @Request() req: any): Promise<OrderResponseDto> {
    const userId = req.user.id;
    return this.orderService.cancelOrder(id, userId);
  }

  @Get('user/my-orders')
  @ApiOperation({ summary: 'Get all orders for the current user' })
  @ApiResponse({ status: 200, description: 'User orders retrieved successfully', type: [OrderResponseDto] })
  async getUserOrders(@Request() req: any): Promise<OrderResponseDto[]> {
    const userId = req.user.id;
    return this.orderService.getUserOrders(userId);
  }
}
