import React, { useState } from 'react';
import { Plus, Coffee, CupSoda, Sparkles, Croissant } from 'lucide-react';

const ICON_MAP = {
  1: Coffee,
  2: CupSoda,
  3: Sparkles,
  4: Croissant,
};

export default function ProductCard({ product, categoryId, onSelect }) {
  const [imageError, setImageError] = useState(false);
  const IconComponent = ICON_MAP[categoryId] || Coffee;
  const hasImage = Boolean(product.image_url) && !imageError;

  const getImageSrc = (url) => {
    if (!url) return '';
    if (url.startsWith('/public/')) {
      return url.replace('/public/', '/');
    }
    return url;
  };

  const handleCardKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(product);
    }
  };

  return (
    <div
      className="product-card"
      role="button"
      tabIndex={0}
      aria-label={`เลือก ${product.name} ราคา ${Number(product.base_price).toFixed(2)} บาท`}
      onClick={() => onSelect(product)}
      onKeyDown={handleCardKeyDown}
    >
      <div className="product-card-visual">
        {hasImage ? (
          <img
            src={getImageSrc(product.image_url)}
            alt={product.name}
            className="product-img"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="product-icon-wrapper">
            <IconComponent size={36} className="product-svg-icon" />
          </div>
        )}
      </div>

      <div className="product-card-body">
        <h3 className="product-name">{product.name}</h3>
        <div className="product-footer">
          <div className="product-price">
            <span className="price-currency">฿</span>
            <span className="price-amount">{Number(product.base_price).toFixed(2)}</span>
          </div>

          <span className="add-btn" aria-hidden="true">
            <Plus size={16} />
            <span>เลือก</span>
          </span>
        </div>
      </div>
    </div>
  );
}
