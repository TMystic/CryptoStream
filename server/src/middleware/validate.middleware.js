import { AppError } from "../utils/AppError.js";

/**
 * Validates a request against a zod schema.
 * @param {import("zod").ZodSchema} schema
 */
export function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
      file: req.file,
    });

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }));
      return next(new AppError(400, "Invalid request", details));
    }

    Object.assign(req, result.data);
    next();
  };
}
