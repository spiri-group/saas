import Link from 'next/link';
import { getPaginatedPosts, getFeaturedPosts, getAllCategories } from '@/lib/blog/posts';
import { generateBlogListingMetadata } from '@/lib/blog/seo';
import BlogCard from './_components/BlogCard';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import SacredAnimatedBackground from '../../(site)/components/Home/SacredAnimatedBackground';
import SpiriLogo from '@/icons/spiri-logo';

export const metadata = generateBlogListingMetadata();

export const revalidate = 1800; // Revalidate every 30 minutes

interface BlogPageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const { page } = await searchParams;
  const currentPage = Number(page) || 1;
  const { posts, totalPages, hasNextPage, hasPreviousPage } = await getPaginatedPosts(currentPage, 9);
  const featuredPosts = currentPage === 1 ? await getFeaturedPosts() : [];
  const categories = await getAllCategories();

  return (
    <div className="relative min-h-screen bg-slate-950">
      <SacredAnimatedBackground />

      {/* Back to Learn More */}
      <div className="fixed top-4 left-4 z-50">
        <Link href="/learn-more">
          <Button
            variant="ghost"
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
      </div>

      {/* Hero Section */}
      <div className="pt-24 pb-8 max-w-7xl mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto">
          {/* Logo */}
          <Link href="/" className="inline-block mb-6 hover:opacity-80 transition-opacity">
            <SpiriLogo height={48} />
          </Link>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-light mb-4 text-white">
            Insights & Inspiration
          </h1>
          <p className="text-lg md:text-xl text-slate-300 mb-6">
            Guidance for your spiritual journey and practice
          </p>

          {/* Category Pills */}
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/blog">
              <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800">
                All Posts
              </Button>
            </Link>
            {categories.map((category) => (
              <Link key={category} href={`/blog/category/${category.toLowerCase().replace(/&/g, 'and').replace(/\s+/g, '-')}`}>
                <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800">
                  {category}
                </Button>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Featured Posts */}
      {featuredPosts.length > 0 && (
        <div className="py-12 max-w-7xl mx-auto px-5">
          <h2 className="text-2xl md:text-3xl font-light mb-8 text-white flex items-center gap-3">
            <span className="w-1 h-8 bg-[#bd202e] rounded-full"></span>
            Featured Articles
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-1">
            {featuredPosts.map((post) => (
              <BlogCard key={post.slug} post={post} featured />
            ))}
          </div>
        </div>
      )}

      {/* All Posts */}
      <div className="py-12 max-w-7xl mx-auto px-5">
        <h2 className="text-2xl md:text-3xl font-light mb-8 text-white flex items-center gap-3">
          <span className="w-1 h-8 bg-[#bd202e] rounded-full"></span>
          {currentPage === 1 ? 'Latest Articles' : `Articles - Page ${currentPage}`}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-1">
          {posts.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </div>

        {/* Empty State */}
        {posts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-400 text-lg">No articles yet. Check back soon!</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-12">
            {hasPreviousPage && (
              <Link href={currentPage - 1 === 1 ? '/blog' : `/blog?page=${currentPage - 1}`}>
                <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">Previous</Button>
              </Link>
            )}

            <span className="text-sm text-slate-400">
              Page {currentPage} of {totalPages}
            </span>

            {hasNextPage && (
              <Link href={`/blog?page=${currentPage + 1}`}>
                <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">Next</Button>
              </Link>
            )}
          </div>
        )}
      </div>

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
          </div>
        </div>
      </div>
    </div>
  );
}
