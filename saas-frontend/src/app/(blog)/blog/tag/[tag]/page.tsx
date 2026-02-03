import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPostsByTag, getAllTags, getRelatedTags } from '@/lib/blog/posts';
import { generateBlogListingMetadata, generateBreadcrumbSchema } from '@/lib/blog/seo';
import Script from 'next/script';
import BlogCard from '../../_components/BlogCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import SacredAnimatedBackground from '../../../../(site)/components/Home/SacredAnimatedBackground';
import SpiriLogo from '@/icons/spiri-logo';

// Convert tag to URL-friendly slug
function tagToSlug(tag: string): string {
  return tag
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\s+/g, '-');
}

// Find the original tag from a slug
async function findTagBySlug(slug: string): Promise<string | null> {
  const allTags = await getAllTags();
  return allTags.find((tag) => tagToSlug(tag) === slug) || null;
}

export async function generateStaticParams() {
  const tags = await getAllTags();
  return tags.map((tag) => ({
    tag: tagToSlug(tag),
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }): Promise<Metadata> {
  const { tag } = await params;
  const originalTag = await findTagBySlug(tag);

  return generateBlogListingMetadata(undefined, originalTag || tag);
}

export const revalidate = 1800; // Revalidate every 30 minutes

export default async function TagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  const originalTag = await findTagBySlug(tag);

  if (!originalTag) {
    notFound();
  }

  const posts = await getPostsByTag(originalTag);
  const relatedTags = await getRelatedTags(originalTag);

  if (posts.length === 0) {
    notFound();
  }

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Blog', url: '/blog' },
    { name: originalTag, url: `/blog/tag/${tag}` },
  ]);

  return (
    <div className="relative min-h-screen bg-slate-950">
      <SacredAnimatedBackground />

      {/* Breadcrumb Schema */}
      <Script
        id="breadcrumb-schema"
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
              All Posts
            </Button>
          </Link>
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <SpiriLogo height={32} />
          </Link>
        </div>
      </div>

      <div className="pt-24 pb-12 max-w-4xl mx-auto lg:max-w-none px-4">
        <div className="mb-6">
          <Badge className="text-sm bg-[#f6b041] text-slate-900">{originalTag}</Badge>
        </div>

        <h1 className="text-4xl md:text-5xl font-light mb-6 text-white flex items-center gap-4">
          <span className="w-1.5 h-12 bg-[#bd202e] rounded-full"></span>
          Articles tagged with &quot;{originalTag}&quot;
        </h1>
        <p className="text-lg md:text-xl text-slate-400">
          {posts.length} {posts.length === 1 ? 'article' : 'articles'} with this tag
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </div>
      </div>

      {relatedTags.length > 0 && (
        <div className="max-w-4xl mx-auto lg:max-w-none px-4 pb-12">
          <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
            <span className="w-1 h-6 bg-[#bd202e] rounded-full"></span>
            Related Tags
          </h2>
          <div className="flex flex-wrap gap-2">
            {relatedTags.map((relatedTag) => (
              <Link key={relatedTag} href={`/blog/tag/${tagToSlug(relatedTag)}`}>
                <Badge variant="secondary" className="text-sm hover:bg-slate-700 transition-colors bg-slate-800 text-slate-300">
                  {relatedTag}
                </Badge>
              </Link>
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
