import { useEffect, RefObject } from 'react';

interface UseScrollIntoViewOptions {
  /**
   * Whether the hook is enabled
   * @default true
   */
  enabled?: boolean;

  /**
   * Delay before scrolling (ms) - gives keyboard time to appear
   * @default 300
   */
  delay?: number;

  /**
   * Scroll behavior
   * @default 'smooth'
   */
  behavior?: ScrollBehavior;

  /**
   * Block alignment
   * @default 'center'
   */
  block?: ScrollLogicalPosition;

  /**
   * Additional offset from top (useful to account for headers)
   * @default 0
   */
  offset?: number;
}

/**
 * Hook to scroll an element into view when focused
 * Particularly useful for input fields on mobile to prevent keyboard from covering them
 *
 * @example
 * ```tsx
 * const inputRef = useRef<HTMLInputElement>(null);
 * useScrollIntoView(inputRef);
 *
 * return <input ref={inputRef} type="email" />;
 * ```
 */
export const useScrollIntoView = <T extends HTMLElement>(
  ref: RefObject<T>,
  options: UseScrollIntoViewOptions = {}
) => {
  const {
    enabled = true,
    delay = 300,
    behavior = 'smooth',
    block = 'center',
    offset = 0,
  } = options;

  useEffect(() => {
    if (!enabled || !ref.current) return;

    const element = ref.current;
    let timeoutId: NodeJS.Timeout;

    const handleFocus = () => {
      // Clear any existing timeout
      if (timeoutId) clearTimeout(timeoutId);

      // Wait for keyboard to appear before scrolling
      timeoutId = setTimeout(() => {
        if (!element) return;

        // If offset is needed, calculate manual scroll position
        if (offset !== 0) {
          const rect = element.getBoundingClientRect();
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          const targetPosition = rect.top + scrollTop - offset;

          window.scrollTo({
            top: targetPosition,
            behavior,
          });
        } else {
          // Use native scrollIntoView
          element.scrollIntoView({
            behavior,
            block,
            inline: 'nearest',
          });
        }
      }, delay);
    };

    element.addEventListener('focus', handleFocus);

    return () => {
      element.removeEventListener('focus', handleFocus);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [ref, enabled, delay, behavior, block, offset]);
};

/**
 * Hook to automatically scroll all input/textarea elements within a container into view when focused
 *
 * @example
 * ```tsx
 * const formRef = useRef<HTMLFormElement>(null);
 * useScrollIntoViewForInputs(formRef);
 *
 * return (
 *   <form ref={formRef}>
 *     <input type="email" />
 *     <textarea />
 *   </form>
 * );
 * ```
 */
export const useScrollIntoViewForInputs = <T extends HTMLElement>(
  containerRef: RefObject<T>,
  options: UseScrollIntoViewOptions = {}
) => {
  const {
    enabled = true,
    delay = 300,
    behavior = 'smooth',
    block = 'center',
    offset = 0,
  } = options;

  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;
    const timeouts = new Map<HTMLElement, NodeJS.Timeout>();

    const handleFocus = (event: FocusEvent) => {
      const target = event.target as HTMLElement;

      // Check if target is an input element
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('[contenteditable="true"]');

      if (!isInput) return;

      // Clear any existing timeout for this element
      const existingTimeout = timeouts.get(target);
      if (existingTimeout) clearTimeout(existingTimeout);

      // Wait for keyboard to appear before scrolling
      const timeoutId = setTimeout(() => {
        if (offset !== 0) {
          const rect = target.getBoundingClientRect();
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          const targetPosition = rect.top + scrollTop - offset;

          window.scrollTo({
            top: targetPosition,
            behavior,
          });
        } else {
          target.scrollIntoView({
            behavior,
            block,
            inline: 'nearest',
          });
        }

        timeouts.delete(target);
      }, delay);

      timeouts.set(target, timeoutId);
    };

    // Use capturing phase to catch focus events on all children
    container.addEventListener('focus', handleFocus, true);

    return () => {
      container.removeEventListener('focus', handleFocus, true);
      timeouts.forEach(timeout => clearTimeout(timeout));
      timeouts.clear();
    };
  }, [containerRef, enabled, delay, behavior, block, offset]);
};

export default useScrollIntoView;
