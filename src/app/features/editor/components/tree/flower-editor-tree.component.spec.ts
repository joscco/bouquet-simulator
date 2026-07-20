import {TestBed} from '@angular/core/testing';
import {ComponentRef} from '@angular/core';
import {describe, expect, it} from 'vitest';
import {FlowerDefinition} from '../../../../core/models/flower.models';
import {FlowerEditorTreeComponent} from './flower-editor-tree.component';

describe('FlowerEditorTreeComponent compact interactions', () => {
  it('selects a repeat node on press and starts connecting only after dragging', () => {
    TestBed.configureTestingModule({imports: [FlowerEditorTreeComponent]});
    const fixture = TestBed.createComponent(FlowerEditorTreeComponent);
    setInputs(fixture.componentRef, repeatDefinition());
    const selections: string[] = [];
    fixture.componentInstance.nodeSelection.subscribe(({id}) => selections.push(id));

    fixture.componentInstance.startCompactNodeInteraction(pointer('pointerdown', 10, 10), 'loop');

    expect(selections).toEqual(['loop']);
    expect(fixture.componentInstance.connectionDrag()).toBeNull();

    fixture.componentInstance.graphPointerMove(pointer('pointermove', 14, 10));
    expect(fixture.componentInstance.connectionDrag()).toBeNull();

    fixture.componentInstance.graphPointerMove(pointer('pointermove', 17, 10));
    expect(fixture.componentInstance.connectionDrag()?.sourceId).toBe('loop');
  });

  it('renders a repetition as a labeled region around its members', () => {
    TestBed.configureTestingModule({imports: [FlowerEditorTreeComponent]});
    const fixture = TestBed.createComponent(FlowerEditorTreeComponent);
    setInputs(fixture.componentRef, repeatDefinition());

    const loops = fixture.componentInstance.compactGraph().loops;

    expect(loops).toHaveLength(1);
    expect(loops[0].label).toBe('↻ 2–4×');
    expect(loops[0].width).toBeGreaterThanOrEqual(148);
    expect(loops[0].height).toBeGreaterThanOrEqual(116);
    expect(loops[0].inputPoint).toEqual(expect.objectContaining({x: expect.any(Number), y: expect.any(Number)}));
    expect(loops[0].outputPoints).toHaveLength(1);
  });

  it('resets only the compact camera without changing automatic node positions', () => {
    TestBed.configureTestingModule({imports: [FlowerEditorTreeComponent]});
    const fixture = TestBed.createComponent(FlowerEditorTreeComponent);
    setInputs(fixture.componentRef, repeatDefinition());
    const positionsBefore = fixture.componentInstance.compactGraph().nodes.map(({id, x, y}) => ({id, x, y}));
    fixture.componentInstance.graphZoom.set(2.25);
    fixture.componentInstance.graphCenter.set({x: 40, y: 70});

    fixture.componentInstance.resetCompactView();

    expect(fixture.componentInstance.graphZoom()).toBe(1);
    expect(fixture.componentInstance.graphCenter()).toEqual({x: 150, y: 95});
    expect(fixture.componentInstance.compactGraph().nodes.map(({id, x, y}) => ({id, x, y})))
      .toEqual(positionsBefore);
  });

  it('rotates positions, ports and connections for a horizontal layout', () => {
    TestBed.configureTestingModule({imports: [FlowerEditorTreeComponent]});
    const fixture = TestBed.createComponent(FlowerEditorTreeComponent);
    setInputs(fixture.componentRef, connectedDefinition());
    fixture.componentRef.setInput('compactLayoutDirection', 'vertical');

    const vertical = fixture.componentInstance.compactGraph();
    const verticalRoot = vertical.nodes.find((node) => node.id === 'root')!;
    const verticalChild = vertical.nodes.find((node) => node.id === 'child')!;
    expect(verticalRoot.y).toBeGreaterThan(verticalChild.y);
    expect(verticalRoot.compactOutputPoints[0].y).toBeLessThan(verticalRoot.y);

    fixture.componentRef.setInput('compactLayoutDirection', 'horizontal');
    const horizontal = fixture.componentInstance.compactGraph();
    const horizontalRoot = horizontal.nodes.find((node) => node.id === 'root')!;
    const horizontalChild = horizontal.nodes.find((node) => node.id === 'child')!;
    expect(horizontalRoot.x).toBeLessThan(horizontalChild.x);
    expect(horizontalRoot.compactOutputPoints[0].x).toBeGreaterThan(horizontalRoot.x);
    expect(horizontalChild.compactInputPoint.x).toBeLessThan(horizontalChild.x);
    expect(horizontal.edges).toHaveLength(1);
  });

  it('shows a node label for the selection and temporarily for a hovered node', () => {
    TestBed.configureTestingModule({imports: [FlowerEditorTreeComponent]});
    const fixture = TestBed.createComponent(FlowerEditorTreeComponent);
    setInputs(fixture.componentRef, repeatDefinition());

    expect(fixture.componentInstance.showCompactNodeTooltip('loop')).toBe(true);
    expect(fixture.componentInstance.showCompactNodeTooltip('member')).toBe(false);

    fixture.componentInstance.setCompactNodeHovered('member', true);
    expect(fixture.componentInstance.showCompactNodeTooltip('member')).toBe(true);

    fixture.componentInstance.setCompactNodeHovered('member', false);
    expect(fixture.componentInstance.showCompactNodeTooltip('member')).toBe(false);
  });
});

function setInputs(
  componentRef: ComponentRef<FlowerEditorTreeComponent>,
  definition: FlowerDefinition,
): void {
  componentRef.setInput('definition', definition);
  componentRef.setInput('layoutDefinition', definition);
  componentRef.setInput('positions', {});
  componentRef.setInput('selectedNodeId', 'loop');
}

function connectedDefinition(): FlowerDefinition {
  return {
    schemaVersion: 2,
    id: 'connected-test',
    name: 'Connected test',
    rootNodeId: 'root',
    stem: {color: '#426f50', highlightColor: '#82a878', width: 8, taper: 1},
    nodes: [
      {id: 'root', name: 'Root', draggable: false, graphic: null, connections: [{childId: 'child'}]},
      {id: 'child', name: 'Child', draggable: false, graphic: null, connections: []},
    ],
  };
}

function repeatDefinition(): FlowerDefinition {
  return {
    schemaVersion: 2,
    id: 'repeat-test',
    name: 'Repeat test',
    rootNodeId: 'loop',
    stem: {
      color: '#426f50',
      highlightColor: '#82a878',
      width: 8,
      taper: 1,
    },
    nodes: [
      {
        id: 'loop',
        name: 'Wiederholung',
        draggable: false,
        graphic: null,
        connections: [],
        loop: {
          repeat: {min: 2, max: 4},
          startNodeId: 'member',
          endNodeId: 'member',
          memberNodeIds: ['member'],
        },
      },
      {
        id: 'member',
        name: 'Blatt',
        draggable: false,
        graphic: null,
        connections: [],
      },
    ],
  };
}

function pointer(type: string, clientX: number, clientY: number): PointerEvent {
  return {
    type,
    button: 0,
    pointerId: 1,
    pointerType: 'mouse',
    shiftKey: false,
    clientX,
    clientY,
    stopPropagation: () => undefined,
    currentTarget: {setPointerCapture: () => undefined},
  } as unknown as PointerEvent;
}
