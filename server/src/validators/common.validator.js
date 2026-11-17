import { param } from 'express-validator';
import mongoose from 'mongoose';

export const validateObjectId = (paramName) => {
  return [
    param(paramName)
      .trim()
      .custom((value) => {
        if (!mongoose.Types.ObjectId.isValid(value)) {
          throw new Error(`Invalid ${paramName} identifier format`);
        }
        return true;
      })
  ];
};

