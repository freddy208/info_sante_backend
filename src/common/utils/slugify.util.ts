// src/common/utils/slugify.util.ts

import slugify from 'slugify';

export const slugifyFunction = (text: string): string => {
  return slugify(text, { lower: true, strict: true });
};
export { slugify };
