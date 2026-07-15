export type BouquetVideoFormatId = 'square' | 'portrait' | 'landscape';

export interface BouquetVideoFormat {
  id: BouquetVideoFormatId;
  name: string;
  ratio: string;
  width: number;
  height: number;
}

export const DEFAULT_BOUQUET_VIDEO_FORMAT_ID: BouquetVideoFormatId = 'square';

export const BOUQUET_VIDEO_FORMAT_OPTIONS: readonly BouquetVideoFormat[] = [
  {id: 'square', name: 'Quadrat', ratio: '1:1', width: 1080, height: 1080},
  {id: 'portrait', name: 'Story', ratio: '9:16', width: 1080, height: 1920},
  {id: 'landscape', name: 'Querformat', ratio: '16:9', width: 1920, height: 1080},
];

export function bouquetVideoFormat(formatId: BouquetVideoFormatId): BouquetVideoFormat {
  return BOUQUET_VIDEO_FORMAT_OPTIONS.find((format) => format.id === formatId)
    ?? BOUQUET_VIDEO_FORMAT_OPTIONS[0]!;
}
