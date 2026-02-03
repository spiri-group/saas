import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import Link from 'next/link';
import Image from 'next/image';
import { getAllPosts, getPostBySlug, getRelatedPosts } from '@/lib/blog/posts';
import { generateBlogPostMetadata, generateBreadcrumbSchema } from '@/lib/blog/seo';
import { mdxComponents } from '@/components/blog/MDXComponents';
import BlogCard from '../_components/BlogCard';
import { Badge } from '@/components/ui/badge';
import { Clock, User, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SacredAnimatedBackground from '../../../(site)/components/Home/SacredAnimatedBackground';
import SpiriLogo from '@/icons/spiri-logo';

// Generate static params for all blog posts
export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

// Generate metadata for SEO
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return {
      title: 'Post Not Found | SpiriVerse',
      description: 'The blog post you are looking for could not be found.',
    };
  }

  return generateBlogPostMetadata(post, slug);
}

export const revalidate = 3600; // Revalidate every hour

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = await getRelatedPosts(post, 3);

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Blog', url: '/blog' },
    { name: post.title, url: `/blog/${slug}` },
  ]);

  return (
    <div className="relative min-h-screen bg-slate-950">
      <SacredAnimatedBackground />

      {/* Breadcrumb Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      {/* Header with Logo */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-sm border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/blog">
            <Button
              variant="ghost"
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blog
            </Button>
          </Link>
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <SpiriLogo height={32} />
          </Link>
        </div>
      </div>

      {/* Article Header */}
      <div className="pt-24 pb-8 max-w-4xl mx-auto lg:max-w-none px-4">
        {/* Category */}
        <div className="mb-4">
          <Link href={`/blog/category/${post.category.toLowerCase().replace(/&/g, 'and').replace(/\s+/g, '-')}`}>
            <Badge variant="outline" className="text-sm border-slate-700 text-slate-300 hover:bg-slate-800">
              {post.category}
            </Badge>
          </Link>
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-light mb-6 text-white flex items-start gap-4">
          <span className="w-1.5 h-12 bg-[#bd202e] rounded-full flex-shrink-0 mt-2"></span>
          <span>{post.title}</span>
        </h1>

        {/* Excerpt */}
        <p className="text-xl text-slate-300 mb-8">
          {post.excerpt}
        </p>

        {/* Meta Information */}
        <div className="flex flex-wrap items-center gap-6 text-sm text-slate-400 mb-8 pb-8 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span>{post.author.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>{post.readingTime}</span>
          </div>
        </div>

        {/* Cover Image */}
        {post.coverImage && (
          <div className="relative w-full h-96 mb-12 rounded-lg overflow-hidden border-l-4 border-[#bd202e]">
            <Image
              src={post.coverImage}
              alt={post.title}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 1200px) 100vw, 1200px"
            />
          </div>
        )}
      </div>

      {/* Article Content */}
      <div className="max-w-4xl mx-auto lg:max-w-none px-4">
        <article className="prose prose-slate dark:prose-invert prose-lg max-w-none">
          <MDXRemote
            source={post.content}
            components={mdxComponents}
            options={{
              mdxOptions: {
                rehypePlugins: [
                  rehypeSlug,
                  [
                    rehypeAutolinkHeadings,
                    {
                      behavior: 'wrap',
                      properties: {
                        className: ['anchor'],
                      },
                    },
                  ],
                ],
              },
            }}
          />
        </article>

        {/* Tags */}
        <div className="mt-12 pt-8 border-t border-slate-800">
          <h3 className="text-sm font-semibold text-slate-400 mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-[#bd202e] rounded-full"></span>
            TAGS
          </h3>
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <Link key={tag} href={`/blog/tag/${tag.toLowerCase().replace(/&/g, 'and').replace(/\s+/g, '-')}`}>
                <Badge variant="secondary" className="bg-slate-800 text-slate-300 hover:bg-slate-700">{tag}</Badge>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <div className="py-16 max-w-7xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-light mb-8 text-white flex items-center gap-3">
            <span className="w-1 h-8 bg-[#bd202e] rounded-full"></span>
            Related Articles
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {relatedPosts.map((relatedPost) => (
              <BlogCard key={relatedPost.slug} post={relatedPost} />
            ))}
          </div>
        </div>
      )}

      {/* CTA Section */}
      <div className="py-20 px-4 border-t border-slate-800">
        <div className="text-center max-w-2xl mx-auto">
          <div className="flex justify-center mb-4">
            <span className="w-12 h-1 bg-[#bd202e] rounded-full"></span>
          </div>
          <h2 className="text-2xl md:text-3xl font-light mb-4 text-white">
            Ready to Share Your Gifts?
          </h2>
          <p className="text-lg text-slate-300 mb-8">
            Join SpiriVerse and connect with seekers looking for your unique offerings.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/">
              <Button size="lg" className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-900">
                Become a Merchant
              </Button>
            </Link>
            <Link href="/blog">
              <Button variant="outline" size="lg" className="border-slate-700 text-slate-300 hover:bg-slate-800">
                Explore More Articles
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
