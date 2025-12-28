import { type UseTabProps, useTabsContext, useTabsDescendant } from "@chakra-ui/react";
const callAllHandlers =
  <Args extends unknown[]>(
    ...handlers: Array<((...args: Args) => void) | undefined>
  ) =>
  (...args: Args) => {
    handlers.forEach((handler) => handler?.(...args));
  };

const mergeRefs =
  <T>(...refs: Array<React.Ref<T> | undefined>) =>
  (value: T) => {
    refs.forEach((ref) => {
      if (!ref) return;
      if (typeof ref === "function") {
        ref(value);
      } else {
        try {
          (ref as React.MutableRefObject<T | null>).current = value;
        } catch {}
      }
    });
  };

/**
 * Adapted from https://github.com/chakra-ui/chakra-ui/blob/main/packages/components/tabs/src/use-tabs.ts
 * (modified to return more information from useTabsDescendant)
 */
export function useTab<P extends UseTabProps>(props: P) {
  const { isDisabled = false, isFocusable = false, ...htmlProps } = props;

  const { setSelectedIndex, isManual, id, setFocusedIndex, selectedIndex } =
    useTabsContext();

  const { index, register, descendants } = useTabsDescendant({
    disabled: isDisabled && !isFocusable,
  });

  const isSelected = index === selectedIndex;

  const onClick = () => {
    setSelectedIndex(index);
  };

  const onFocus = () => {
    setFocusedIndex(index);
    const isDisabledButFocusable = isDisabled && isFocusable;
    const shouldSelect = !isManual && !isDisabledButFocusable;
    if (shouldSelect) {
      setSelectedIndex(index);
    }
  };

  const mergedRef = mergeRefs(register, props.ref);

  const type: "button" | "submit" | "reset" = "button";

  return {
    ...htmlProps,
    ref: mergedRef,
    id: makeTabId(id, index),
    role: "tab",
    tabIndex: isSelected ? 0 : -1,
    type,
    index,
    count: descendants.count(),
    "aria-selected": isSelected,
    "aria-controls": makeTabPanelId(id, index),
    onClick: callAllHandlers(props.onClick, onClick),
    onFocus: isDisabled ? undefined : callAllHandlers(props.onFocus, onFocus),
  };
}

function makeTabId(id: string, index: number) {
  return `${id}--tab-${index}`;
}

function makeTabPanelId(id: string, index: number) {
  return `${id}--tabpanel-${index}`;
}
