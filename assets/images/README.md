# Optimized public images

These derivatives use only the portrait and Clocky logo already in this public repository. The original root-level files are retained unchanged.

| Asset | Dimensions | Bytes |
| --- | --- | ---: |
| Original `profile.jpeg` | 4000 × 6000 | 1,256,552 |
| `profile-300.jpg` | 300 × 450 | 31,741 |
| `profile-600.jpg` | 600 × 900 | 95,689 |
| Original `logo_clocky.png` | 773 × 219, 76 frames | 2,377,064 |
| `clocky-optimized.png` | 773 × 219, 76 frames | 2,002,874 |

The portrait derivatives preserve the original aspect ratio and use high-quality bicubic resizing with JPEG quality 88. The homepage's existing square dimensions and `object-fit: cover` remain unchanged. Its `sizes` values match the 72px, 112px and 184px CSS widths; the 600px candidate supports the largest slot at up to 3× pixel density. Browser selection may vary with device density and cache state.

The Clocky file is an animated PNG, despite its `.png` extension. Only its image-stream compression changed. All 76 decompressed frame streams, control/timing chunks, alpha information and color metadata are preserved. No frames were dropped and no still image was substituted.

Compared with the two original image requests (3,633,616 bytes), the derivatives total 2,034,615 bytes with the smaller portrait or 2,098,563 bytes with the larger portrait: savings of 1,599,001 bytes (44.0%) or 1,535,053 bytes (42.2%). These are file-byte comparisons, not measured page-load or network timings. The logo remains lazy-loaded.
