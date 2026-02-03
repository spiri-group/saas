import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { cache } from 'react';
import readingTime from 'reading-time';

// Re-export types for convenience
export type { BlogPost, SerializedBlogPost } from './types';
export { serializePost, deserializePost } from './types';
import type { BlogPost } from './types';

const contentDirectory = path.join(process.cwd(), 'content/blog');

// Cache post retrieval for performance
export const getAllPosts = cache(async (): Promise<BlogPost[]> => {
  if (!fs.existsSync(contentDirectory)) {
    return [];
  }

  const fileNames = fs.readdirSync(contentDirectory);

  const posts = fileNames
    .filter((fileName) => fileName.endsWith('.mdx'))
    .map((fileName) => {
      const slug = fileName.replace(/\.mdx$/, '');
      const fullPath = path.join(contentDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data, content } = matter(fileContents);

      // Calculate reading time
      const stats = readingTime(content);

      return {
        slug,
        title: data.title,
        excerpt: data.excerpt,
        content,
        coverImage: data.coverImage,
        publishedAt: new Date(data.publishedAt),
        updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined,
        author: data.author,
        category: data.category,
        tags: data.tags || [],
        featured: data.featured || false,
        readingTime: stats.text,
        wordCount: stats.words,
      } as BlogPost;
    })
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

  return posts;
});

export const getPostBySlug = cache(async (slug: string): Promise<BlogPost | null> => {
  const posts = await getAllPosts();
  return posts.find((post) => post.slug === slug) || null;
});

export const getPostsByCategory = cache(async (category: string): Promise<BlogPost[]> => {
  const posts = await getAllPosts();
  return posts.filter((post) => post.category.toLowerCase() === category.toLowerCase());
});

export const getPostsByTag = cache(async (tag: string): Promise<BlogPost[]> => {
  const posts = await getAllPosts();
  return posts.filter((post) => post.tags.some(t => t.toLowerCase() === tag.toLowerCase()));
});

export const getFeaturedPosts = cache(async (): Promise<BlogPost[]> => {
  const posts = await getAllPosts();
  return posts.filter((post) => post.featured).slice(0, 3);
});

export const getAllCategories = cache(async (): Promise<string[]> => {
  const posts = await getAllPosts();
  const categories = new Set(posts.map((post) => post.category));
  return Array.from(categories).sort();
});

export const getAllTags = cache(async (): Promise<string[]> => {
  const posts = await getAllPosts();
  const tags = new Set(posts.flatMap((post) => post.tags));
  return Array.from(tags).sort();
});

export const getRelatedTags = cache(async (tag: string): Promise<string[]> => {
  const posts = await getAllPosts();

  // Find all posts with this tag
  const postsWithTag = posts.filter((post) =>
    post.tags.some(t => t.toLowerCase() === tag.toLowerCase())
  );

  // Collect all other tags from those posts
  const relatedTags = new Set<string>();
  postsWithTag.forEach((post) => {
    post.tags.forEach((t) => {
      if (t.toLowerCase() !== tag.toLowerCase()) {
        relatedTags.add(t);
      }
    });
  });

  return Array.from(relatedTags).sort();
});

export const getTagsForCategory = cache(async (category: string): Promise<string[]> => {
  const posts = await getAllPosts();

  // Find all posts in this category
  const postsInCategory = posts.filter((post) =>
    post.category.toLowerCase() === category.toLowerCase()
  );

  // Collect all tags from those posts
  const tags = new Set<string>();
  postsInCategory.forEach((post) => {
    post.tags.forEach((t) => tags.add(t));
  });

  return Array.from(tags).sort();
});

export const getRelatedPosts = cache(async (currentPost: BlogPost, limit: number = 3): Promise<BlogPost[]> => {
  const posts = await getAllPosts();

  // Filter out current post
  const otherPosts = posts.filter((post) => post.slug !== currentPost.slug);

  // Score posts by relevance
  const scoredPosts = otherPosts.map((post) => {
    let score = 0;

    // Same category gets highest weight
    if (post.category === currentPost.category) {
      score += 10;
    }

    // Shared tags
    const sharedTags = post.tags.filter((tag) => currentPost.tags.includes(tag));
    score += sharedTags.length * 3;

    // Recent posts get slight boost
    const daysDiff = Math.abs(post.publishedAt.getTime() - currentPost.publishedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff < 30) {
      score += 2;
    }

    return { post, score };
  });

  // Sort by score and return top N
  return scoredPosts
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.post);
});

// Pagination helper
export interface PaginatedPosts {
  posts: BlogPost[];
  currentPage: number;
  totalPages: number;
  totalPosts: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export const getPaginatedPosts = cache(async (page: number = 1, postsPerPage: number = 9): Promise<PaginatedPosts> => {
  const allPosts = await getAllPosts();
  const totalPosts = allPosts.length;
  const totalPages = Math.ceil(totalPosts / postsPerPage);
  const startIndex = (page - 1) * postsPerPage;
  const endIndex = startIndex + postsPerPage;

  return {
    posts: allPosts.slice(startIndex, endIndex),
    currentPage: page,
    totalPages,
    totalPosts,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
});
