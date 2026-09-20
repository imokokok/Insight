/** Every newly added promotion must lie on one consecutive append-only path. */
export function verifyPromotionLineage(previousId, currentId, added, promotions) {
  const additions = new Map(added.map((p) => [p.promotionId, p]));
  if (!added.length || additions.size !== added.length)
    throw new Error('Missing or duplicate promotion additions');
  let cursor = currentId;
  const visited = new Set();
  while (cursor !== previousId) {
    const next = additions.get(cursor);
    if (!next || visited.has(cursor))
      throw new Error('Promotion additions must form one append-only chain from the base pointer');
    const predecessor = promotions.get(next.predecessorPromotionId);
    if (!predecessor || next.promotionVersion !== predecessor.promotionVersion + 1)
      throw new Error('Promotion versions must be sequential');
    visited.add(cursor);
    cursor = next.predecessorPromotionId;
  }
  if (visited.size !== additions.size)
    throw new Error('Orphan promotion addition is not on the current lineage');
  const promotion = additions.get(currentId);
  if (!promotion) throw new Error('Current promotion must be newly added');
  return promotion;
}
