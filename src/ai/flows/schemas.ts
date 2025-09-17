
// src/ai/flows/schemas.ts
import { z } from 'zod';

export const AddInteractionSchema = z.object({
  accountName: z.string().describe('The exact name of the customer account.'),
  kind: z.enum(['VISITA', 'LLAMADA', 'EMAIL', 'WHATSAPP', 'OTRO']).describe('The type of interaction.'),
  note: z.string().describe('A summary of what was discussed or what happened during the interaction.'),
});

export const CreateOrderSchema = z.object({
  accountName: z.string().describe('The exact name of the customer account.'),
  items: z.array(z.object({
    sku: z.string().optional().describe("The SKU of the product. If not specified, it will default to Santa Brisa's main product."),
    quantity: z.number().describe('The quantity of units.'),
    unit: z.literal('uds').describe("The unit of measure, which is always 'uds' (units/bottles)."),
  })).describe('A list of products and quantities for the order.'),
  notes: z.string().optional().describe('Additional notes for the order.'),
});

export const ScheduleEventSchema = z.object({
  title: z.string().describe('The title of the event.'),
  kind: z.enum(['DEMO', 'FERIA', 'FORMACION', 'POPUP', 'OTRO']).describe('The type of event.'),
  startAt: z.string().describe('The start date and time in ISO 8601 format.'),
  location: z.string().optional().describe('The city or venue of the event.'),
});

export const UpsertAccountSchema = z.object({
    id: z.string().optional().describe("The account's unique ID. If provided, the existing account will be updated. If not, a new one will be created."),
    name: z.string().describe("The account's name."),
    city: z.string().optional().describe("The city where the account is located."),
    type: z.enum(['HORECA', 'RETAIL', 'DISTRIBUIDOR', 'OTRO']).optional().describe("The account type."),
    stage: z.enum(['ACTIVA', 'SEGUIMIENTO', 'POTENCIAL', 'FALLIDA']).optional().describe("The current sales stage."),
    mainContactName: z.string().optional().describe("Name of the main contact person."),
    phone: z.string().optional().describe("The account's phone number."),
    notes: z.string().optional().describe("Qualitative notes or observations about the account."),
});

