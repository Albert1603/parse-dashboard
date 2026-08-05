/**
 * @jest-environment jsdom
 */
/*
 * Copyright (c) 2016-present, Parse, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */
jest.dontMock('../../components/BrowserCell/PointerArrayPreview.react');
jest.dontMock('../../components/Pill/Pill.react');
jest.dontMock('../../components/Icon/Icon.react');
jest.dontMock('../Position');

jest.mock('../../components/Popover/Popover.react', () => {
  const React = require('react');
  return function Popover({ children, onExternalClick }) {
    return (
      <div data-testid="popover" onClick={onExternalClick}>
        {children}
      </div>
    );
  };
});

import React, { act } from 'react';
import renderer from 'react-test-renderer';
global.IS_REACT_ACT_ENVIRONMENT = true;
const PointerArrayPreview =
  require('../../components/BrowserCell/PointerArrayPreview.react').default;
const { isPointerValue } = require('../../components/BrowserCell/PointerArrayPreview.react');

const pointerA = {
  __type: 'Pointer',
  className: 'TargetA',
  objectId: 'pointerA',
};
const pointerB = {
  __type: 'Pointer',
  className: 'TargetB',
  objectId: 'pointerB',
};
const values = [{ label: 'Generic object' }, pointerA, ['nested', { value: 42 }], pointerB, null];

const getText = node =>
  node.children.map(child => (typeof child === 'string' ? child : getText(child))).join('');

const renderPreview = (onPointerClick, previewValues = values) => {
  let component;
  act(() => {
    component = renderer.create(
      <PointerArrayPreview onPointerClick={onPointerClick} values={previewValues} />,
      {
        createNodeMock: () => ({
          focus: jest.fn(),
          getBoundingClientRect: () => ({
            bottom: 130,
            height: 20,
            left: 100,
            right: 400,
            top: 110,
            width: 300,
          }),
          querySelector: () => null,
        }),
      }
    );
  });
  return component;
};

describe('PointerArrayPreview', () => {
  it('validates complete Parse Pointer values', () => {
    expect(isPointerValue(pointerA)).toBe(true);
    expect(isPointerValue({ __type: 'Pointer', className: 'TargetA' })).toBe(false);
    expect(isPointerValue({ label: 'Generic object' })).toBe(false);
    expect(isPointerValue(null)).toBe(false);
  });

  it('shows the first pointer and the number of remaining array items', () => {
    const component = renderPreview(jest.fn());
    const moreButton = component.root.findByProps({
      'aria-label': 'Show all 5 array items',
    });

    expect(JSON.stringify(component.toJSON())).toContain('pointerA');
    expect(moreButton.children.join('')).toBe('+4');
    expect(component.root.findAllByProps({ 'data-testid': 'popover' })).toHaveLength(0);
  });

  it('renders mixed values in their original order when expanded', () => {
    const component = renderPreview(jest.fn());
    const moreButton = component.root.findByProps({
      'aria-label': 'Show all 5 array items',
    });

    act(() => moreButton.props.onClick({ stopPropagation: jest.fn() }));

    const rows = component.root.findAllByType('li');
    expect(rows).toHaveLength(values.length);
    expect(getText(rows[0])).toContain('Generic object');
    expect(getText(rows[1])).toContain('pointerA');
    expect(getText(rows[2])).toContain('Array (2)');
    expect(getText(rows[3])).toContain('pointerB');
    expect(getText(rows[4])).toContain('Null');
  });

  it('sizes the index column for the widest array index', () => {
    const expand = previewValues => {
      const component = renderPreview(jest.fn(), previewValues);
      const moreButton = component.root.findByProps({
        'aria-label': `Show all ${previewValues.length} array items`,
      });
      act(() => moreButton.props.onClick({ stopPropagation: jest.fn() }));
      return component.root.findByType('ol').props.style['--pointer-array-index-digits'];
    };

    expect(expand(values)).toBe(1);
    expect(expand([pointerA, ...Array.from({ length: 10 }, (_, index) => index)])).toBe(2);
    expect(expand([pointerA, ...Array.from({ length: 100 }, (_, index) => index)])).toBe(3);
  });

  it('opens the selected pointer with its class and object id', () => {
    const onPointerClick = jest.fn();
    const component = renderPreview(onPointerClick);
    const moreButton = component.root.findByProps({
      'aria-label': 'Show all 5 array items',
    });

    act(() => moreButton.props.onClick({ stopPropagation: jest.fn() }));
    const pointerButton = component.root.findByProps({
      'aria-label': 'Open pointer TargetB pointerB',
    });
    act(() => pointerButton.props.onClick());

    expect(onPointerClick).toHaveBeenCalledTimes(1);
    expect(onPointerClick.mock.calls[0][0].className).toBe('TargetB');
    expect(onPointerClick.mock.calls[0][0].id).toBe('pointerB');
  });

  it('closes the expanded preview on external click', () => {
    const component = renderPreview(jest.fn());
    const moreButton = component.root.findByProps({
      'aria-label': 'Show all 5 array items',
    });

    act(() => moreButton.props.onClick({ stopPropagation: jest.fn() }));
    const popover = component.root.findByProps({ 'data-testid': 'popover' });
    act(() => popover.props.onClick());

    expect(component.root.findAllByProps({ 'data-testid': 'popover' })).toHaveLength(0);
  });
});
