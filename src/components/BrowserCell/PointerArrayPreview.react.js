/*
 * Copyright (c) 2016-present, Parse, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */
import Icon from 'components/Icon/Icon.react';
import Parse from 'parse';
import Pill from 'components/Pill/Pill.react';
import Popover from 'components/Popover/Popover.react';
import Position from 'lib/Position';
import PropTypes from 'lib/PropTypes';
import React from 'react';
import styles from 'components/BrowserCell/PointerArrayPreview.scss';

const POPOVER_MAX_HEIGHT = 320;
const POPOVER_MAX_WIDTH = 420;
const POPOVER_MIN_WIDTH = 400;
const VALUE_PREVIEW_MAX_LENGTH = 160;
const VIEWPORT_MARGIN = 8;

export const isPointerValue = value =>
  !!(
    value &&
    typeof value === 'object' &&
    value.__type === 'Pointer' &&
    value.className &&
    value.objectId
  );

const createPointerObject = value => {
  const object = new Parse.Object(value.className);
  object.id = value.objectId;
  return object;
};

const stringifyValue = value => {
  if (value === undefined) {
    return 'undefined';
  }
  const stringified = JSON.stringify(value);
  const result = stringified === undefined ? String(value) : stringified;
  return result.length > VALUE_PREVIEW_MAX_LENGTH
    ? `${result.slice(0, VALUE_PREVIEW_MAX_LENGTH - 1)}…`
    : result;
};

const getValueType = value => {
  if (Array.isArray(value)) {
    return `Array (${value.length})`;
  }
  if (value === null) {
    return 'Null';
  }
  if (value === undefined) {
    return 'Undefined';
  }
  if (typeof value === 'object') {
    return 'Object';
  }
  return `${typeof value}`.replace(/^\w/, firstLetter => firstLetter.toUpperCase());
};

const getPopoverLayout = node => {
  const rect = node.getBoundingClientRect();
  const viewportWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
  const viewportHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
  const availableWidth = viewportWidth - VIEWPORT_MARGIN * 2;
  const width = Math.min(
    POPOVER_MAX_WIDTH,
    availableWidth,
    Math.max(POPOVER_MIN_WIDTH, rect.width)
  );
  const x = Math.max(VIEWPORT_MARGIN, Math.min(rect.left, viewportWidth - width - VIEWPORT_MARGIN));
  const roomBelow = viewportHeight - rect.bottom - VIEWPORT_MARGIN;
  const roomAbove = rect.top - VIEWPORT_MARGIN;
  const above = roomBelow < 180 && roomAbove > roomBelow;
  const availableHeight = above ? roomAbove : roomBelow;

  return {
    above,
    maxHeight: Math.min(POPOVER_MAX_HEIGHT, Math.max(80, availableHeight)),
    position: new Position(x, above ? rect.top : rect.bottom),
    width,
  };
};

const ArrayValue = ({ index, value }) => (
  <li className={styles.valueRow}>
    <span className={styles.index}>{index}</span>
    <span className={styles.type}>{getValueType(value)}</span>
    <code className={styles.value}>{stringifyValue(value)}</code>
  </li>
);

const PointerValue = ({ index, onClick, value }) => (
  <li>
    <button
      aria-label={`Open pointer ${value.className} ${value.objectId}`}
      className={styles.pointerRow}
      data-pointer-array-link
      onClick={() => onClick(value)}
      type="button"
    >
      <span className={styles.index}>{index}</span>
      <span className={styles.type}>Pointer</span>
      <span className={styles.pointerValue}>
        <span className={styles.pointerClass}>{value.className}</span>
        <code>{value.objectId}</code>
      </span>
      <Icon name="right-outline" width={16} height={16} fill="#1669a1" />
    </button>
  </li>
);

