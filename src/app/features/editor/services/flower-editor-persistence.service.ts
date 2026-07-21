import {Injectable, inject, isDevMode} from '@angular/core';
import {FlowerDefinition} from '../../../core/models/flower.models';
import {validateFlowerDefinition} from '../../../core/models/flower-validation';
import {BouquetStore} from '../../../core/state/bouquet.store';
import {FlowerDefinitionStorage} from '../../../core/state/flower-definition-storage.service';
import {upsertFlowerDefinition} from '../domain/flower-editor-catalog';
import {definitionIdIsOccupied} from '../../../core/models/flower-definition-ids';
import {EditorNotifications} from './editor-notifications.service';
import {writeDefaultFlowerPreview} from '../../../shared/flower-thumbnail/default-flower-preview-writer';
import {FlowerThumbnailCache} from '../../../shared/flower-thumbnail/flower-thumbnail-cache.service';
import {
  isDefaultFlowerDefinitionId,
  upsertBuiltInFlowerDefinition,
} from '../../../core/data/default-flower-catalog';

@Injectable()
export class FlowerEditorPersistence {
  private readonly store = inject(BouquetStore);
  private readonly storage = inject(FlowerDefinitionStorage);
  private readonly notifications = inject(EditorNotifications);
  private readonly thumbnailCache = inject(FlowerThumbnailCache);
  private readonly development = isDevMode();

  saveToBrowser(definition: FlowerDefinition, previousId = definition.id): boolean {
    if (isDefaultFlowerDefinitionId(previousId)) {
      this.showError('Standard-Blumen sind schreibgeschützt. Bitte zuerst eine Kopie anlegen.');
      return false;
    }
    if (isDefaultFlowerDefinitionId(definition.id)) {
      this.showError(`Speichern nicht möglich: Die Blumen-ID „${definition.id}“ ist für eine Standard-Blume reserviert.`);
      return false;
    }
    const validationError = firstValidationError(definition);
    if (validationError) {
      this.showError(`Speichern nicht möglich: ${validationError}`);
      return false;
    }
    if (definitionIdIsOccupied(this.store.definitions(), definition.id, previousId)) {
      this.showError(`Speichern nicht möglich: Die Blumen-ID „${definition.id}“ ist bereits vergeben.`);
      return false;
    }
    const definitions = upsertFlowerDefinition(this.store.definitions(), definition, previousId);
    try {
      this.storage.saveDefinitions(definitions);
      this.store.replaceDefinition(definition, previousId);
      this.notifications.show('Im Browser gespeichert.');
      return true;
    } catch (error: unknown) {
      this.showError(error instanceof Error
        ? `Speichern fehlgeschlagen: ${error.message}`
        : 'Speichern fehlgeschlagen.');
      return false;
    }
  }

  async saveToDefaults(
    definition: FlowerDefinition,
    previousId = definition.id,
    preview?: {definition: FlowerDefinition; blob: Blob},
  ): Promise<boolean> {
    if (!this.development) return false;
    const validationError = firstValidationError(definition);
    if (validationError) {
      this.showError(`Übernahme nicht möglich: ${validationError}`);
      return false;
    }
    if (definitionIdIsOccupied(this.store.definitions(), definition.id, previousId)) {
      this.showError(`Übernahme nicht möglich: Die Blumen-ID „${definition.id}“ ist bereits vergeben.`);
      return false;
    }
    const definitions = upsertBuiltInFlowerDefinition(definition, previousId);
    try {
      await writeDefinitionsToDefaults(definitions);
      if (preview) await writeDefaultFlowerPreview(preview.definition, preview.blob);
      this.store.replaceDefinition(definition, previousId);
      this.notifications.show('Als Standard-Blume gespeichert.');
      return true;
    } catch (error: unknown) {
      this.showError(error instanceof Error
        ? `Übernahme in Defaults fehlgeschlagen: ${error.message}`
        : 'Übernahme in Defaults fehlgeschlagen.');
      return false;
    }
  }

  deleteDefinition(definition: FlowerDefinition): FlowerDefinition | null | undefined {
    if (isDefaultFlowerDefinitionId(definition.id)) {
      this.notifications.show('Standard-Blumen können nicht gelöscht werden.');
      return undefined;
    }
    if (this.store.definitions().length <= 1) {
      this.notifications.show('Mindestens eine Definition muss erhalten bleiben.');
      return undefined;
    }
    if (!confirmDefinitionDeletion(this.store, definition)) return undefined;

    const definitions = this.store.definitions().filter((candidate) => candidate.id !== definition.id);
    try {
      this.storage.saveDefinitions(definitions);
      this.store.removeDefinition(definition.id);
      void this.thumbnailCache.deleteDefinition(definition.id);
      this.notifications.show(`„${definition.name}“ wurde gelöscht.`);
      return definitions[0] ?? null;
    } catch (error: unknown) {
      this.showError(error instanceof Error
        ? `Löschen fehlgeschlagen: ${error.message}`
        : 'Löschen fehlgeschlagen.');
      return undefined;
    }
  }

  private showError(message: string): void {
    this.notifications.show(message, 'error');
  }
}

function firstValidationError(definition: FlowerDefinition): string | null {
  return validateFlowerDefinition(definition)
    .find((issue) => issue.severity === 'error')?.message ?? null;
}

async function writeDefinitionsToDefaults(definitions: FlowerDefinition[]): Promise<void> {
  const response = await fetch('/api/defaults', {
    method: 'PUT',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify(definitions),
  });
  if (response.ok) return;
  const body = await response.json().catch(() => null) as {error?: string} | null;
  throw new Error(body?.error ?? `Defaults-Server antwortet mit ${response.status}.`);
}

function confirmDefinitionDeletion(store: BouquetStore, definition: FlowerDefinition): boolean {
  const usage = store.definitionUsage(definition.id);
  const usageLines: string[] = [];
  if (usage.bouquetInstances > 0) {
    usageLines.push(
      `${usage.bouquetInstances} ${usage.bouquetInstances === 1
        ? 'Blume im aktuellen Strauß wird'
        : 'Blumen im aktuellen Strauß werden'} ebenfalls entfernt.`,
    );
  }
  if (usage.componentDefinitions.length > 0) {
    usageLines.push(
      `Als Teilkomponente verwendet in: ${usage.componentDefinitions
        .map((entry) => entry.name).join(', ')}. Die dort eingebetteten Kopien bleiben erhalten.`,
    );
  }
  const warning = usageLines.length
    ? `„${definition.name}“ wird aktuell verwendet.\n\n${usageLines.join('\n')}\n\nDefinition trotzdem löschen?`
    : `Definition „${definition.name}“ wirklich löschen?`;
  if (!globalThis.confirm(warning)) return false;
  return !usageLines.length || globalThis.confirm(
    `„${definition.name}“ ist in Benutzung. Das Löschen jetzt endgültig bestätigen.`,
  );
}
