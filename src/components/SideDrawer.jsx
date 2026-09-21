import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

/**
 * Unified Mobile Side-Panel / Drawer Primitive for TechHaven.
 * Provides standard outer behavior:
 * - Side-based opening and closing (RTL right-side, LTR left-side)
 * - Translucent backdrop with backdrop-filter blur
 * - Standardized header with title/content and >=40x40px close target
 * - Touch-first, direction-aware swipe-to-close gesture
 * - Distinct vertical-scroll vs horizontal-swipe disambiguation
 * - Automatic body scroll locking with clean restoration
 * - Mobile safe-area insets support
 */
export default function SideDrawer({
  isOpen,
  onClose,
  title,
  headerContent,
  headerActions,
  subHeader,
  children,
  stickyFooter,
  side = 'auto', // 'auto' | 'right' | 'left'
  showClose = true,
  showBackdrop = true,
  closeOnBackdrop = true,
  swipeToClose = true,
  ariaLabel,
  contentClassName = '',
  contentStyle,
}) {
  const { isRtl, t } = useLanguage();
  const drawerRef = useRef(null);
  const backdropRef = useRef(null);
  const [isClosing, setIsClosing] = useState(false);

  // Determine effective side: if 'auto', right in RTL, left in LTR
  const effectiveSide = side === 'auto' ? (isRtl ? 'right' : 'left') : side;
  const isRightSide = effectiveSide === 'right';

  // Body scroll locking when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Animated close execution
  const executeClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);

    const drawer = drawerRef.current;
    const backdrop = backdropRef.current;

    if (drawer) {
      drawer.style.transition = 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)';
      drawer.style.transform = isRightSide ? 'translateX(100%)' : 'translateX(-100%)';
    }
    if (backdrop) {
      backdrop.style.transition = 'opacity 0.2s ease';
      backdrop.style.opacity = '0';
    }

    const timer = setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 220);

    return () => clearTimeout(timer);
  }, [isClosing, isRightSide, onClose]);

  // Keyboard Escape listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        executeClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, executeClose]);

  // Touch gesture handling for direction-aware swipe-to-close
  useEffect(() => {
    const drawer = drawerRef.current;
    if (!isOpen || !swipeToClose || !drawer) return;

    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let gestureState = 'pending'; // 'pending' | 'swiping' | 'scrolling'

    const onTouchStart = (e) => {
      if (e.touches.length > 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      startTime = Date.now();
      gestureState = 'pending';
    };

    const onTouchMove = (e) => {
      if (gestureState === 'scrolling') return;

      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const dx = currentX - startX;
      const dy = currentY - startY;

      if (gestureState === 'pending') {
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);

        // Movement slop threshold
        if (absX < 8 && absY < 8) return;

        // If vertical movement dominates: lock to scrolling mode!
        // This guarantees long filter and navigation lists scroll naturally without dragging the drawer.
        if (absY >= absX) {
          gestureState = 'scrolling';
          return;
        }

        // Horizontal movement dominates: check if moving in closing direction
        // For right-side drawer (RTL): closing direction is moving RIGHT (dx > 0)
        // For left-side drawer (LTR): closing direction is moving LEFT (dx < 0)
        const isClosingDirection = isRightSide ? dx > 0 : dx < 0;

        if (isClosingDirection) {
          gestureState = 'swiping';
          drawer.style.transition = 'none';
          drawer.style.animation = 'none';
          if (backdropRef.current) backdropRef.current.style.transition = 'none';
        } else {
          // Swiping inward against the boundary - treat as scrolling
          gestureState = 'scrolling';
          return;
        }
      }

      if (gestureState === 'swiping') {
        if (e.cancelable) e.preventDefault();

        // Calculate clamped displacement
        const tx = isRightSide ? Math.max(0, dx) : Math.min(0, dx);
        drawer.style.transform = `translateX(${tx}px)`;

        const drawerWidth = drawer.offsetWidth || 340;
        const progress = Math.min(1, Math.abs(tx) / drawerWidth);

        if (backdropRef.current) {
          backdropRef.current.style.opacity = Math.max(0, 1 - progress * 0.75).toString();
        }
      }
    };

    const onTouchEnd = (e) => {
      if (gestureState !== 'swiping') {
        gestureState = 'pending';
        return;
      }

      const touchEndX = e.changedTouches[0]?.clientX || startX;
      const totalDx = touchEndX - startX;
      const elapsedTime = Math.max(1, Date.now() - startTime);
      const velocity = Math.abs(totalDx) / elapsedTime; // px/ms
      const drawerWidth = drawer.offsetWidth || 340;

      const isClosingDir = isRightSide ? totalDx > 0 : totalDx < 0;
      const distanceThreshold = drawerWidth * 0.25; // 25% of drawer width (~85px on 340px width)
      const velocityThreshold = velocity > 0.32 && Math.abs(totalDx) > 25;

      const shouldClose = isClosingDir && (Math.abs(totalDx) >= distanceThreshold || velocityThreshold);

      if (shouldClose) {
        // Complete the close smoothly
        drawer.style.transition = 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)';
        drawer.style.transform = isRightSide ? 'translateX(100%)' : 'translateX(-100%)';
        if (backdropRef.current) {
          backdropRef.current.style.transition = 'opacity 0.2s ease';
          backdropRef.current.style.opacity = '0';
        }
        setTimeout(() => {
          onClose();
        }, 200);
      } else {
        // Snap back smoothly
        drawer.style.transition = 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)';
        drawer.style.transform = 'translateX(0)';
        if (backdropRef.current) {
          backdropRef.current.style.transition = 'opacity 0.22s ease';
          backdropRef.current.style.opacity = '1';
        }
        setTimeout(() => {
          if (drawer) {
            drawer.style.transition = '';
            drawer.style.transform = '';
            drawer.style.animation = '';
          }
          if (backdropRef.current) {
            backdropRef.current.style.transition = '';
            backdropRef.current.style.opacity = '';
          }
        }, 220);
      }

      gestureState = 'pending';
    };

    const onTouchCancel = () => {
      if (gestureState === 'swiping') {
        drawer.style.transition = 'transform 0.2s ease';
        drawer.style.transform = 'translateX(0)';
        if (backdropRef.current) backdropRef.current.style.opacity = '1';
      }
      gestureState = 'pending';
    };

    drawer.addEventListener('touchstart', onTouchStart, { passive: true });
    drawer.addEventListener('touchmove', onTouchMove, { passive: false });
    drawer.addEventListener('touchend', onTouchEnd, { passive: true });
    drawer.addEventListener('touchcancel', onTouchCancel, { passive: true });

    return () => {
      drawer.removeEventListener('touchstart', onTouchStart);
      drawer.removeEventListener('touchmove', onTouchMove);
      drawer.removeEventListener('touchend', onTouchEnd);
      drawer.removeEventListener('touchcancel', onTouchCancel);
    };
  }, [isOpen, swipeToClose, isRightSide, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      {showBackdrop && (
        <div
          ref={backdropRef}
          className="th-drawer-backdrop"
          onClick={closeOnBackdrop ? executeClose : undefined}
          aria-hidden="true"
        />
      )}

      {/* Drawer Container */}
      <aside
        ref={drawerRef}
        className={`th-drawer-container ${!isRightSide ? 'th-drawer-ltr' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel || (typeof title === 'string' ? title : (isRtl ? 'لوحة جانبية' : 'Side Panel'))}
      >
        {/* Drawer Header */}
        <div className="th-drawer-header">
          {headerContent ? (
            headerContent
          ) : (
            <div className="th-drawer-header-title">
              {title}
            </div>
          )}

          <div className="th-drawer-header-actions">
            {headerActions}
            {showClose && (
              <button
                type="button"
                onClick={executeClose}
                className="th-drawer-close-btn"
                aria-label={t('common_close', isRtl ? 'إغلاق' : 'Close')}
              >
                <X size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Optional Sub-Header */}
        {subHeader}

        {/* Drawer Scrollable Content */}
        <div className={`th-drawer-content ${contentClassName}`} style={contentStyle}>
          {children}
        </div>

        {/* Optional Sticky Footer */}
        {stickyFooter && (
          <div className="th-drawer-sticky-footer">
            {stickyFooter}
          </div>
        )}
      </aside>
    </>
  );
}
