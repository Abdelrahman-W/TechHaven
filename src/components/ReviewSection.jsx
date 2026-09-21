import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../lib/api';

const ReviewSection = ({ productId }) => {
  const { user } = useAuth();
  const { t, isRtl } = useLanguage();
  const navigate = useNavigate();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const data = await api.getProductReviews(productId);
        setReviews(data || []);
      } catch (error) {
        console.error('Error fetching reviews:', error);
      } finally {
        setLoading(false);
      }
    };
    if (productId) fetchReviews();
  }, [productId]);

  const submitReview = async (e) => {
    e.preventDefault();
    try {
      await api.submitReview(productId, { rating: Number(rating), comment });
      toast.success(isRtl ? 'تم إرسال التقييم بنجاح! شكراً لمشاركتك رأيك.' : 'Review submitted successfully! Thank you.');
      setComment('');
      // Refresh reviews
      const data = await api.getProductReviews(productId);
      setReviews(data || []);
    } catch (error) {
      toast.error(error.message || (isRtl ? 'حدث خطأ أثناء إرسال التقييم' : 'Error submitting review'));
    }
  };

  return (
    <div className="section">
      <h3 className="section-head">{t('reviews_title')}</h3>
      
      <div className="grid-auto" style={{ gap: 'var(--space-8)' }}>
        <div className="card">
          <h4>{isRtl ? 'متوسط التقييم' : 'Average Rating'}</h4>
          <div style={{ fontSize: 'var(--text-5xl)', fontWeight: 'bold', color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>4.5</div>
          <div className="rating-stars" style={{ fontSize: '1.5rem' }}>★★★★☆</div>
          <p className="text-muted" style={{ marginTop: 'var(--space-2)' }}>
            {isRtl ? `بناءً على ${reviews.length || 12} تقييم` : `Based on ${reviews.length || 12} reviews`}
          </p>
          
          <div style={{ marginTop: 'var(--space-6)' }}>
            {[5,4,3,2,1].map(num => (
              <div key={num} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
                <span>{isRtl ? `${num} نجوم` : `${num} Stars`}</span>
                <div style={{ flex: 1, height: '8px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                  <div style={{ width: `${num * 15}%`, height: '100%', background: 'var(--warning)' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          {user ? (
            <form onSubmit={submitReview} className="card">
              <h4 style={{ marginBottom: 'var(--space-4)' }}>{t('reviews_write_btn')}</h4>
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                  {t('reviews_rating_label')}
                </label>
                <select className="select" value={rating} onChange={e => setRating(e.target.value)}>
                  <option value="5">{isRtl ? '5 نجوم - ممتاز' : '5 Stars - Excellent'}</option>
                  <option value="4">{isRtl ? '4 نجوم - جيد جداً' : '4 Stars - Very Good'}</option>
                  <option value="3">{isRtl ? '3 نجوم - جيد' : '3 Stars - Good'}</option>
                  <option value="2">{isRtl ? 'نجمتان - مقبول' : '2 Stars - Fair'}</option>
                  <option value="1">{isRtl ? 'نجمة واحدة - سيء' : '1 Star - Poor'}</option>
                </select>
              </div>
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <textarea
                  className="textarea"
                  placeholder={t('reviews_comment_placeholder')}
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary">{t('reviews_submit_btn')}</button>
            </form>
          ) : (
            <div className="card empty-state">
              <p>{t('reviews_login_req')}</p>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="btn btn-secondary"
                style={{ marginTop: 'var(--space-4)' }}
              >
                {t('nav_login')}
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div style={{ marginTop: 'var(--space-8)' }}>
        <h4 style={{ marginBottom: 'var(--space-4)' }}>{isRtl ? 'أحدث التقييمات' : 'Recent Reviews'}</h4>
        {loading ? (
          <p>{isRtl ? 'جاري تحميل التقييمات...' : 'Loading reviews...'}</p>
        ) : reviews.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>{t('reviews_no_reviews')}</p>
        ) : (
          reviews.map((item, idx) => (
            <div key={item.id || idx} className="card" style={{ marginBottom: 'var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                <strong>{item.user_name || item.user?.name || item.userName || (isRtl ? `مستخدم ${idx + 1}` : `User ${idx + 1}`)}</strong>
                <div className="rating-stars">
                  {'★'.repeat(Math.max(1, Math.min(5, Number(item.rating) || 5)))}{'☆'.repeat(Math.max(0, 5 - (Number(item.rating) || 5)))}
                </div>
              </div>
              <p>{item.comment}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ReviewSection;
