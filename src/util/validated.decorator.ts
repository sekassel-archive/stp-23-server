import {applyDecorators, UsePipes, ValidationPipe, ValidationPipeOptions} from '@nestjs/common';
import {ApiBadRequestResponse} from '@nestjs/swagger';

export const VALIDATION_PIPE = new ValidationPipe({
  whitelist: true,
  transform: true,
});

export function Validated() {
  return applyDecorators(
    UsePipes(VALIDATION_PIPE),
    ApiBadRequestResponse({
      description: 'Validation failed.',
    }),
  );
}

// TODO move to @mean-stream/nestx
export function ValidatedEvent(pipeOrOptions?: ValidationPipe | ValidationPipeOptions): MethodDecorator {
  const pipe = pipeOrOptions instanceof ValidationPipe ? pipeOrOptions : new ValidationPipe(pipeOrOptions);
  return (target: object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<any>) => {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      const metatypes = Reflect.getMetadata('design:paramtypes', target, propertyKey);
      for (let i = 0; i < args.length; i++) {
        const metatype = metatypes[i];
        if (metatype && metatype.prototype) {
          args[i] = await pipe.transform(args[i], {type: 'body', metatype});
        }
      }
      return originalMethod.apply(this, args);
    };
  };
}
