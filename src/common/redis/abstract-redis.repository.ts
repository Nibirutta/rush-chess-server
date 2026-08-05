import { RedisClientType } from 'redis';

export abstract class RedisRepository<T extends Record<string, any>> {
  private readonly indexKey: string;

  constructor(
    protected readonly prefix: string,
    protected readonly redisClient: RedisClientType,
  ) {
    this.indexKey = `${prefix}:ids`;
  }

  private getHashKey(id: string): string {
    return `${this.prefix}:${id}`;
  }

  async get(id: string): Promise<T | undefined> {
    const data = await this.redisClient.json.get(this.getHashKey(id));

    if (!data) return undefined;

    return data as T;
  }

  async findAll(): Promise<T[] | undefined> {
    const ids = await this.redisClient.sMembers(this.indexKey);

    if (ids.length === 0) return undefined;

    const pipeline = this.redisClient.multi();
    ids.forEach((id) => {
      pipeline.json.get(this.getHashKey(id));
    });
    const result = await pipeline.exec();

    return result as unknown as T[];
  }

  async save(id: string, data: T): Promise<void> {
    const hashKey = this.getHashKey(id);
    const pipeline = this.redisClient.multi();

    pipeline.json.set(hashKey, '$', data);
    pipeline.sAdd(this.indexKey, id);

    await pipeline.exec();
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    const hashKey = this.getHashKey(id);
    const partialData: Record<string, any> = data;

    await this.redisClient.json.merge(hashKey, '$', partialData);

    const updatedData = this.redisClient.json.get(hashKey);

    return updatedData as unknown as T;
  }

  async delete(id: string): Promise<void> {
    const hashKey = this.getHashKey(id);

    const pipeline = this.redisClient.multi();
    pipeline.json.del(hashKey);
    pipeline.sRem(this.indexKey, id);
    await pipeline.exec();
  }
}
