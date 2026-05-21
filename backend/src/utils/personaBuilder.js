/**
 * Builds a structured user persona from their Yelp review history.
 * Used by both the review simulation agent (Task A) and the
 * recommendation agent (Task B) to ground LLM output in user behavior.
 */
export function buildPersona(userHistory) {
  const reviews = userHistory?.reviews || [];

  if (reviews.length === 0) {
    return {
      avgRating: 3.5,
      reviewCount: 0,
      tone: 'casual',
      verbosity: 'medium',
      topCategories: [],
      isColdStart: true,
    };
  }

  const avgRating =
    reviews.reduce((sum, r) => sum + (r.stars || 0), 0) / reviews.length;

  const avgWords =
    reviews.reduce(
      (sum, r) => sum + (r.text ? r.text.split(/\s+/).length : 0),
      0
    ) / reviews.length;
  const verbosity =
    avgWords > 80 ? 'detailed' : avgWords > 30 ? 'medium' : 'brief';

  const allText = reviews.map((r) => r.text || '').join(' ').toLowerCase();
  const tone =
    allText.includes('amazing') || allText.includes('love')
      ? 'enthusiastic'
      : allText.includes('terrible') || allText.includes('never again')
      ? 'critical'
      : 'balanced';

  const categories = reviews
    .flatMap((r) => r.categories || [])
    .reduce((acc, cat) => {
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {});
  const topCategories = Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat]) => cat);

  return {
    avgRating: parseFloat(avgRating.toFixed(1)),
    reviewCount: reviews.length,
    tone,
    verbosity,
    topCategories,
    isColdStart: false,
  };
}
