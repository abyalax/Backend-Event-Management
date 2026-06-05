import { toPlainText } from '@react-email/render';
import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import EventCreatedEmail, { type EventCreatedEmailProps } from './event-created.email';
import EventReminderEmail, { type EventReminderEmailProps } from './event-reminder.email';
import OrderTicketsReadyEmail, { type OrderTicketsReadyEmailProps } from './order-tickets-ready.email';
import PaymentConfirmedEmail, { type PaymentConfirmedEmailProps } from './payment-confirmed.email';
import PaymentExpiredEmail, { type PaymentExpiredEmailProps } from './payment-expired.email';
import TicketReadyEmail, { type TicketReadyEmailProps } from './ticket-ready.email';

export type EmailTemplatePropsMap = {
  'event-created': EventCreatedEmailProps;
  'event-reminder': EventReminderEmailProps;
  'order-tickets-ready': OrderTicketsReadyEmailProps;
  'payment-confirmed': PaymentConfirmedEmailProps;
  'payment-expired': PaymentExpiredEmailProps;
  'ticket-ready': TicketReadyEmailProps;
};

export type EmailTemplateName = keyof EmailTemplatePropsMap;

type EmailComponent<T extends EmailTemplateName> = (props: EmailTemplatePropsMap[T]) => ReactElement;

const templates: { [T in EmailTemplateName]: EmailComponent<T> } = {
  'event-created': EventCreatedEmail,
  'event-reminder': EventReminderEmail,
  'order-tickets-ready': OrderTicketsReadyEmail,
  'payment-confirmed': PaymentConfirmedEmail,
  'payment-expired': PaymentExpiredEmail,
  'ticket-ready': TicketReadyEmail,
};

export interface RenderedEmail {
  html: string;
  text: string;
}

export function renderEmailTemplate<T extends EmailTemplateName>(template: T, props: EmailTemplatePropsMap[T]): RenderedEmail {
  const component = templates[template];
  const element = createElement(component, props);
  const markup = renderToStaticMarkup(element);
  const html = `<!DOCTYPE html>${markup}`;

  return {
    html,
    text: toPlainText(html),
  };
}
