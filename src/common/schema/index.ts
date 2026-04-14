import z from 'zod';

export const stringNumber = (message: string) =>
  z.preprocess((val) => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const parsed = Number(val);
      if (!Number.isNaN(parsed)) return parsed;
      throw new Error(message);
    }
    return val;
  }, z.number());
