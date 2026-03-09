import { ValidationPipeOptions } from '@nestjs/common';
import { InputFieldIncorrectError } from '../errors/validation.errors';

export const ValidationOptions: ValidationPipeOptions = {
  transform: true,
  whitelist: true,
  transformOptions: {
    enableImplicitConversion: true,
  },
  exceptionFactory(errors) {
    const errorsList = errors.map((error) => {
      return {
        field: error.property,
        message: error.constraints,
      };
    });

    return new InputFieldIncorrectError(
      'Input field was incorrectly filled in',
      errorsList,
    );
  },
};
