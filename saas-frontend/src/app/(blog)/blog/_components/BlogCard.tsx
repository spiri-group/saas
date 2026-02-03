import Link from 'next/link';
import Image from 'next/image';
import { BlogPost } from '@/lib/blog/posts';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';

interface BlogCardProps {
  post: BlogPost;
  featured?: boolean;
}

function tagToSlug(tag: string): string {
  return tag.toLowerCase().replace(/&/g, 'and').replace(/\s+/g, '-');
}

function categoryToSlug(category: string): string {
  return category.toLowerCase().replace(/&/g, 'and').replace(/\s+/g, '-');
}

export default function BlogCard({ post, featured = false }: BlogCardProps) {
  return (
    <div className="group block h-full">
      <Card className="h-full flex flex-col transition-all duration-300 hover:shadow-lg hover:border-amber-500/50 bg-slate-900/50 border-slate-800 border-l-2 border-l-[#bd202e]/40 hover:border-l-[#bd202e]">
        <Link href={`/blog/${post.slug}`}>
          {post.coverImage && (
            <div className="relative w-full h-48 overflow-hidden rounded-t-lg">
              <Image
                src={post.coverImage}
                alt={post.title}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
              {featured && (
                <Badge className="absolute top-4 left-4 bg-amber-500 text-slate-900">
                  Featured
                </Badge>
              )}
            </div>
          )}
        </Link>

        <CardHeader className="flex-grow">
          <div className="flex items-center gap-2 mb-2">
            <Link href={`/blog/category/${categoryToSlug(post.category)}`}>
              <Badge variant="outline" className="hover:bg-slate-800 transition-colors cursor-pointer border-slate-700 text-slate-300">
                {post.category}
              </Badge>
            </Link>
          </div>
          <Link href={`/blog/${post.slug}`}>
            <CardTitle className="text-xl group-hover:text-amber-400 transition-colors line-clamp-2 cursor-pointer text-white">
              {post.title}
            </CardTitle>
          </Link>
          <CardDescription className="line-clamp-3 mt-2 text-slate-400">
            {post.excerpt}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="flex flex-wrap gap-2">
            {post.tags.slice(0, 3).map((tag) => (
              <Link key={tag} href={`/blog/tag/${tagToSlug(tag)}`}>
                <Badge variant="secondary" className="text-xs hover:bg-slate-700 transition-colors cursor-pointer bg-slate-800 text-slate-300">
                  {tag}
                </Badge>
              </Link>
            ))}
          </div>
        </CardContent>

        <CardFooter className="flex items-center justify-between text-sm text-slate-500">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{post.readingTime}</span>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
