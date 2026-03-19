import React from 'react';
import { CATEGORY_COLORS } from '../constants';

export default function CategoryBadge({ category }) {
  const color = CATEGORY_COLORS[category] || '#6b7594';
  return (
    <span
      className="category-badge"
      style={{ '--badge-color': color }}
    >
      {category}
    </span>
  );
}
