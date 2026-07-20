import {TestBed} from '@angular/core/testing';
import {ComponentRef} from '@angular/core';
import {describe, expect, it} from 'vitest';
import {FlowerDefinition} from '../../../../core/models/flower.models';
import {FlowerEditorTreeComponent} from './flower-editor-tree.component';

describe('FlowerEditorTreeComponent compact interactions', () => {
  it('selects cards without starting a connection away from an output port', () => {
    TestBed.configureTestingModule({imports: [FlowerEditorTreeComponent]});
    const fixture = TestBed.createComponent(FlowerEditorTreeComponent);
    setInputs(fixture.componentRef, repeatDefinition());
    const selections: string[] = [];
    fixture.componentInstance.nodeSelection.subscribe(({id}) => selections.push(id));

    fixture.componentInstance.selectCompactNode(pointer('pointerdown', 10, 10), 'loop');

    expect(selections).toEqual(['loop']);
    expect(fixture.componentInstance.connectionDrag()).toBeNull();

    fixture.componentInstance.graphPointerMove(pointer('pointermove', 17, 10));
    expect(fixture.componentInstance.connectionDrag()).toBeNull();

    fixture.componentInstance.startCompactPortConnection(pointer('pointerdown', 17, 10), 'loop');
    expect(fixture.componentInstance.connectionDrag()?.sourceId).toBe('loop');
  });

  it('renders a repetition as a labeled region around its members', () => {
    TestBed.configureTestingModule({imports: [FlowerEditorTreeComponent]});
    const fixture = TestBed.createComponent(FlowerEditorTreeComponent);
    setInputs(fixture.componentRef, repeatDefinition());

    const loops = fixture.componentInstance.compactGraph().loops;

    expect(loops).toHaveLength(1);
    expect(loops[0].label).toBe('2–4×');
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
    expect(fixture.componentInstance.graphCenter()).not.toEqual({x: 40, y: 70});
    expect(Number.isFinite(fixture.componentInstance.graphCenter().x)).toBe(true);
    expect(Number.isFinite(fixture.componentInstance.graphCenter().y)).toBe(true);
    expect(fixture.componentInstance.compactGraph().nodes.map(({id, x, y}) => ({id, x, y})))
      .toEqual(positionsBefore);
  });

  it('automatically frames a newly selected flower instead of reusing the previous camera', () => {
    TestBed.configureTestingModule({imports: [FlowerEditorTreeComponent]});
    const fixture = TestBed.createComponent(FlowerEditorTreeComponent);
    setInputs(fixture.componentRef, connectedDefinition());
    fixture.componentInstance.zoomCompactView(1.8);

    expect(fixture.componentInstance.graphCameraDefinitionId()).toBe('connected-test');

    const nextDefinition = repeatDefinition();
    fixture.componentRef.setInput('definition', nextDefinition);
    fixture.componentRef.setInput('layoutDefinition', nextDefinition);
    const automaticallyFramedViewBox = fixture.componentInstance.graphViewBox();

    expect(fixture.componentInstance.graphCameraDefinitionId()).toBe('connected-test');
    fixture.componentInstance.resetCompactView();
    expect(fixture.componentInstance.graphCameraDefinitionId()).toBe('repeat-test');
    expect(fixture.componentInstance.graphViewBox()).toBe(automaticallyFramedViewBox);
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
    expect(horizontal.edges[0].start).toEqual(horizontalRoot.compactOutputPoints[0]);
    expect(horizontal.edges[0].end).toEqual(horizontalChild.compactInputPoint);
    expect(horizontal.edges[0].end.x - horizontal.edges[0].start.x).toBeGreaterThanOrEqual(36);
  });

  it('keeps enough visible room for vertical connections between node cards', () => {
    TestBed.configureTestingModule({imports: [FlowerEditorTreeComponent]});
    const fixture = TestBed.createComponent(FlowerEditorTreeComponent);
    setInputs(fixture.componentRef, connectedDefinition());
    fixture.componentRef.setInput('compactLayoutDirection', 'vertical');

    const graph = fixture.componentInstance.compactGraph();
    const edge = graph.edges[0];

    expect(edge.start.x).toBe(edge.end.x);
    expect(edge.start.y - edge.end.y).toBeGreaterThanOrEqual(36);
  });

  it('uses the same compact card size and truncated labels for every regular node', () => {
    TestBed.configureTestingModule({imports: [FlowerEditorTreeComponent]});
    const fixture = TestBed.createComponent(FlowerEditorTreeComponent);
    setInputs(fixture.componentRef, repeatDefinition());

    const graph = fixture.componentInstance.compactGraph();
    const member = graph.nodes.find((node) => node.id === 'member')!;
    const loop = graph.nodes.find((node) => node.id === 'loop')!;

    expect(member.compactWidth).toBe(112);
    expect(member.compactHeight).toBe(52);
    expect(loop.compactWidth).toBe(member.compactWidth);
    expect(loop.compactHeight).toBe(member.compactHeight);
    expect(member.compactLabel).toBe('Blatt');
    expect(member.compactType).toBe('KNOTEN');
  });

  it('shows repetition count, symbol and truncated name in one loop header line', () => {
    TestBed.configureTestingModule({imports: [FlowerEditorTreeComponent]});
    const fixture = TestBed.createComponent(FlowerEditorTreeComponent);
    const definition = repeatDefinition();
    definition.nodes[0] = {...definition.nodes[0]!, name: 'Sehr lange Wiederholungsbezeichnung'};
    setInputs(fixture.componentRef, definition);

    const loop = fixture.componentInstance.compactGraph().loops[0];

    expect(loop.label).toBe('2–4×');
    expect(loop.compactName).toBe('Sehr lange Wieder…');
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
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
    currentTarget: {setPointerCapture: () => undefined},
  } as unknown as PointerEvent;
}
