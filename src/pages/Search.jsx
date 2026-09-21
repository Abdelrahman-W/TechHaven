import { useSearchParams, Navigate } from 'react-router-dom';

export default function Search() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';

  // Redirect to Shop page with search query instead of nesting layouts
  return <Navigate to={`/shop?q=${encodeURIComponent(query)}`} replace />;
}