const PointerArrayPreview = ({ onPointerClick, values }) => {
  const [open, setOpen] = React.useState(false);
  const popoverRef = React.useRef(null);
  const previewRef = React.useRef(null);
  const triggerRef = React.useRef(null);
  const popoverId = React.useId().replace(/:/g, '');

  const { firstPointer, pointerCount } = React.useMemo(() => {
    let firstPointer;
    let pointerCount = 0;
    for (const value of values) {
      if (isPointerValue(value)) {
        if (!firstPointer) {
          firstPointer = value;
        }
        pointerCount += 1;
      }
    }
    return { firstPointer, pointerCount };
  }, [values]);

  React.useEffect(() => {
    if (!open) {
      return;
    }
    popoverRef.current?.querySelector('[data-pointer-array-link]')?.focus();
    const handleKeyDown = event => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const closePopover = (restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) {
      triggerRef.current?.focus();
    }
  };

  const openPointer = value => {
    closePopover(false);
    onPointerClick(createPointerObject(value));
  };

  const layout = open && previewRef.current ? getPopoverLayout(previewRef.current) : null;
  const remainingItems = values.length - 1;
  // The index column fits the widest index, e.g. "[13]", so all rows stay aligned
  const indexDigits = String(Math.max(values.length - 1, 0)).length;

  return (
    <>
      <span className={styles.preview} ref={previewRef}>
        <span className={styles.firstPointer}>
          <Pill
            value={firstPointer.objectId}
            onClick={() => onPointerClick(createPointerObject(firstPointer))}
            followClick={true}
            shrinkablePill
          />
        </span>
        {remainingItems > 0 ? (
          <button
            aria-controls={popoverId}
            aria-expanded={open}
            aria-label={`Show all ${values.length} array items`}
            className={styles.more}
            onClick={event => {
              event.stopPropagation();
              setOpen(currentOpen => !currentOpen);
            }}
            onDoubleClick={event => event.stopPropagation()}
            ref={triggerRef}
            type="button"
          >
            +{remainingItems}
          </button>
        ) : null}
      </span>
      {layout ? (
        <Popover fixed={true} onExternalClick={() => closePopover()} position={layout.position}>
          <div
            aria-label={`Array contents, ${values.length} items`}
            className={[styles.popover, layout.above ? styles.above : null].join(' ')}
            id={popoverId}
            onClick={event => event.stopPropagation()}
            onDoubleClick={event => event.stopPropagation()}
            ref={popoverRef}
            role="dialog"
            style={{ maxHeight: layout.maxHeight, width: layout.width }}
          >
            <div className={styles.header}>
              <span>
                {values.length} items · {pointerCount} pointers
              </span>
              <button
                aria-label="Close array preview"
                className={styles.close}
                onClick={() => closePopover()}
                type="button"
              >
                ×
              </button>
            </div>
            <ol className={styles.list} style={{ '--pointer-array-index-digits': indexDigits }}>
              {values.map((value, index) =>
                isPointerValue(value) ? (
                  <PointerValue
                    index={index}
                    key={`${value.className}:${value.objectId}:${index}`}
                    onClick={openPointer}
                    value={value}
                  />
                ) : (
                  <ArrayValue index={index} key={index} value={value} />
                )
              )}
            </ol>
          </div>
        </Popover>
      ) : null}
    </>
  );
};

ArrayValue.propTypes = {
  index: PropTypes.number.isRequired.describe('The index of the value in the array.'),
  value: PropTypes.any.describe('The generic array value to preview.'),
};

PointerValue.propTypes = {
  index: PropTypes.number.isRequired.describe('The index of the pointer in the array.'),
  onClick: PropTypes.func.isRequired.describe('Opens the selected pointer.'),
  value: PropTypes.object.isRequired.describe('The raw Parse Pointer value.'),
};

PointerArrayPreview.propTypes = {
  onPointerClick: PropTypes.func.isRequired.describe('Opens a Parse Pointer.'),
  values: PropTypes.array.isRequired.describe('The raw values stored in the Parse Array.'),
};

export default PointerArrayPreview;
