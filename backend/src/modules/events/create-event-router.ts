import { Router } from 'express';
import { parseDraftUpdateInput } from './draft-update-input.js';
import type { AuthenticatedUser } from '../auth/types.js';
import type { EventRepository } from './event-repository.js';

export interface CreateEventDependencies {
  eventRepository: EventRepository;
  authenticateUser: (req: any) => Promise<AuthenticatedUser | null>;
}

export function createEventRouter({ eventRepository, authenticateUser }: CreateEventDependencies) {
  const router = Router();

  router.post('/', async (req, res, next) => {
    try {
      const user = await authenticateUser(req);
      if (!user) {
        res.status(401).json({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in to continue.' } });
        return;
      }

      // Enforce AC: Only authorised Event Organisers can create requests
      if (user.role !== 'EVENT_ORGANISER') {
        res.status(403).json({
          error: { code: 'FORBIDDEN', message: 'Only Event Organisers can create event requests.' }
        });
        return;
      }

      const action = req.body?.action === 'SUBMIT' ? 'SUBMITTED' : 'DRAFT';
      const parsedFields = parseDraftUpdateInput(req.body?.data ?? req.body);

      // Validate required fields if performing immediate submission
      if (action === 'SUBMITTED') {
        const required = ['name', 'purpose', 'startsAt', 'endsAt', 'expectedAttendance', 'venueRequirements'];
        for (const field of required) {
          if (!parsedFields[field as keyof typeof parsedFields]) {
            res.status(400).json({
              error: { code: 'INVALID_INPUT', message: `Field '${field}' is required for submission.` }
            });
            return;
          }
        }
      }

      const createdRequest = await eventRepository.createEventRequest({
        organiserId: user.id,
        status: action,
        ...parsedFields,
      });

      res.status(201).json({ request: createdRequest });
    } catch (error) {
      next(error);
    }
  });

  return router;
}