import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Blog — TRIBE',
  description: 'Stories, guides, and research on postpartum care, mother wellness, and building your village.',
}

const POSTS = [
  {
    slug: 'what-is-postpartum-doula',
    category: 'Care Guide',
    categoryColor: 'bg-[#e8f4f0] text-[#004c54] dark:bg-[#004c54]/30 dark:text-[#95d0d9]',
    title: 'What Does a Postpartum Doula Actually Do?',
    excerpt:
      'A postpartum doula is not the same as a birth doula. Here\'s what to expect during those first weeks at home — and why it matters more than you think.',
    date: 'May 18, 2026',
    readTime: '5 min read',
    authorInitials: 'TR',
    authorName: 'TRIBE Editorial',
  },
  {
    slug: 'fourth-trimester-guide',
    category: 'Recovery',
    categoryColor: 'bg-[#fdf3ec] text-[#633b15] dark:bg-[#3b2010]/30 dark:text-[#dfa677]',
    title: 'The Fourth Trimester: What Nobody Tells You',
    excerpt:
      'The first 12 weeks after birth are as transformative as pregnancy itself. This guide covers physical recovery, emotional shifts, and how to ask for help.',
    date: 'May 10, 2026',
    readTime: '8 min read',
    authorInitials: 'TR',
    authorName: 'TRIBE Editorial',
  },
  {
    slug: 'how-to-support-new-mom',
    category: 'For Supporters',
    categoryColor: 'bg-coral-50 text-coral-700 dark:bg-coral-900/20 dark:text-coral-300',
    title: 'How to Actually Help a New Mom (Not Just Buy Stuff)',
    excerpt:
      'Meal trains are great. But funded professional care is better. Here\'s how to turn your love into real, lasting support during the postpartum period.',
    date: 'April 29, 2026',
    readTime: '4 min read',
    authorInitials: 'TR',
    authorName: 'TRIBE Editorial',
  },
  {
    slug: 'lactation-consultant-vs-nurse',
    category: 'Breastfeeding',
    categoryColor: 'bg-[#e8f4f0] text-[#004c54] dark:bg-[#004c54]/30 dark:text-[#95d0d9]',
    title: 'Lactation Consultant vs. Lactation Nurse: What\'s the Difference?',
    excerpt:
      'IBCLCs, CLCs, breastfeeding counselors — the credentials are confusing. Here\'s a plain-English breakdown of who to see and when.',
    date: 'April 15, 2026',
    readTime: '6 min read',
    authorInitials: 'TR',
    authorName: 'TRIBE Editorial',
  },
  {
    slug: 'postpartum-depression-signs',
    category: 'Mental Health',
    categoryColor: 'bg-[#fdf3ec] text-[#633b15] dark:bg-[#3b2010]/30 dark:text-[#dfa677]',
    title: 'Postpartum Depression: Signs, Support, and When to Seek Help',
    excerpt:
      'Up to 1 in 5 mothers experience PPD. Knowing the signs — and having care funded before baby arrives — can make all the difference.',
    date: 'April 3, 2026',
    readTime: '7 min read',
    authorInitials: 'TR',
    authorName: 'TRIBE Editorial',
  },
  {
    slug: 'pelvic-floor-after-birth',
    category: 'Physical Recovery',
    categoryColor: 'bg-cream-100 text-[#40484a] dark:bg-[#001f23] dark:text-[#bfc8ca]',
    title: 'Pelvic Floor Recovery After Birth: Why Every Mom Needs a PT',
    excerpt:
      'Pelvic floor physical therapy after birth isn\'t just for incontinence. It\'s essential healing — and most insurance won\'t cover it.',
    date: 'March 22, 2026',
    readTime: '6 min read',
    authorInitials: 'TR',
    authorName: 'TRIBE Editorial',
  },
]

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-[#fcf9f8] dark:bg-[#001620] font-sans">
      {/* ─── Nav strip ─────────────────────────────────────────────────────── */}
      <div className="border-b border-[#e5e2e1] dark:border-[#054f57] bg-[#fcf9f8]/95 dark:bg-[#001620]/95 backdrop-blur sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link href="/" className="font-display font-bold text-xl text-[#00343a] dark:text-[#95d0d9]">
            TRIBE
          </Link>
          <span className="text-[#bfc8ca] dark:text-[#40484a]">/</span>
          <span className="text-sm text-[#40484a] dark:text-[#bfc8ca]">Blog</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-14">
          <div className="inline-flex items-center gap-2 bg-[#e8f4f0] dark:bg-[#004c54]/30 text-[#004c54] dark:text-[#95d0d9] text-xs font-semibold uppercase tracking-widest px-4 py-2 rounded-full mb-6 border border-[#c0dbd7] dark:border-[#054f57]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#29676f] dark:bg-[#95d0d9]" />
            Resources &amp; Stories
          </div>
          <h1 className="font-display text-[2.6rem] md:text-[3.4rem] font-bold leading-tight text-[#00343a] dark:text-[#fcf9f8] mb-4">
            The TRIBE Blog
          </h1>
          <p className="text-xl text-[#40484a] dark:text-[#bfc8ca] max-w-xl">
            Guides, research, and real stories about postpartum care, recovery, and building your village.
          </p>
        </div>

        {/* Featured post */}
        <article className="mb-10 bg-white dark:bg-[#00272c] rounded-3xl overflow-hidden border border-[#e5e2e1] dark:border-[#054f57] hover:border-[#29676f] dark:hover:border-[#29676f] hover:shadow-[0_16px_48px_rgba(0,52,58,0.10)] dark:hover:shadow-[0_16px_48px_rgba(0,52,58,0.3)] transition-all group">
          <div className="md:flex">
            {/* Illustration placeholder */}
            <div className="md:w-2/5 h-52 md:h-auto bg-gradient-to-br from-[#e8f4f0] to-[#c0dbd7] dark:from-[#004c54] dark:to-[#00343a] flex items-center justify-center flex-shrink-0">
              <span className="text-6xl" aria-hidden>🤱</span>
            </div>
            <div className="flex-1 p-8 md:p-10 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider bg-[#e8f4f0] text-[#004c54] dark:bg-[#004c54]/30 dark:text-[#95d0d9] px-3 py-1 rounded-full">
                  {POSTS[0]!.category}
                </span>
                <span className="text-xs text-[#70797a] dark:text-[#40484a]">
                  {POSTS[0]!.date} · {POSTS[0]!.readTime}
                </span>
              </div>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-[#00343a] dark:text-[#fcf9f8] mb-4 group-hover:text-[#29676f] dark:group-hover:text-[#95d0d9] transition-colors">
                {POSTS[0]!.title}
              </h2>
              <p className="text-[#40484a] dark:text-[#bfc8ca] leading-relaxed mb-6">
                {POSTS[0]!.excerpt}
              </p>
              <span className="text-sm font-semibold text-[#00343a] dark:text-[#95d0d9] flex items-center gap-1.5 group-hover:gap-3 transition-all">
                Read article
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              </span>
            </div>
          </div>
        </article>

        {/* Grid of remaining posts */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {POSTS.slice(1).map((post) => (
            <article
              key={post.slug}
              className="bg-white dark:bg-[#00272c] rounded-2xl overflow-hidden border border-[#e5e2e1] dark:border-[#054f57] hover:border-[#29676f] dark:hover:border-[#29676f] hover:shadow-[0_12px_32px_rgba(0,52,58,0.10)] transition-all flex flex-col group"
            >
              {/* Illustration */}
              <div className="h-36 bg-gradient-to-br from-[#f3f0ef] to-[#e5e2e1] dark:from-[#001f23] dark:to-[#00272c] flex items-center justify-center text-4xl">
                {post.category === 'Recovery' ? '💆' :
                 post.category === 'For Supporters' ? '🤝' :
                 post.category === 'Breastfeeding' ? '🍼' :
                 post.category === 'Mental Health' ? '🧠' : '💪'}
              </div>
              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${post.categoryColor}`}>
                    {post.category}
                  </span>
                </div>
                <h2 className="font-display font-bold text-base text-[#00343a] dark:text-[#fcf9f8] mb-2 leading-snug group-hover:text-[#29676f] dark:group-hover:text-[#95d0d9] transition-colors line-clamp-2">
                  {post.title}
                </h2>
                <p className="text-xs text-[#40484a] dark:text-[#bfc8ca] leading-relaxed line-clamp-3 flex-1 mb-4">
                  {post.excerpt}
                </p>
                <p className="text-[11px] text-[#70797a] dark:text-[#40484a]">
                  {post.date} · {post.readTime}
                </p>
              </div>
            </article>
          ))}
        </div>

        {/* Coming soon note */}
        <div className="mt-14 text-center py-10 border-t border-[#e5e2e1] dark:border-[#054f57]">
          <p className="text-[#70797a] dark:text-[#40484a] text-sm">
            More articles coming soon.{' '}
            <a href="mailto:info@tribewishlist.com" className="text-[#00343a] dark:text-[#95d0d9] underline hover:no-underline">
              Suggest a topic
            </a>
          </p>
        </div>
      </div>
    </main>
  )
}
