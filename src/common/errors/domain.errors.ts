export class DomainError extends Error {
  body: object | undefined;

  constructor(message: string, body?: object) {
    super(message);
    this.name = this.constructor.name;
    this.body = body;
  }
}
