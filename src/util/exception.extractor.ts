// TODO move to @mean-stream/nestx
import {Type} from "@nestjs/common";

/**
 * Looks through the body of all functions, finds expressions of the form
 * ```js
 * throw new <type>('<message>')
 * ```
 * and returns the messages as an array.
 *
 * @param type the exception type to look for
 * @param functions the functions to look through
 *
 * @return the messages
 *
 * @example
 * ```js
 * extractExceptionMessages(ForbiddenException, ItemController.prototype.updateOne, ItemService.prototype.updateOne)
 * // => ['This item cannot be bought, sold or used']
 * ```
 */
export function extractExceptionMessages<T extends Error>(type: Type<T>, ...functions: ((...args: any[]) => any)[]): string[] {
  const result: string[] = [];
  for (const func of functions) {
    for (const match of func.toString().matchAll(/throw new ([\w.]+)\(('[^']+'|"[^"]+")\)/g)) {
      if (match[1].endsWith(type.name)) {
        result.push(match[2].slice(1, -1));
      }
    }
  }
  return result;
}

/**
 * Joins exception messages from multiple functions as a markdown list.
 *
 * @see extractExceptionMessages
 * @param type the exception type to look for
 * @param functions the functions to look through
 *
 * @return the messages as a markdown list
 *
 * @example
 * ```js
 * exceptionDesc(ForbiddenException, ItemController.prototype.updateOne, ItemService.prototype.updateOne)
 * // => '- This item cannot be bought, sold or used'
 */
export function exceptionDesc<T extends Error>(type: Type<T>, ...functions: ((...args: any[]) => any)[]): string {
  return '- ' + extractExceptionMessages(type, ...functions).join('\n- ');
}
