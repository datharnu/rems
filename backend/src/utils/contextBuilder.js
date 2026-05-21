/**
 * Poor man's RAG — picks the most relevant past reviews by matching
 * the target item's category to the user's review history. Cheap,
 * deterministic, and good enough to ground Claude's generation.
 */
export function buildContext(userHistory, itemCategory, maxReviews = 5) {
  const reviews = userHistory?.reviews || [];
  const target = (itemCategory || '').toLowerCase();

  const scored = reviews.map((review) => {
    const cats = (review.categories || []).map((c) => c.toLowerCase());
    const match = cats.some(
      (c) => target.includes(c) || c.includes(target)
    );
    return { ...review, score: match ? 2 : 1 };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, maxReviews).map((r) => ({
    text: r.text,
    stars: r.stars,
    businessName: r.businessName || 'Unknown',
    categories: r.categories || [],
  }));
}
