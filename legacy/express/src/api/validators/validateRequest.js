import { validationResult } from 'express-validator';
import { responseUtil } from '../../shared/utils/index.js';

export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));

    return res.status(400).json(responseUtil.validationError(formattedErrors));
  }

  next();
};

export default validateRequest;
