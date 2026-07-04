import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  OnDestroy,
  Output,
  ViewChild,
  effect,
  input,
} from '@angular/core';
import {
  Application,
  Assets,
  Container,
  FederatedPointerEvent,
  Graphics,
  Rectangle,
  Sprite,
  Texture,
} from 'pixi.js';
import {BouquetState, FlowerDefinition, FlowerNodeDefinition} from '../../core/models/flower.models';
import {FlowerTreeNode, generateFlowerTree} from '../../core/rendering/flower-tree';
import {projectFlower} from '../../core/rendering/projection';

@Component({
  selector: 'app-bouquet-canvas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {'class': 'bouquet-canvas-host'},
  template: '<div #canvasHost class="canvas-mount" aria-label="Interaktive Straußansicht"></div>',
})
export class BouquetCanvasComponent implements AfterViewInit, OnDestroy {
  readonly state = input.required<BouquetState>();
  readonly definitions = input.required<FlowerDefinition[]>();
  readonly selectedId = input<string | null>(null);

  @Output() readonly nodeDrag = new EventEmitter<{instanceId: string; nodeId: string; dx: number; dy: number}>();
  @Output() readonly rotateDrag = new EventEmitter<number>();
  @Output() readonly selectionChange = new EventEmitter<string | null>();

  @ViewChild('canvasHost', {static: true}) private readonly canvasHost!: ElementRef<HTMLDivElement>;

