# Event Management System Business Models

## Business Context Overview

This project is a comprehensive event management platform built with NestJS that enables event organizers to create and manage events while allowing users to discover and purchase tickets. The platform supports both virtual and physical events with complete order processing, payment handling, and ticket generation capabilities.

## Core Business Models

### 1. User Management

**Purpose**: Handle user authentication and authorization

- **User Entity**: Core user profiles with authentication (UUID primary key)
- **Role Entity**: Define user roles (ADMIN, USER) - auto-increment integer ID
- **Permission Entity**: Granular permissions for RBAC - auto-increment integer ID
- **Role-Permission Mapping**: Many-to-many relationship for flexible authorization

### 2. Event Management

**Purpose**: Event creation, categorization, and management

- **Event Entity**: Core event information (title, description, dates, location, capacity, virtual/physical)
- **Event Category Entity**: Event categorization system - auto-increment integer ID
- **Event Media Entity**: Event images and promotional materials

### 3. Ticket System

**Purpose**: Ticket creation, pricing, and inventory management

- **Ticket Entity**: Ticket types with pricing and quota limits (UUID primary key)
- **Generated Event Ticket Entity**: Individual ticket instances with QR codes

### 4. Order Processing

**Purpose**: Handle ticket purchases and order management

- **Order Entity**: Customer orders with total amounts and status tracking (UUID primary key)
- **Order Item Entity**: Line items connecting orders to specific tickets

### 5. Payment Processing

**Purpose**: Manage payment transactions and status

- **Payment Entity**: Payment records with external payment gateway integration (xendit)

### 6. Notification System

**Purpose**: Handle user communications and alerts

- **Notification Entity**: System notifications for various user interactions

## Business Flow

1. **Event Creation**: Admin creates events with ticket types and pricing
2. **Event Discovery**: Users browse and search for events
3. **Ticket Purchase**: Users select tickets and complete checkout process
4. **Order Processing**: System creates orders and processes payments
5. **Ticket Generation**: System generates QR-coded tickets upon successful payment
6. **Event Management**: Admin monitors attendance and manages event logistics

## Key Features

- **Role-Based Access Control**: Admin and user roles with specific permissions
- **Multi-Event Support**: Handle concurrent events with different ticket types
- **Payment Integration**: External payment gateway connectivity
- **Ticket Generation**: QR code and PDF ticket creation
- **Media Management**: Event image and promotional material handling
- **Notification System**: Real-time user notifications
- **Background Jobs**: Queue-based processing for heavy operations

## Data Relationships

- Users have many-to-many relationship with Roles
- Events belong to Event Categories
- Events have multiple Ticket types
- Orders contain multiple Order Items
- Orders have multiple Payment attempts
- Tickets generate multiple Individual Ticket instances
- Events can have multiple Media files

## Business Rules

- Events must have valid date ranges and location information
- Tickets have limited quotas and track sold quantities
- Orders have expiration times for payment completion
- Users must have appropriate roles to perform actions
- All entities maintain audit trails (created/updated/deleted timestamps)

## Technical Architecture

- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with TypeORM
- **Caching**: Redis for performance optimization
- **Queue System**: BullMQ for background job processing
- **File Storage**: MinIO for media and ticket files
- **Authentication**: JWT with HTTP-only cookies

## Core Actors

- **ADMIN**: manages master data such as events, orders, tickets, and users
- **USER**: browses events and purchases tickets

## Ticket Purchase Flow Implementation Plan

### Core Flow Architecture

**User selects ticket → Order creation (PENDING) → Seat/quota lock with TTL → Xendit invoice generation → Payment completion → Webhook processing → Order validation → Ticket generation**

### Implementation Components

#### 1. Order Status Management

- **Order Status Enum**: `PENDING`, `PAID`, `EXPIRED`, `CANCELLED`
- **TTL Mechanism**: 10-15 minute expiration for pending orders
- **Status Transition Validation**: Ensure proper state changes

#### 2. Seat/Quota Locking System

- **Redis-based Distributed Locking**: Handle concurrent ticket selection
- **Atomic Quota Management**: Decrement with rollback capability
- **Lock Expiration**: Tied to order TTL for automatic release

#### 3. Xendit Integration

- **Invoice Generation Service**: Create invoices with `external_id = order_id`
- **Webhook Handler**: Process payment status updates from Xendit
- **Payment Validation**: Verify webhook authenticity and prevent fraud

#### 4. Background Processing

- **Order Validation Worker**: Process webhook updates and validate orders
- **Expiration Worker**: Automatically release expired seats/quota
- **Ticket Generation Queue**: Generate QR codes and PDFs post-payment

#### 5. API Endpoints

- `POST /orders` - Create order with ticket selection
- `GET /orders/:id/status` - Check order status
- `POST /payments/webhook` - Xendit webhook handler
- `GET /orders/:id/tickets` - Retrieve generated tickets (post-payment)

### Technical Implementation Details

#### Database Schema Enhancements

- Add order status enum validation
- Ensure proper indexing for webhook lookups
- Add audit fields for payment processing

#### Redis Caching Strategy

- Lock keys: `ticket_lock:{ticket_id}:{order_id}`
- Quota tracking: `ticket_quota:{ticket_id}`
- Order expiration: `order_expire:{order_id}`

#### Error Handling

- Concurrent selection conflicts
- Payment webhook validation failures
- Ticket generation failures
- Order expiration edge cases

### Implementation Priority

**High Priority:**

1. Order status enum and TTL mechanism
2. Redis-based seat locking
3. Xendit integration services
4. Webhook handler and validation worker

**Medium Priority:** 5. Ticket generation service 6. Order expiration worker 7. API endpoints 8. Comprehensive error handling

**Low Priority:** 9. Integration tests 10. Performance optimization

### Business Rules for Order Processing

- Orders must be created with `PENDING` status
- Ticket quotas are locked immediately upon order creation
- Orders expire after 15 minutes if unpaid
- Tickets are only generated after successful payment validation
- Expired orders automatically release locked quotas
- All payment processing must be validated through webhooks
- Generated tickets include QR codes and PDF downloads
