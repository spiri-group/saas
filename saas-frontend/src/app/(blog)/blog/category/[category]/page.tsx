import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPostsByCategory, getAllCategories, getTagsForCategory } from '@/lib/blog/posts';
import { Badge } from '@/components/ui/badge';
import { generateBlogListingMetadata, generateBreadcrumbSchema } from '@/lib/blog/seo';
import { getCategoryContent } from '@/lib/blog/categories';
import Script from 'next/script';
import BlogCard from '../../_components/BlogCard';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import SacredAnimatedBackground from '../../../../(site)/components/Home/SacredAnimatedBackground';
import SpiriLogo from '@/icons/spiri-logo';

// Convert category to URL-friendly slug
function categoryToSlug(category: string): string {
  return category
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\s+/g, '-');
}

// Find the original category from a slug
async function findCategoryBySlug(slug: string): Promise<string | null> {
  const allCategories = await getAllCategories();
  return allCategories.find((cat) => categoryToSlug(cat) === slug) || null;
}

// Convert tag to URL-friendly slug
function tagToSlug(tag: string): string {
  return tag
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\s+/g, '-');
}

export async function generateStaticParams() {
  const categories = await getAllCategories();
  return categories.map((category) => ({
    category: categoryToSlug(category),
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const originalCategory = await findCategoryBySlug(category);

  return generateBlogListingMetadata(originalCategory || category);
}

export const revalidate = 1800; // Revalidate every 30 minutes

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const originalCategory = await findCategoryBySlug(category);

  if (!originalCategory) {
    notFound();
  }

  const posts = await getPostsByCategory(originalCategory);
  const relatedTags = await getTagsForCategory(originalCategory);
  const categoryData = getCategoryContent(category);

  if (posts.length === 0) {
    notFound();
  }

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Blog', url: '/blog' },
    { name: originalCategory, url: `/blog/category/${category}` },
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

      {/* Hero Section with Category Info */}
      <div className="pt-24 pb-12 max-w-4xl mx-auto lg:max-w-none px-4">
        <Badge className="text-sm bg-[#f6b041] text-slate-900 mb-4">{originalCategory}</Badge>
        <h1 className="text-4xl md:text-5xl font-light mb-6 text-white flex items-center gap-4">
          <span className="w-1.5 h-12 bg-[#bd202e] rounded-full"></span>
          {categoryData?.headline || `Articles in "${originalCategory}"`}
        </h1>

        {/* Category Description */}
        {categoryData?.description ? (
          <p className="text-lg md:text-xl text-slate-300 mb-6 leading-relaxed">
            {categoryData.description}
          </p>
        ) : (
          <p className="text-lg md:text-xl text-slate-400">
            {posts.length} {posts.length === 1 ? 'article' : 'articles'} in this category
          </p>
        )}

        {/* Featured Topics */}
        {categoryData?.featuredTopics && categoryData.featuredTopics.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {categoryData.featuredTopics.map((topic) => (
              <Badge
                key={topic}
                variant="outline"
                className="text-sm border-slate-600 text-slate-300 bg-slate-800/50"
              >
                {topic}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Articles Grid */}
      <div className="max-w-7xl mx-auto px-4 pb-12">
        <h2 className="text-xl font-semibold mb-6 text-white flex items-center gap-2">
          <span className="w-1 h-6 bg-[#bd202e] rounded-full"></span>
          {posts.length} {posts.length === 1 ? 'Article' : 'Articles'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </div>
      </div>

      {/* Browse by Tag */}
      {relatedTags.length > 0 && (
        <div className="max-w-4xl mx-auto lg:max-w-none px-4 pb-12">
          <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
            <span className="w-1 h-6 bg-[#bd202e] rounded-full"></span>
            Browse by Topic
          </h2>
          <div className="flex flex-wrap gap-2">
            {relatedTags.map((tag) => (
              <Link key={tag} href={`/blog/tag/${tagToSlug(tag)}`}>
                <Badge variant="secondary" className="text-sm hover:bg-slate-700 transition-colors bg-slate-800 text-slate-300">
                  {tag}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* CTA Section - Uses category-specific content if available */}
      <div className="py-20 px-4 border-t border-slate-800">
        <div className="text-center max-w-2xl mx-auto">
          <div className="flex justify-center mb-4">
            <span className="w-12 h-1 bg-[#bd202e] rounded-full"></span>
          </div>
          <h2 className="text-2xl md:text-3xl font-light mb-4 text-white">
            {categoryData?.ctaTitle || 'Ready to Share Your Gifts?'}
          </h2>
          <p className="text-lg text-slate-300 mb-8">
            {categoryData?.ctaDescription || 'Join SpiriVerse and connect with seekers looking for your unique offerings.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={categoryData?.ctaButtonLink || '/'}>
              <Button size="lg" className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-900">
                {categoryData?.ctaButtonText || 'Become a Merchant'}
                <ArrowRight className="w-4 h-4 ml-2" />
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