  private app: Application | null = null;
  private renderVersion = 0;
  private readonly textureCache = new Map<string, Promise<Texture>>();
  private backgroundDrag: {pointerId: number; x: number} | null = null;
  private nodeDragState: {
    pointerId: number;
    instanceId: string;
    nodeId: string;
    x: number;
    y: number;
    localScale: number;
  } | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    effect(() => {
      this.state();
      this.definitions();
      this.selectedId();
      void this.rebuildScene();
    });
  }

  async ngAfterViewInit(): Promise<void> {
    const app = new Application();
    await app.init({
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(devicePixelRatio, 2),
      resizeTo: this.canvasHost.nativeElement,
    });
    this.app = app;
    this.canvasHost.nativeElement.appendChild(app.canvas);
    app.stage.eventMode = 'static';
    app.stage.hitArea = new Rectangle(0, 0, app.screen.width, app.screen.height);
    app.stage.on('pointerdown', this.onBackgroundPointerDown);
    app.stage.on('globalpointermove', this.onBackgroundPointerMove);
    app.stage.on('pointerup', this.onBackgroundPointerUp);
    app.stage.on('pointerupoutside', this.onBackgroundPointerUp);
    this.resizeObserver = new ResizeObserver(() => void this.rebuildScene());
    this.resizeObserver.observe(this.canvasHost.nativeElement);
    await this.rebuildScene();
  }

  ngOnDestroy(): void {
    this.renderVersion++;
    this.resizeObserver?.disconnect();
    this.app?.destroy(true, {children: true, texture: false});
    this.app = null;
  }

  private readonly onBackgroundPointerDown = (event: FederatedPointerEvent): void => {
    this.backgroundDrag = {pointerId: event.pointerId, x: event.global.x};
    this.selectionChange.emit(null);
  };

  private readonly onBackgroundPointerMove = (event: FederatedPointerEvent): void => {
    if (this.nodeDragState?.pointerId === event.pointerId) {
      const dx = (event.global.x - this.nodeDragState.x) / this.nodeDragState.localScale;
      const dy = (event.global.y - this.nodeDragState.y) / this.nodeDragState.localScale;
      this.nodeDragState.x = event.global.x;
      this.nodeDragState.y = event.global.y;
      this.nodeDrag.emit({
        instanceId: this.nodeDragState.instanceId,
        nodeId: this.nodeDragState.nodeId,
        dx,
        dy,
      });
      return;
    }
    if (!this.backgroundDrag || event.pointerId !== this.backgroundDrag.pointerId) return;
    const dx = event.global.x - this.backgroundDrag.x;
    this.backgroundDrag.x = event.global.x;
    this.rotateDrag.emit(dx * 0.008);
  };

  private readonly onBackgroundPointerUp = (event: FederatedPointerEvent): void => {
    if (this.backgroundDrag?.pointerId === event.pointerId) this.backgroundDrag = null;
    if (this.nodeDragState?.pointerId === event.pointerId) this.nodeDragState = null;
  };

  private async rebuildScene(): Promise<void> {
    const app = this.app;
    if (!app) return;
    const version = ++this.renderVersion;
    const definitions = new Map(this.definitions().map((definition) => [definition.id, definition]));
    const projected = this.state().flowers
      .map((flower) => projectFlower(flower, this.state().rotation))
      .sort((first, second) => first.depth - second.depth);

    const scene = new Container();
    const ground = this.createGround(app.screen.width, app.screen.height);
    scene.addChild(ground);

    for (const flower of projected) {
      const definition = definitions.get(flower.definitionId);
      if (!definition) continue;
      const localScale = flower.scale * flower.perspective;
      const sourceFlower = this.state().flowers.find((candidate) => candidate.instanceId === flower.instanceId);
      const node = await this.createFlower(
        definition,
        flower.instanceId,
        flower.seed,
        sourceFlower?.nodeOffsets ?? {},
        localScale,
      );
      if (version !== this.renderVersion) {
        scene.destroy({children: true});
        return;
      }
      node.x = app.screen.width / 2 + flower.viewX;
      node.y = app.screen.height - 76 + flower.viewY;
      node.scale.set(localScale);
      node.alpha = 0.96 + flower.perspective * 0.03;
      scene.addChild(node);
    }

    if (version !== this.renderVersion) {
      scene.destroy({children: true});
      return;
    }
    app.stage.removeChildren().forEach((child) => child.destroy({children: true}));
    app.stage.addChild(scene);
    app.stage.hitArea = new Rectangle(0, 0, app.screen.width, app.screen.height);
  }

  private createGround(width: number, height: number): Graphics {
    const centerX = width / 2;
    const centerY = height - 60;
    return new Graphics()
      .ellipse(centerX, centerY, Math.min(width * 0.34, 280), 28)
      .fill({color: '#725d45', alpha: 0.09});
  }

  private async createFlower(
    definition: FlowerDefinition,
    instanceId: string,
    seed: number,
    nodeOffsets: Record<string, {x: number; y: number}>,
    localScale: number,
  ): Promise<Container> {
    const node = new Container();
    const stem = definition.stem;
    const templates = new Map(definition.nodes.map((template) => [template.id, template]));
    const textureEntries = await Promise.all(definition.nodes
      .filter((template) => template.graphic)
      .map(async (template) => [template.id, await this.loadSvg(template.graphic!.svg)] as const));
    const textures = new Map(textureEntries);
    const tree = generateFlowerTree(definition, seed, nodeOffsets);
    const treeNodes = new Map(tree.nodes.map((treeNode) => [treeNode.id, treeNode]));

    const skeleton = new Graphics();
    for (const edge of tree.edges) {
      const from = this.requiredTreeNode(treeNodes, edge.from);
      const to = this.requiredTreeNode(treeNodes, edge.to);
      const depthScale = Math.max(0.24, Math.pow(stem.taper, Math.max(0, from.depth - 1)));
      const width = Math.max(1.1, stem.width * depthScale);
      skeleton
        .moveTo(from.x, from.y)
        .lineTo(to.x, to.y)
        .stroke({color: stem.color, width, cap: 'round', join: 'round'});
      skeleton
        .moveTo(from.x - width * 0.12, from.y)
        .lineTo(to.x - width * 0.12, to.y)
        .stroke({
          color: stem.highlightColor,
          width: Math.max(0.8, width * 0.18),
          alpha: 0.65,
          cap: 'round',
        });
    }
    node.addChild(skeleton);

    for (const treeNode of [...tree.nodes].sort((first, second) => second.depth - first.depth)) {
      const template = templates.get(treeNode.templateId);
      const texture = textures.get(treeNode.templateId);
      if (!template?.graphic || !texture) continue;
      const sprite = new Sprite(texture);
      sprite.anchor.set(template.graphic.anchorX, template.graphic.anchorY);
      sprite.width = template.graphic.width;
      sprite.height = template.graphic.height;
      sprite.position.set(treeNode.x, treeNode.y);
      sprite.rotation = treeNode.angle + this.graphicRotation(template, treeNode.id, seed);
      node.addChild(sprite);
    }

    const graphicMargin = Math.max(20, ...definition.nodes.map((template) =>
      template.graphic ? Math.max(template.graphic.width, template.graphic.height) * 0.55 : 0));
    const minimumX = Math.min(...tree.nodes.map((treeNode) => treeNode.x)) - graphicMargin;
    const maximumX = Math.max(...tree.nodes.map((treeNode) => treeNode.x)) + graphicMargin;
    const minimumY = Math.min(...tree.nodes.map((treeNode) => treeNode.y)) - graphicMargin;
    const maximumY = Math.max(...tree.nodes.map((treeNode) => treeNode.y), 8) + graphicMargin;
    if (this.selectedId() === instanceId) {
      node.addChild(
        new Graphics()
          .roundRect(minimumX, minimumY, maximumX - minimumX, maximumY - minimumY, 30)
          .stroke({color: '#2f6251', width: 2, alpha: 0.7}),
      );
    }

    node.eventMode = 'static';
    node.hitArea = new Rectangle(minimumX, minimumY, maximumX - minimumX, maximumY - minimumY);
    node.on('pointerdown', (event: FederatedPointerEvent) => {
      event.stopPropagation();
      this.selectionChange.emit(instanceId);
    });

    for (const treeNode of tree.nodes.filter((candidate) => candidate.draggable)) {
      const handle = new Graphics()
        .circle(treeNode.x, treeNode.y, this.selectedId() === instanceId ? 10 : 7)
        .fill({color: '#fffdf8', alpha: this.selectedId() === instanceId ? 0.92 : 0.62})
        .stroke({color: '#2f6251', width: 2, alpha: this.selectedId() === instanceId ? 0.9 : 0.42});
      handle.eventMode = 'static';
      handle.cursor = 'move';
      handle.on('pointerdown', (event: FederatedPointerEvent) => {
        event.stopPropagation();
        this.nodeDragState = {
          pointerId: event.pointerId,
          instanceId,
          nodeId: treeNode.id,
          x: event.global.x,
          y: event.global.y,
          localScale: Math.max(0.01, localScale),
        };
        this.selectionChange.emit(instanceId);
      });
      node.addChild(handle);
    }
    return node;
  }

  private requiredTreeNode(nodes: Map<string, FlowerTreeNode>, id: string): FlowerTreeNode {
    const node = nodes.get(id);
    if (!node) throw new Error(`Flower tree node "${id}" does not exist.`);
    return node;
  }

  private graphicRotation(template: FlowerNodeDefinition, generatedId: string, seed: number): number {
    const range = template.graphic!.rotation;
    const hash = [...generatedId].reduce((value, character) => ((value * 31) + character.charCodeAt(0)) | 0, 17);
    const unit = Math.abs(Math.sin(hash + seed * 9973) * 43758.5453) % 1;
    return (range.min + unit * (range.max - range.min)) * Math.PI / 180;
  }

  private loadSvg(svg: string): Promise<Texture> {
    let texture = this.textureCache.get(svg);
    if (!texture) {
      const url = svg.startsWith('data:')
        ? svg
        : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.trim())}`;
      texture = Assets.load<Texture>(url);
      this.textureCache.set(svg, texture);
    }
    return texture;
  }
}
