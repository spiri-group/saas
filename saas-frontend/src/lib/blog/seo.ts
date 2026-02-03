import { Metadata } from 'next';
import { BlogPost } from './posts';
import { getCategoryContent } from './categories';

const baseUrl = 'https://www.spiriverse.com';

export function generateBlogPostMetadata(post: BlogPost, slug: string): Metadata {
  const ogImage = post.coverImage
    ? `${baseUrl}${post.coverImage}`
    : `${baseUrl}/blog/og-default.png`;

  const publishedTime = post.publishedAt.toISOString();
  const modifiedTime = post.updatedAt?.toISOString() || publishedTime;
  const url = `${baseUrl}/blog/${slug}`;

  return {
    title: `${post.title} | SpiriVerse`,
    description: post.excerpt,
    authors: [{ name: post.author.name, url: post.author.url }],
    keywords: post.tags.join(', '),
    openGraph: {
      type: 'article',
      url,
      title: post.title,
      description: post.excerpt,
      publishedTime,
      modifiedTime,
      authors: [post.author.name],
      tags: post.tags,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
      siteName: 'SpiriVerse',
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [ogImage],
      creator: '@spiriverse',
    },
    alternates: {
      canonical: url,
    },
    other: {
      'ld+json': JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.excerpt,
        image: ogImage,
        datePublished: publishedTime,
        dateModified: modifiedTime,
        author: {
          '@type': 'Person',
          name: post.author.name,
          url: post.author.url,
        },
        publisher: {
          '@type': 'Organization',
          name: 'SpiriVerse',
          url: baseUrl,
          logo: {
            '@type': 'ImageObject',
            url: `${baseUrl}/spiriverse-logo.png`,
          },
        },
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': url,
        },
        keywords: post.tags.join(', '),
        articleSection: post.category,
        wordCount: post.wordCount,
      }),
    },
  };
}

export function generateBlogListingMetadata(
  category?: string,
  tag?: string,
  page: number = 1
): Metadata {
  let title = 'Blog | SpiriVerse';
  let description = 'Articles on spiritual growth, meditation, tarot, astrology, energy healing, and building a spiritual practice. Insights for practitioners and seekers alike.';
  let url = `${baseUrl}/blog`;
  let keywords: string[] = [];

  if (category) {
    const categorySlug = category.toLowerCase().replace(/&/g, 'and').replace(/\s+/g, '-');
    const categoryData = getCategoryContent(categorySlug);

    if (categoryData) {
      title = `${categoryData.name}: ${categoryData.headline} | SpiriVerse`;
      description = categoryData.seoDescription;
      keywords = categoryData.keywords;
    } else {
      title = `${category} Articles | SpiriVerse Blog`;
      description = `Read our latest articles about ${category}. Practical insights on spiritual growth, healing practices, and connecting with seekers worldwide.`;
    }
    url = `${baseUrl}/blog/category/${categorySlug}`;
  } else if (tag) {
    title = `${tag} Articles | SpiriVerse Blog`;
    description = `Browse articles tagged with ${tag}. Practical insights on spiritual practices, personal growth, and building your spiritual business.`;
    url = `${baseUrl}/blog/tag/${tag.toLowerCase().replace(/&/g, 'and').replace(/\s+/g, '-')}`;
  }

  if (page > 1) {
    title = `${title} - Page ${page}`;
    url = `${url}?page=${page}`;
  }

  return {
    title,
    description,
    keywords: keywords.length > 0 ? keywords.join(', ') : undefined,
    openGraph: {
      type: 'website',
      url,
      title,
      description,
      siteName: 'SpiriVerse',
      images: [
        {
          url: `${baseUrl}/blog/og-default.png`,
          width: 1200,
          height: 630,
          alt: 'SpiriVerse Blog',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${baseUrl}/blog/og-default.png`],
      creator: '@spiriverse',
    },
    alternates: {
      canonical: url,
    },
    other: {
      'ld+json': JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Blog',
        name: 'SpiriVerse Blog',
        description,
        url,
        publisher: {
          '@type': 'Organization',
          name: 'SpiriVerse',
          url: baseUrl,
          logo: {
            '@type': 'ImageObject',
            url: `${baseUrl}/spiriverse-logo.png`,
          },
        },
      }),
    },
  };
}

export function generateBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${baseUrl}${item.url}`,
    })),
  };
}
