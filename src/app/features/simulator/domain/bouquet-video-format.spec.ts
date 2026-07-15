import {describe, expect, it} from 'vitest';
import {
  DEFAULT_BOUQUET_VIDEO_FORMAT_ID,
  bouquetVideoFormat,
} from './bouquet-video-format';

describe('bouquet video formats', () => {
  it('uses 1080 × 1080 as the default format', () => {
    expect(bouquetVideoFormat(DEFAULT_BOUQUET_VIDEO_FORMAT_ID))
      .toMatchObject({id: 'square', width: 1080, height: 1080});
  });

  it('provides portrait and landscape Full-HD formats', () => {
    expect(bouquetVideoFormat('portrait')).toMatchObject({width: 1080, height: 1920});
    expect(bouquetVideoFormat('landscape')).toMatchObject({width: 1920, height: 1080});
  });
});
