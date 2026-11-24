const AppError = require("../utils/AppError");

// validate(schema) parses req.body with a zod schema and replaces it with the clean result.
module.exports = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body ?? {});
  if (!result.success) {
    const issues = result.error.issues.map((i) => ({ field: i.path.join("."), message: i.message }));
    return next(new AppError(400, issues[0]?.message || "Invalid input", issues));
  }
  req.body = result.data;
  next();
};
