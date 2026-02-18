/**
 * Joi validation middleware factory.
 *
 * Creates Express middleware that validates request data (body, query, params)
 * against a Joi schema. On validation failure, returns a 422 response with
 * field-level error details.
 *
 * Usage:
 *   router.post('/users', validate(createUserSchema), userController.create);
 *   router.get('/users', validate(listUsersSchema, 'query'), userController.list);
 */

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from '../errors';

type ValidationSource = 'body' | 'query' | 'params';

/**
 * Create validation middleware for a given Joi schema.
 *
 * @param schema - Joi schema to validate against
 * @param source - Request property to validate ('body', 'query', or 'params')
 * @returns Express middleware function
 */
export function validate(
  schema: Joi.ObjectSchema,
  source: ValidationSource = 'body'
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,      // Report all errors, not just the first
      stripUnknown: true,     // Remove unknown fields
      allowUnknown: false,    // Reject unknown fields
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/"/g, ''),
      }));

      next(new ValidationError(errors));
      return;
    }

    // Replace request data with validated + sanitized values
    req[source] = value;
    next();
  };
}
