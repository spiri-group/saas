export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage?: string;
  publishedAt: Date;
  updatedAt?: Date;
  author: {
    name: string;
    avatar?: string;
    url?: string;
  };
  category: string;
  tags: string[];
  featured?: boolean;
  readingTime: string;
  wordCount: number;
}

// Serialized version for client-side hydration (dates as strings)
export interface SerializedBlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage?: string;
  publishedAt: string;
  updatedAt?: string;
  author: {
    name: string;
    avatar?: string;
    url?: string;
  };
  category: string;
  tags: string[];
  featured?: boolean;
  readingTime: string;
  wordCount: number;
}

export function serializePost(post: BlogPost): SerializedBlogPost {
  return {
    ...post,
    publishedAt: post.publishedAt.toISOString(),
    updatedAt: post.updatedAt?.toISOString(),
  };
}

export function deserializePost(post: SerializedBlogPost): BlogPost {
  return {
    ...post,
    publishedAt: new Date(post.publishedAt),
    updatedAt: post.updatedAt ? new Date(post.updatedAt) : undefined,
  };
}
